import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PropsWithChildren } from 'react'
import { NetworkProvider } from '@/features/network/network-provider'
import { MobileWalletProvider } from '@wallet-ui/react-native-web3js'
import { useNetwork } from '@/features/network/use-network'
import { AppConfig } from '@/constants/app-config'

// MWA dApp identity: `uri`, Android App Links ile doğrulanan domain olmalı
// (web-pi-cyan-30.vercel.app/.well-known/assetlinks.json). Phantom bu uri'yi
// doğrulayamazsa imzayı reddeder, bu yüzden name + uri birlikte gönderiliyor.
const identity = { name: AppConfig.name, uri: AppConfig.uri }
const queryClient = new QueryClient()
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkProvider>
        <SolanaNetworkProvider>{children}</SolanaNetworkProvider>
      </NetworkProvider>
    </QueryClientProvider>
  )
}

// We have this SolanaNetworkProvider because of the network switching logic.
// If you only connect to a single network, use MobileWalletProvider directly.
function SolanaNetworkProvider({ children }: PropsWithChildren) {
  const { selectedNetwork } = useNetwork()
  return (
    <MobileWalletProvider chain={selectedNetwork.id} endpoint={selectedNetwork.url} identity={identity}>
      {children}
    </MobileWalletProvider>
  )
}
