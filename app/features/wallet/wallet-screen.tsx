import React, { useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { AppActionButton } from '@/components/app-action-button'
import { appStyles } from '@/constants/app-styles'
import { useAccountGetBalance } from '@/features/account/use-account-get-balance'

const LOW_BALANCE_SOL = 0.05
const FAUCET_URL = 'https://faucet.solana.com'

const shortAddress = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`

// ---- Saf görünüm: sadece props alır, cüzdan bilmez. Mock ile denenebilir. ----
type WalletViewProps = {
  address: string | null
  balanceSol: number | null
  networkLabel: string
  error?: string | null
  onConnect: () => void
}

export function WalletView({ address, balanceSol, networkLabel, error, onConnect }: WalletViewProps) {
  if (!address) {
    return (
      <View style={appStyles.stack}>
        <Text style={appStyles.title}>Witness</Text>
        <AppActionButton title="Cüzdanı bağla" onPress={onConnect} />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    )
  }

  const isLow = balanceSol !== null && balanceSol < LOW_BALANCE_SOL

  return (
    <View style={appStyles.stack}>
      <Text style={appStyles.title}>Cüzdan</Text>
      <View style={appStyles.card}>
        <Text style={styles.address}>{shortAddress(address)}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{networkLabel}</Text>
        </View>
        <Text style={styles.balance}>
          {balanceSol === null ? 'Bakiye yükleniyor…' : `${balanceSol.toFixed(3)} SOL`}
        </Text>
      </View>

      {isLow ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            Bakiye düşük. Mühürlemek için devnet SOL gerekir.
          </Text>
          <AppActionButton title="Faucet'i aç" onPress={() => Linking.openURL(FAUCET_URL)} />
        </View>
      ) : null}
    </View>
  )
}

// ---- Bağlıyken bakiyeyi okuyan parça (hook'u koşullu çağıramayız, o yüzden ayrı) ----
function ConnectedWallet({ address, networkLabel }: { address: PublicKey; networkLabel: string }) {
  const { data: lamports } = useAccountGetBalance({ address })
  const balanceSol = typeof lamports === 'number' ? lamports / LAMPORTS_PER_SOL : null

  return (
    <WalletView
      address={address.toString()}
      balanceSol={balanceSol}
      networkLabel={networkLabel}
      onConnect={() => {}}
    />
  )
}

// ---- Dışarıya açılan ekran ----
export function WalletScreen() {
  const { account, connect, chain } = useMobileWallet()
  const [error, setError] = useState<string | null>(null)

  const networkLabel = String(chain ?? 'devnet').replace('solana:', '')

  if (!account) {
    return (
      <WalletView
        address={null}
        balanceSol={null}
        networkLabel={networkLabel}
        error={error}
        onConnect={async () => {
          try {
            setError(null)
            await connect()
          } catch (e) {
            setError('Bağlanılamadı. Cüzdan uygulaması açık mı?')
          }
        }}
      />
    )
  }

  return <ConnectedWallet address={account.address} networkLabel={networkLabel} />
}

const styles = StyleSheet.create({
  address: { fontSize: 18, fontWeight: '600' },
  balance: { fontSize: 16, marginTop: 8 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#fde68a',
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  warning: { padding: 12, borderRadius: 8, backgroundColor: '#fee2e2', gap: 8 },
  warningText: { color: '#991b1b' },
  errorText: { color: '#991b1b' },
})