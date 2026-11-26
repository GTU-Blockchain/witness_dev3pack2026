import { Redirect } from 'expo-router'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { RecordScreen } from '@/src/screens/RecordScreen'
import { useRecorder } from '@/features/record/use-recorder'

const shortAddress = (a: string) => `${a.slice(0, 4)}...${a.slice(-4)}`

// Kayıt ekranı sadece cüzdan bağlıyken açılır. Kaydet / durdur / dinle / sil
// useRecorder'dan gelir; mühürleme (onSeal) henüz bağlı değil.
export default function RecordRoute() {
  const { account } = useMobileWallet()
  const rec = useRecorder()

  if (!account) {
    return <Redirect href="/wallet" />
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
    />
  )
}
