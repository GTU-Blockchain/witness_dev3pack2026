import React, { useState } from 'react'
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { useAccountGetBalance } from '@/features/account/use-account-get-balance'

const LOW_BALANCE_SOL = 0.05
const FAUCET_URL = 'https://faucet.solana.com'

// Template (Witness Seeker prototipi) renkleri
const colors = {
  bg: '#0a0e16',
  card: '#121a27',
  border: '#1e2838',
  pill: '#1a2230',
  text: '#f1f5f9',
  muted: '#8a94a6',
  green: '#10b981',
  greenSoft: 'rgba(16, 185, 129, 0.15)',
  red: '#ef4444',
  redSoft: 'rgba(239, 68, 68, 0.12)',
  secondary: '#1f2937',
}
const mono = Platform.select({ ios: 'Menlo', default: 'monospace' })

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
      <View style={styles.header}>
        <Text style={styles.appName}>Witness</Text>
        {address ? (
          <View style={styles.addressPill}>
            <View style={styles.dot} />
            <Text style={styles.addressPillText}>{shortAddress(address)}</Text>
          </View>
        ) : null}
      </View>

      {!address ? (
        <View style={styles.body}>
          <View style={styles.center}>
            <Text style={styles.label}>CÜZDAN BAĞLI DEĞİL</Text>
            <Text style={styles.network}>Solana {networkLabel}</Text>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <PrimaryButton title="Cüzdanı bağla" loading={connecting} onPress={onConnect} />
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.label}>CÜZDAN</Text>
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
            <Text style={styles.label}>BAKİYE</Text>
            {balanceError ? (
              <Text style={styles.errorText}>Bakiye okunamadı</Text>
            ) : balanceSol === null ? (
              <Text style={styles.balanceLoading}>Bakiye yükleniyor…</Text>
            ) : (
              <Text style={styles.balance}>{balanceSol.toFixed(3)} SOL</Text>
            )}
          </View>

          {isLow ? (
            <View style={styles.warning}>
              <Text style={styles.warningTitle}>BAKİYE DÜŞÜK</Text>
              <Text style={styles.warningText}>Mühürlemek için devnet SOL gerekir.</Text>
              <SecondaryButton title="Faucet'i aç" onPress={() => Linking.openURL(FAUCET_URL)} />
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
        <ActivityIndicator color={colors.bg} />
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
  const { data: lamports, isError } = useAccountGetBalance({ address })
  const balanceSol = typeof lamports === 'number' ? lamports / LAMPORTS_PER_SOL : null

  return (
    <WalletView
      address={address.toString()}
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
            setError('Bağlanılamadı. Cüzdan uygulaması açık mı?')
          } finally {
            setConnecting(false)
          }
        }}
      />
    )
  }

  return <ConnectedWallet address={account.address} networkLabel={networkLabel} />
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  appName: { color: colors.text, fontSize: 20, fontWeight: '600' },
  addressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.pill,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green },
  addressPillText: { color: colors.text, fontFamily: mono, fontSize: 13 },
  body: { flex: 1, paddingTop: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.muted, fontFamily: mono, fontSize: 12, letterSpacing: 1.5 },
  cardValue: { color: colors.text, fontSize: 14, fontWeight: '500' },
  cardMono: { color: colors.text, fontFamily: mono, fontSize: 13 },
  badge: { backgroundColor: colors.greenSoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: colors.green, fontFamily: mono, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  network: { color: colors.text, fontFamily: mono, fontSize: 13 },
  balance: { color: colors.text, fontFamily: mono, fontSize: 40, fontWeight: '500' },
  balanceLoading: { color: colors.muted, fontFamily: mono, fontSize: 14 },
  warning: {
    backgroundColor: colors.redSoft,
    borderColor: colors.red,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  warningTitle: { color: colors.red, fontFamily: mono, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  warningText: { color: colors.text, fontSize: 13 },
  errorText: { color: colors.red, fontSize: 13, textAlign: 'center' },
  primaryButton: {
    backgroundColor: colors.green,
    borderRadius: 999,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: colors.bg, fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    backgroundColor: colors.secondary,
    borderRadius: 999,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.8 },
})
