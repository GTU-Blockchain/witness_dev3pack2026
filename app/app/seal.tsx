import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { SealingScreen } from '@/src/screens/SealingScreen'
import { getRecording } from '@/features/record/recordings-store'
import { useSeal } from '@/features/record/use-seal'

const shortAddress = (a: string) => `${a.slice(0, 4)}...${a.slice(-4)}`

export default function SealRoute() {
  const { account } = useMobileWallet()
  const { id } = useLocalSearchParams<{ id: string }>()

  if (!account) return <Redirect href="/wallet" />
  if (!id || !getRecording(id)) return <Redirect href="/recordings" />

  return <SealFlow id={id} walletLabel={shortAddress(String(account.address))} />
}

// Hook'lar koşullu çağrılamadığı için akış ayrı bileşende.
function SealFlow({ id, walletLabel }: { id: string; walletLabel: string }) {
  const seal = useSeal(id)

  return (
    <SealingScreen
      // Yeni denemede ekranı sıfırla: SealingScreen onay butonunun durumunu sadece adım
      // değişince sıfırlıyor; hata sonrası aynı adıma dönüldüğünde "Approved"da takılıyordu.
      key={seal.attempt}
      step={seal.step}
      error={seal.error}
      hash={seal.hash}
      durationMillis={seal.durationMillis}
      locationEnabled={seal.locationEnabled}
      slot={seal.slot}
      explorerUrl={seal.explorerUrl}
      walletLabel={walletLabel}
      onApprove={seal.approve}
      onRetry={seal.retry}
      onNewRecording={() => router.replace('/record')}
      onOpenRecord={() => router.replace('/record')}
      onOpenRecordings={() => router.replace('/recordings')}
    />
  )
}
