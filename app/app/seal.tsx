import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { SealingScreen } from '@/src/screens/SealingScreen'
import { getRecording } from '@/features/record/recordings-store'
import { useSeal } from '@/features/record/use-seal'
import { AppConfig } from '@/constants/app-config'

const shortAddress = (a: string) => `${a.slice(0, 4)}...${a.slice(-4)}`

// Public share page on the web verifier: /v/<hash> shows the on-chain record and checks a dropped file.
const VERIFY_BASE_URL = (process.env.EXPO_PUBLIC_VERIFY_BASE_URL || AppConfig.uri).replace(/\/+$/, '')
const verificationUrlFor = (hash?: string) => (hash ? `${VERIFY_BASE_URL}/v/${hash}` : undefined)

export default function SealRoute() {
  const { account } = useMobileWallet()
  const { id } = useLocalSearchParams<{ id: string }>()

  if (!account) return <Redirect href="/wallet" />
  if (!id || !getRecording(id)) return <Redirect href="/recordings" />

  return <SealFlow id={id} walletLabel={shortAddress(String(account.address))} />
}

// Hooks can't be called conditionally, so the flow lives in its own component.
function SealFlow({ id, walletLabel }: { id: string; walletLabel: string }) {
  const seal = useSeal(id)

  return (
    <SealingScreen
      // Reset the screen on each new attempt: SealingScreen only resets the approve button when the
      // step changes, so after an error it stayed stuck on "Approved" when returning to the same step.
      key={seal.attempt}
      step={seal.step}
      error={seal.error}
      hash={seal.hash}
      durationMillis={seal.durationMillis}
      locationEnabled={seal.locationEnabled}
      slot={seal.slot}
      explorerUrl={seal.explorerUrl}
      verificationUrl={verificationUrlFor(seal.hash)}
      transcript={seal.transcript}
      walletLabel={walletLabel}
      onApprove={seal.approve}
      onRetry={seal.retry}
      onNewRecording={() => router.replace('/record')}
      onOpenRecord={() => router.replace('/record')}
      onOpenRecordings={() => router.replace('/recordings')}
    />
  )
}
