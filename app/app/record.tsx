import { Redirect, router } from 'expo-router'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { RecordScreen } from '@/src/screens/RecordScreen'
import { useRecorder } from '@/features/record/use-recorder'
import { addRecording } from '@/features/record/recordings-store'

const shortAddress = (a: string) => `${a.slice(0, 4)}...${a.slice(-4)}`

// Kayıt ekranı sadece cüzdan bağlıyken açılır.
// Akış: kaydet → durdur → Seal → kayıt listeye "pending" eklenir → /seal ekranı.
export default function RecordRoute() {
  const { account } = useMobileWallet()
  const rec = useRecorder()

  if (!account) {
    return <Redirect href="/wallet" />
  }

  function seal({ locationEnabled }: { locationEnabled: boolean }) {
    const captured = rec.handOff()
    if (!captured) return
    const item = addRecording(captured.uri, captured.durationMillis, locationEnabled)
    router.push({ pathname: '/seal', params: { id: item.id } })
  }

  return (
    <RecordScreen
      walletLabel={shortAddress(String(account.address))}
      status={rec.status}
      busy={rec.busy}
      durationMillis={rec.durationMillis}
      level={rec.level}
      isPlaying={rec.isPlaying}
      playbackMillis={rec.playbackMillis}
      onStartRecording={() => void rec.start()}
      onStopRecording={() => void rec.stop()}
      onTogglePlayback={rec.togglePlayback}
      onDelete={rec.discard}
      onSeal={seal}
      onOpenRecordings={() => router.replace('/recordings')}
    />
  )
}
