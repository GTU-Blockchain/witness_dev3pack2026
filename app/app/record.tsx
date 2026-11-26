import { Redirect } from 'expo-router'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { RecordScreen } from '@/src/screens/RecordScreen'

const shortAddress = (a: string) => `${a.slice(0, 4)}...${a.slice(-4)}`

// Kayıt ekranı sadece cüzdan bağlıyken açılır. Kayıt / oynatma / mühürleme
// mantığı henüz bağlı değil (Kişi A'nın ses modülü props ile bağlanacak).
export default function RecordRoute() {
  const { account } = useMobileWallet()
  if (!account) {
    return <Redirect href="/wallet" />
  }
  return <RecordScreen walletLabel={shortAddress(String(account.address))} />
}
