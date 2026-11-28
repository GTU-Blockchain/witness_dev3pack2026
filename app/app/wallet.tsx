import React from 'react'
import { Link } from 'expo-router'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { C } from '@/constants/theme'
import { WalletScreen } from '@/features/wallet/wallet-screen'

export default function WalletRoute() {
  // Once connected, WalletScreen moves on to /record by itself, unless the wallet has
  // no devnet SOL yet; then it stays here and offers the airdrop.
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <WalletScreen />
      {/* Internal team test page; only visible in development builds */}
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
