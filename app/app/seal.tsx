import { useEffect } from 'react'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { PublicKey } from '@solana/web3.js'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { SealingScreen } from '@/src/screens/SealingScreen'
import { getRecording } from '@/features/record/recordings-store'
import { useSeal } from '@/features/record/use-seal'
import { AppConfig } from '@/constants/app-config'
import { DevnetSolCard, useDevnetSol } from '@/features/wallet/devnet-sol'

const shortAddress = (a: string) => `${a.slice(0, 4)}...${a.slice(-4)}`

// Public share page on the web verifier: /v/<hash> shows the on-chain record and checks a dropped file.
const VERIFY_BASE_URL = (process.env.EXPO_PUBLIC_VERIFY_BASE_URL || AppConfig.uri).replace(/\/+$/, '')
const verificationUrlFor = (hash?: string) => (hash ? `${VERIFY_BASE_URL}/v/${hash}` : undefined)

export default function SealRoute() {
  const { account } = useMobileWallet()
  const { id } = useLocalSearchParams<{ id: string }>()

  if (!account) return <Redirect href="/wallet" />
  if (!id || !getRecording(id)) return <Redirect href="/recordings" />

  // account.address can arrive as a base58 string at runtime even though it's typed as PublicKey.
  const payer = account.address instanceof PublicKey ? account.address : new PublicKey(String(account.address))
  return <SealFlow id={id} payer={payer} walletLabel={shortAddress(payer.toBase58())} />
}

// Hooks can't be called conditionally, so the flow lives in its own component.
function SealFlow({ id, payer, walletLabel }: { id: string; payer: PublicKey; walletLabel: string }) {
  const seal = useSeal(id)
  const devnet = useDevnetSol(payer)
  const { refresh } = devnet

  // A failed attempt may be the balance check: re-read it so the "Get devnet SOL" card can appear.
  useEffect(() => {
    if (seal.error) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seal.error])

  const needsSol = devnet.isDevnet && devnet.isLow && seal.step !== 'sealed'

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
      funding={needsSol ? <DevnetSolCard devnet={devnet} /> : undefined}
      onApprove={seal.approve}
      onRetry={seal.retry}
      onNewRecording={() => router.replace('/record')}
      onOpenRecord={() => router.replace('/record')}
      onOpenRecordings={() => router.replace('/recordings')}
    />
  )
}
