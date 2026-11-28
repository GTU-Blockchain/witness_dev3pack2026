import Clipboard from '@react-native-clipboard/clipboard'
import { useEffect, useState } from 'react'
import { ActivityIndicator, AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { C, MONO } from '@/constants/theme'
import { useAccountGetBalance } from '@/features/account/use-account-get-balance'

// Below this a seal can't go through: rent for the record account (0.00129 SOL)
// + the network fee (Phantom adds a priority fee, ~0.00008 SOL), with headroom.
export const MIN_BALANCE_LAMPORTS = 0.003 * LAMPORTS_PER_SOL

export const FAUCET_URL = 'https://faucet.solana.com'
const AIRDROP_LAMPORTS = 1 * LAMPORTS_PER_SOL
// RN fetch has no timeout; never let the button spin forever.
const AIRDROP_REQUEST_TIMEOUT_MS = 30_000

type AirdropState =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | { kind: 'confirming' }
  | { kind: 'done' }
  | { kind: 'failed'; message: string }

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timed out')), ms)
    p.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      },
    )
  })
}

function airdropErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (/429|too many|rate.?limit|limit/i.test(msg))
    return 'The devnet faucet is rate-limited right now, so no SOL was sent.'
  if (/timed out|expired|block height/i.test(msg))
    return "The airdrop didn't confirm in time. It may still arrive, so check your balance again in a minute."
  return "The devnet faucet didn't send SOL this time."
}

/**
 * Balance + one-tap devnet airdrop for the connected wallet.
 * A judge's fresh wallet has 0 SOL, and without SOL the seal can't be paid for.
 * Shares the react-query balance cache with useAccountGetBalance, so every screen updates together.
 */
export function useDevnetSol(address: PublicKey) {
  const { chain, connection } = useMobileWallet()
  // Airdrops only exist on test clusters; never offer one anywhere near mainnet.
  const isDevnet = String(chain) === 'solana:devnet' && !/mainnet/i.test(connection.rpcEndpoint)

  const balance = useAccountGetBalance({ address })
  const { refetch } = balance
  const lamports = typeof balance.data === 'number' ? balance.data : null
  const isLow = lamports !== null && lamports < MIN_BALANCE_LAMPORTS
  const [airdrop, setAirdrop] = useState<AirdropState>({ kind: 'idle' })

  // Coming back from the web faucet (or anywhere else): re-read the balance.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refetch()
    })
    return () => sub.remove()
  }, [refetch])

  async function requestAirdrop() {
    if (!isDevnet) return
    setAirdrop({ kind: 'requesting' })
    try {
      const signature = await withTimeout(
        connection.requestAirdrop(address, AIRDROP_LAMPORTS),
        AIRDROP_REQUEST_TIMEOUT_MS,
      )
      setAirdrop({ kind: 'confirming' })
      const latest = await connection.getLatestBlockhash()
      const res = await connection.confirmTransaction({ signature, ...latest }, 'confirmed')
      if (res.value.err) throw new Error('The airdrop transaction failed.')
      await refetch()
      setAirdrop({ kind: 'done' })
    } catch (e) {
      setAirdrop({ kind: 'failed', message: airdropErrorMessage(e) })
      void refetch()
    }
  }

  return {
    address,
    isDevnet,
    lamports,
    balanceError: balance.isError && lamports === null,
    isLow,
    isRefreshing: balance.isFetching,
    airdrop,
    refresh: () => void refetch(),
    requestAirdrop: () => void requestAirdrop(),
  }
}

export type DevnetSol = ReturnType<typeof useDevnetSol>

const sol = (lamports: number) => (lamports / LAMPORTS_PER_SOL).toFixed(3)

