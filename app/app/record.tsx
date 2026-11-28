import { Alert } from 'react-native'
import { Redirect, router } from 'expo-router'
import * as DocumentPicker from 'expo-document-picker'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { RecordScreen } from '@/src/screens/RecordScreen'
import { useRecorder } from '@/features/record/use-recorder'
import { addRecording, addSharedRecording } from '@/features/record/recordings-store'

const shortAddress = (a: string) => `${a.slice(0, 4)}...${a.slice(-4)}`

// The record screen only opens with a connected wallet.
// Flow: record → stop → Seal → the recording is added to the list as "pending" → /seal screen.
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

  // Pick any media file → the same proven pipeline as sharing (copy → /seal).
  // The picker gives no duration (0); that's fine because /seal applies `Math.max(1, …)` on chain.
  async function pickFile() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true })
      if (res.canceled) return
      const asset = res.assets?.[0]
      if (!asset) return
      const item = addSharedRecording(
        asset.uri,
        asset.name ?? `file-${Date.now()}`,
        asset.mimeType ?? 'application/octet-stream',
        0,
      )
      router.push({ pathname: '/seal', params: { id: item.id } })
    } catch {
      Alert.alert('Could not open file', 'The selected file could not be read. Please try another one.')
    }
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
      onPickFile={() => void pickFile()}
      onOpenRecordings={() => router.replace('/recordings')}
    />
  )
}
