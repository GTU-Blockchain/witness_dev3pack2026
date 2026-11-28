import { Redirect } from 'expo-router'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'

// Entry gate: the wallet screen if no wallet is connected, otherwise straight to the record screen.
// The old test page (register / sign / share buttons) lives at /dev.
export default function IndexRoute() {
  const { account } = useMobileWallet()
  return <Redirect href={account ? '/record' : '/wallet'} />
}
