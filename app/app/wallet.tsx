import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WalletScreen } from '@/features/wallet/wallet-screen'

export default function WalletRoute() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0e16' }} edges={['top', 'bottom']}>
      <WalletScreen />
    </SafeAreaView>
  )
}
