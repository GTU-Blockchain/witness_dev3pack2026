import React, { type ReactNode, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { AppHeader } from '@/components/app-header'
import { C, MONO } from '@/constants/theme'
import { DevnetSolCard, useDevnetSol } from '@/features/wallet/devnet-sol'

const shortAddress = (a: string) => `${a.slice(0, 4)}...${a.slice(-4)}`

// ---- Pure view: takes props only, knows nothing about the wallet. Can be tried with mock props. ----
type WalletViewProps = {
  address: string | null
  balanceSol: number | null
  balanceError?: boolean
  networkLabel: string
  error?: string | null
  connecting?: boolean
  onConnect: () => void
  /** Connected only: e.g. the "Get devnet SOL" card. */
  funding?: ReactNode
  /** Connected only: true when the wallet can't pay for a seal yet. */
  needsSol?: boolean
  onContinue?: () => void
}

export function WalletView({
  address,
  balanceSol,
  balanceError,
  networkLabel,
  error,
  connecting,
  onConnect,
  funding,
  needsSol,
  onContinue,
}: WalletViewProps) {
  return (
    <View style={styles.screen}>
      <AppHeader walletLabel={address ? shortAddress(address) : undefined} />

      {!address ? (
        <View style={styles.body}>
          <View style={styles.center}>
            <Text style={styles.label}>WALLET NOT CONNECTED</Text>
            <Text style={styles.network}>Solana {networkLabel}</Text>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <PrimaryButton title="Connect Wallet" loading={connecting} onPress={onConnect} />
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.label}>WALLET</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{networkLabel.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardValue}>{shortAddress(address)}</Text>
              <Text style={styles.cardMono}>Solana {networkLabel}</Text>
            </View>
          </View>

          <View style={styles.center}>
            <Text style={styles.label}>BALANCE</Text>
            {balanceError ? (
              <Text style={styles.errorText}>{"Couldn't load balance"}</Text>
            ) : balanceSol === null ? (
              <Text style={styles.balanceLoading}>Loading balance…</Text>
            ) : (
              <Text style={styles.balance}>{balanceSol.toFixed(3)} SOL</Text>
            )}
          </View>

          {funding}

          {onContinue ? (
            needsSol ? (
              <SecondaryButton title="Continue without SOL" onPress={onContinue} />
            ) : (
              <PrimaryButton title="Continue" onPress={onContinue} />
            )
          ) : null}
        </View>
      )}
    </View>
  )
}

function PrimaryButton({ title, loading, onPress }: { title: string; loading?: boolean; onPress: () => void }) {
  return (
    <Pressable
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, (pressed || loading) && styles.pressed]}
    >
      {loading ? <ActivityIndicator color={C.onEmerald} /> : <Text style={styles.primaryButtonText}>{title}</Text>}
    </Pressable>
  )
}

function SecondaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
      <Text style={styles.secondaryButtonText}>{title}</Text>
    </Pressable>
  )
}

// ---- The part that reads the balance while connected (a hook can't be called conditionally, hence separate) ----
// A fresh (e.g. a judge's) wallet has 0 SOL and can't pay for a seal: keep it here with a
// "Get devnet SOL" button. A funded wallet goes straight on to recording, as before.
function ConnectedWallet({ address, networkLabel }: { address: PublicKey; networkLabel: string }) {
  // account.address can be a base58 string at runtime (even though the type says PublicKey);
  // getBalance expects a PublicKey, so normalize it (see account-feature-seal-shared.tsx).
  const publicKey = address instanceof PublicKey ? address : new PublicKey(address as unknown as string)
  const devnet = useDevnetSol(publicKey)
  const balanceSol = devnet.lamports !== null ? devnet.lamports / LAMPORTS_PER_SOL : null

  // Decide once, on the first balance read, so the screen doesn't jump away right after an airdrop.
  const [route, setRoute] = useState<'pending' | 'stay' | 'record'>('pending')
  if (route === 'pending') {
    if (!devnet.isDevnet) setRoute('record')
    else if (devnet.lamports !== null) setRoute(devnet.isLow ? 'stay' : 'record')
    else if (devnet.balanceError) setRoute('stay')
  }
  if (route === 'record') return <Redirect href="/record" />

  return (
    <WalletView
      address={publicKey.toString()}
      balanceSol={balanceSol}
      balanceError={devnet.balanceError}
      networkLabel={networkLabel}
      onConnect={() => {}}
      funding={<DevnetSolCard devnet={devnet} />}
      needsSol={devnet.isLow || devnet.lamports === null}
      onContinue={() => router.replace('/record')}
    />
  )
}

// ---- The exported screen ----
export function WalletScreen() {
  const { account, connect, chain } = useMobileWallet()
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  const network = String(chain ?? 'solana:devnet').replace('solana:', '')
  const networkLabel = network.charAt(0).toUpperCase() + network.slice(1)

  if (!account) {
    return (
      <WalletView
        address={null}
        balanceSol={null}
        networkLabel={networkLabel}
        error={error}
        connecting={connecting}
        onConnect={async () => {
          try {
            setError(null)
            setConnecting(true)
            await connect()
          } catch {
            setError("Couldn't connect. Make sure a Solana wallet app is installed, then approve within a minute.")
          } finally {
            setConnecting(false)
          }
        }}
      />
    )
  }

  return <ConnectedWallet address={account.address} networkLabel={networkLabel} />
}

// Styles use the same sizes as RecordScreen (shared theme: constants/theme.ts)
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, gap: 16 },
  body: { flex: 1, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  card: { backgroundColor: C.surface, borderRadius: 20, padding: 18, gap: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: C.muted, fontSize: 12, fontFamily: MONO, letterSpacing: 1.4 },
  cardValue: { color: C.text, fontSize: 15, fontWeight: '500' },
  cardMono: { color: C.textSoft, fontFamily: MONO, fontSize: 13 },
  badge: { backgroundColor: C.emeraldSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  badgeText: { color: C.emerald, fontSize: 12, fontFamily: MONO, letterSpacing: 1 },
  network: { color: C.textSoft, fontFamily: MONO, fontSize: 13 },
  balance: { color: C.text, fontFamily: MONO, fontSize: 40, fontWeight: '500' },
  balanceLoading: { color: C.muted, fontFamily: MONO, fontSize: 14 },
  errorText: { color: C.red, fontSize: 13, textAlign: 'center' },
  primaryButton: {
    height: 60,
    borderRadius: 30,
    backgroundColor: C.sealGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: C.onEmerald, fontSize: 17, fontWeight: '600' },
  secondaryButton: {
    height: 60,
    borderRadius: 30,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: C.textSoft, fontSize: 17, fontWeight: '600' },
  pressed: { opacity: 0.85 },
})
