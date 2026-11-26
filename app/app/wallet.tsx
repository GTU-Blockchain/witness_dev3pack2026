import React from 'react'
import { Link, Redirect } from 'expo-router'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { C } from '@/constants/theme'
import { WalletScreen } from '@/features/wallet/wallet-screen'

export default function WalletRoute() {
  const { account } = useMobileWallet()

  // Cüzdan bağlanınca doğrudan kayıt ekranına geç.
  if (account) {
    return <Redirect href="/record" />
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
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
  devLink: { alignSelf: 'center', color: C.muted, fontSize: 12, paddingBottom: 8 },
})
