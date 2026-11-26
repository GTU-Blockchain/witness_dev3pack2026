import React from 'react'
import { Link, Redirect } from 'expo-router'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { WalletScreen } from '@/features/wallet/wallet-screen'

export default function WalletRoute() {
  const { account } = useMobileWallet()

  // Cüzdan bağlanınca doğrudan kayıt ekranına geç.
  if (account) {
    return <Redirect href="/record" />
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0e16' }} edges={['top', 'bottom']}>
      <WalletScreen />
      {/* Ekip içi test sayfası; sadece geliştirme sürümünde görünür */}
      {__DEV__ ? (
        <Link href="/dev" style={styles.devLink}>
          dev
        </Link>
      ) : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  devLink: { alignSelf: 'center', color: '#8a94a6', fontSize: 12, paddingBottom: 8 },
})