/** "Get devnet SOL" card with the web-faucet fallback. Renders nothing off devnet. */
export function DevnetSolCard({ devnet }: { devnet: DevnetSol }) {
  const [copied, setCopied] = useState(false)
  if (!devnet.isDevnet) return null

  const { airdrop, lamports, isLow } = devnet
  const busy = airdrop.kind === 'requesting' || airdrop.kind === 'confirming'
  const address = devnet.address.toBase58()

  return (
    <View style={[styles.card, isLow && styles.cardLow]}>
      <Text style={[styles.eyebrow, isLow && styles.eyebrowLow]}>{isLow ? 'YOU NEED DEVNET SOL' : 'DEVNET SOL'}</Text>

      {airdrop.kind === 'done' && !isLow ? (
        <Text style={styles.ok}>✓ 1 devnet SOL received. You can seal now.</Text>
      ) : (
        <Text style={styles.text}>
          Sealing pays a small deposit on Solana devnet (about 0.0014 SOL of free test tokens).
          {lamports !== null ? ` This wallet has ${sol(lamports)} SOL.` : ''}
        </Text>
      )}

      {airdrop.kind !== 'done' || isLow ? (
        <Button
          primary
          label={
            airdrop.kind === 'requesting'
              ? 'Requesting airdrop…'
              : airdrop.kind === 'confirming'
                ? 'Confirming…'
                : 'Get devnet SOL'
          }
          loading={busy}
          onPress={devnet.requestAirdrop}
        />
      ) : null}

      {airdrop.kind === 'failed' ? (
        <View style={styles.fallback}>
          <Text style={styles.error}>{airdrop.message}</Text>
          <Text style={styles.text}>
            Use the web faucet instead: copy your address, paste it at faucet.solana.com (Devnet), then come back here.
          </Text>
          <Text style={styles.address} selectable>
            {address}
          </Text>
          <View style={styles.row}>
            <Button
              grow
              label={copied ? 'Copied' : 'Copy address'}
              onPress={() => {
                Clipboard.setString(address)
                setCopied(true)
              }}
            />
            <Button grow label="Open faucet" onPress={() => void Linking.openURL(FAUCET_URL)} />
          </View>
          <Pressable onPress={devnet.refresh} hitSlop={8}>
            <Text style={styles.link}>{devnet.isRefreshing ? 'Checking balance…' : 'Check balance again'}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}

function Button({
  label,
  onPress,
  primary,
  loading,
  grow,
}: {
  label: string
  onPress: () => void
  primary?: boolean
  loading?: boolean
  grow?: boolean
}) {
  return (
    <Pressable
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        grow && styles.rowItem,
        primary ? styles.buttonPrimary : styles.buttonSecondary,
        (pressed || loading) && styles.pressed,
      ]}
    >
      {loading ? <ActivityIndicator color={primary ? C.onEmerald : C.textSoft} /> : null}
      <Text style={[styles.buttonText, primary ? styles.buttonTextPrimary : styles.buttonTextSecondary]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: 20, padding: 14, gap: 10 },
  cardLow: { borderWidth: 1, borderColor: 'rgba(245, 181, 68, 0.45)' },
  eyebrow: { color: C.muted, fontSize: 12, fontFamily: MONO, letterSpacing: 1.4 },
  eyebrowLow: { color: C.amber },
  text: { color: C.textSoft, fontSize: 13, lineHeight: 19 },
  ok: { color: C.emerald, fontSize: 14, fontWeight: '600' },
  error: { color: C.red, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  fallback: { gap: 8 },
  address: {
    color: C.text,
    fontFamily: MONO,
    fontSize: 12,
    backgroundColor: C.bg,
    borderRadius: 10,
    padding: 10,
  },
  row: { flexDirection: 'row', gap: 10 },
  // Equal halves in a row; not on the base style, where flex: 1 collapses a column child's height to 0.
  rowItem: { flex: 1 },
  link: { color: C.emerald, fontSize: 13, textAlign: 'center', paddingVertical: 2 },
  button: {
    height: 46,
    borderRadius: 23,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: { backgroundColor: C.sealGreen },
  buttonSecondary: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  buttonText: { fontSize: 15, fontWeight: '600' },
  buttonTextPrimary: { color: C.onEmerald },
  buttonTextSecondary: { color: C.textSoft },
  pressed: { opacity: 0.85 },
})
