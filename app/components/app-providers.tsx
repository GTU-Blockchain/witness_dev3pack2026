import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PropsWithChildren } from 'react'
import { NetworkProvider } from '@/features/network/network-provider'
import { MobileWalletProvider } from '@wallet-ui/react-native-web3js'
import { useNetwork } from '@/features/network/use-network'
import { AppConfig } from '@/constants/app-config'

// MWA dApp identity: `uri` must be the domain verified through Android App Links
// (web-pi-cyan-30.vercel.app/.well-known/assetlinks.json). Phantom refuses to sign if it
// can't verify this uri, so name + uri are sent together.
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
