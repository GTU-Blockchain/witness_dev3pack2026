import { Redirect, router } from 'expo-router'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { RecordingsScreen } from '@/src/screens/RecordingsScreen'
import { useRecordings } from '@/features/record/recordings-store'

const shortAddress = (a: string) => `${a.slice(0, 4)}...${a.slice(-4)}`

export default function RecordingsRoute() {
  const { account } = useMobileWallet()
  const recordings = useRecordings()

  if (!account) return <Redirect href="/wallet" />

  return (
    <RecordingsScreen
      recordings={recordings}
      walletLabel={shortAddress(String(account.address))}
      // Try sealing a pending recording again.
      onSeal={(id) => router.push({ pathname: '/seal', params: { id } })}
      onOpenRecord={() => router.replace('/record')}
    />
  )
}
