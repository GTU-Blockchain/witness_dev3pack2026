import { Redirect } from 'expo-router'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'

// Açılış kapısı: cüzdan bağlı değilse cüzdan ekranı, bağlıysa doğrudan kayıt ekranı.
// Eski test sayfası (register / imza / paylaş butonları) /dev adresinde.
export default function IndexRoute() {
  const { account } = useMobileWallet()
  return <Redirect href={account ? '/record' : '/wallet'} />
}
