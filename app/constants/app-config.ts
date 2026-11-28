import { clusterApiUrl } from '@solana/web3.js'
import { SolanaCluster } from '@wallet-ui/react-native-web3js'

export class AppConfig {
  static name = 'Witness'
  // MWA dApp identity check: /.well-known/assetlinks.json at this origin's root lists
  // com.anonymous.app + the debug signing fingerprint (web/app/.well-known/assetlinks.json/route.ts).
  static uri = 'https://web-pi-cyan-30.vercel.app'
  static networks: SolanaCluster[] = [
    {
      id: 'solana:devnet',
      label: 'Devnet',
      url: clusterApiUrl('devnet'),
    },
    {
      id: 'solana:testnet',
      label: 'Testnet',
      url: clusterApiUrl('testnet'),
    },
  ]
}
