import React, { useState } from 'react'
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { AppHeader } from '@/components/app-header'
import { C, MONO } from '@/constants/theme'
import { useAccountGetBalance } from '@/features/account/use-account-get-balance'

const LOW_BALANCE_SOL = 0.05
const FAUCET_URL = 'https://faucet.solana.com'

const shortAddress = (a: string) => `${a.slice(0, 4)}...${a.slice(-4)}`

// ---- Saf görünüm: sadece props alır, cüzdan bilmez. Mock ile denenebilir. ----
type WalletViewProps = {
  address: string | null
  balanceSol: number | null
  balanceError?: boolean
  networkLabel: string
  error?: string | null
  connecting?: boolean
  onConnect: () => void
}

export function WalletView({
  address,
  balanceSol,
  balanceError,
  networkLabel,
  error,
  connecting,
  onConnect,
}: WalletViewProps) {
  const isLow = balanceSol !== null && balanceSol < LOW_BALANCE_SOL

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

          {isLow ? (
            <View style={styles.warning}>
              <Text style={styles.warningTitle}>LOW BALANCE</Text>
              <Text style={styles.warningText}>You need devnet SOL to seal recordings.</Text>
              <SecondaryButton title="Open Faucet" onPress={() => Linking.openURL(FAUCET_URL)} />
            </View>
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
      {loading ? (
        <ActivityIndicator color={C.onEmerald} />
      ) : (
        <Text style={styles.primaryButtonText}>{title}</Text>
      )}
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

// ---- Bağlıyken bakiyeyi okuyan parça (hook'u koşullu çağıramayız, o yüzden ayrı) ----
function ConnectedWallet({ address, networkLabel }: { address: PublicKey; networkLabel: string }) {
  // account.address runtime'da base58 string gelebiliyor (tip PublicKey dese de);
  // getBalance PublicKey beklediği için normalize et (bkz. account-feature-seal-shared.tsx).
  const publicKey = address instanceof PublicKey ? address : new PublicKey(address as unknown as string)
  const { data: lamports, isError } = useAccountGetBalance({ address: publicKey })
  const balanceSol = typeof lamports === 'number' ? lamports / LAMPORTS_PER_SOL : null

  return (
    <WalletView
      address={publicKey.toString()}
      balanceSol={balanceSol}
      balanceError={isError}
      networkLabel={networkLabel}
      onConnect={() => {}}
    />
  )
}

// ---- Dışarıya açılan ekran ----
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
            setError("Couldn't connect. Is a wallet app installed?")
          } finally {
            setConnecting(false)
          }
        }}
      />
    )
  }

  return <ConnectedWallet address={account.address} networkLabel={networkLabel} />
}

// Stiller RecordScreen ile aynı ölçüler (ortak tema: constants/theme.ts)
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
  warning: { backgroundColor: C.redSoft, borderColor: C.red, borderWidth: 1, borderRadius: 20, padding: 18, gap: 10 },
  warningTitle: { color: C.red, fontSize: 12, fontFamily: MONO, letterSpacing: 1.4 },
  warningText: { color: C.text, fontSize: 14 },
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
