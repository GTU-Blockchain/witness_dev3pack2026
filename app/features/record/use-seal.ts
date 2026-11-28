import { useEffect, useState } from 'react'
import { PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import type { SealStep } from '@/src/screens/SealingScreen'
import { sha256HexOfFile } from '@/utils/witness-hash'
import { buildRegisterRecordingIx } from '@/utils/witness-program'
import { getRecording, updateRecording, useRecordings } from '@/features/record/recordings-store'
import { syncRecordingToBackend } from '@/features/record/backend-sync'
import { MIN_BALANCE_LAMPORTS } from '@/features/wallet/devnet-sol'

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

// Mobile Wallet Adapter protokolünün hata kodları → kullanıcıya gösterilecek mesaj.
// Kod ya hata nesnesinin `code` alanında ya da mesajın başında ("-1/...") gelir.
const WALLET_ERRORS: Record<number, string> = {
  [-1]: "The wallet couldn't confirm this app's access. Please reconnect your wallet and try again.",
  [-2]: "The wallet couldn't read the transaction. Please try again.",
  [-3]: 'The wallet did not sign the transaction. Please try again and approve it in your wallet.',
  [-4]: "The wallet couldn't send the transaction to the network. Please try again.",
  [-5]: 'The wallet rejected the request. Please try again.',
  [-32603]: 'Something went wrong inside the wallet. Please try again.',
}

function walletErrorCode(e: unknown, msg: string): number | undefined {
  const code = (e as { code?: unknown })?.code
  if (typeof code === 'number') return code
  const m = /^(-\d+)\//.exec(msg)
  return m ? Number(m[1]) : undefined
}

function errorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  const code = walletErrorCode(e, msg)
  if (code !== undefined && WALLET_ERRORS[code]) return WALLET_ERRORS[code]
  if (/already in use/i.test(msg)) return 'This recording is already sealed on chain.'
  if (/declin|reject|cancel/i.test(msg)) return 'Approval was declined in the wallet.'
  if (/TimeoutException|timed out/i.test(msg))
    return 'The wallet took too long to respond. Please try again and approve within a minute.'
  if (/block height exceeded|has expired/i.test(msg))
    return "The transaction didn't reach the network in time, so nothing was written. Please try again."
  return msg || 'Something went wrong.'
}

/**
 * Bir kaydın mühürleme akışı (docs/TECHNICAL.md → "Bir kaydın mühürlenme sırası"):
 * dosyanın SHA-256'sı → cüzdan onayı (MWA) → register_recording → onay.
 * Hata olursa kayıt silinmez, "pending" kalır ve tekrar denenebilir.
 */
export function useSeal(id: string) {
  const { account, chain, connection, signAndSendTransactions } = useMobileWallet()
  const initial = getRecording(id)

  const [step, setStep] = useState<SealStep>(
    initial?.status === 'sealed' ? 'sealed' : initial?.hash ? 'awaiting-approval' : 'hashing',
  )
  const [error, setError] = useState<string | undefined>()
  const [hash, setHash] = useState(initial?.hash)
  // Her "Try Again"de artar; ekran bununla sıfırdan çizilir (onay butonunun iç durumu temizlensin).
  const [attempt, setAttempt] = useState(0)

  // Dosyanın SHA-256'sını hesaplar; state'i sadece sonuç gelince değiştirir.
  function computeHash() {
    const rec = getRecording(id)
    if (!rec) return
    sha256HexOfFile(rec.uri).then(
      (h) => {
        setHash(h)
        updateRecording(id, { hash: h })
        setStep('awaiting-approval')
      },
      (e) => setError(`Couldn't read the recording file. ${e instanceof Error ? e.message : String(e)}`),
    )
  }

  // Ekran açılınca hash'i hesapla (daha önce hesaplanmadıysa). Sadece ilk açılışta.
  useEffect(() => {
    if (!initial?.hash && initial?.status !== 'sealed') computeHash()
    // Daha önce mühürlenmiş ama Supabase'e yazılamamış / transkripti gelmemiş kayıt: arka planda tekrar dene.
    if (initial?.status === 'sealed') void syncRecordingToBackend(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function approve() {
    const rec = getRecording(id)
    if (!rec || !hash || !account) return
    setError(undefined)
    try {
      // account.address runtime'da base58 string gelebiliyor (tip PublicKey dese de).
      const payer = account.address instanceof PublicKey ? account.address : new PublicKey(String(account.address))

      // Ücret + kayıt hesabının kirası için devnet SOL gerekir; yoksa cüzdan sessizce zaman aşımına düşüyor.
      const balance = await connection.getBalance(payer)
      if (balance < MIN_BALANCE_LAMPORTS) {
        throw new Error('Not enough devnet SOL in your wallet to pay for the seal. Get some below, then try again.')
      }

      const {
        context: { slot: minContextSlot },
        value: latestBlockhash,
      } = await connection.getLatestBlockhashAndContext()

      const { ix } = await buildRegisterRecordingIx(connection, payer, {
        audioHash: hexToBytes(hash),
        recordedAt: Math.floor(rec.recordedAt / 1000),
        durationMs: Math.max(1, Math.round(rec.durationMillis)),
        locationCommitment: null,
      })
      const message = new TransactionMessage({
        payerKey: payer,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: [ix],
      }).compileToLegacyMessage()

      const signature = await signAndSendTransactions(new VersionedTransaction(message), minContextSlot)
      setStep('writing')

      const result = await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed')
      if (result.value.err) throw new Error('The transaction failed on chain.')

      const cluster = String(chain ?? 'solana:devnet').replace('solana:', '')
      updateRecording(id, {
        status: 'sealed',
        signature,
        wallet: payer.toBase58(),
        slot: result.context.slot,
        explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`,
      })
      setStep('sealed')
      // Supabase'e kayıt + transkript: arka planda, mühürlemeyi bekletmez.
      void syncRecordingToBackend(id)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  function retry() {
    setAttempt((n) => n + 1)
    if (!hash) {
      setStep('hashing')
      setError(undefined)
      computeHash()
    } else {
      setError(undefined)
      setStep('awaiting-approval')
    }
  }

  // Store'a abone ol: transkript arka planda gelince ekran güncellensin.
  const rec = useRecordings().find((r) => r.id === id)
  return {
    step,
    error,
    hash,
    durationMillis: rec?.durationMillis ?? 0,
    locationEnabled: rec?.locationEnabled ?? false,
    slot: rec?.slot,
    explorerUrl: rec?.explorerUrl,
    transcript: rec?.transcript,
    attempt,
    approve: () => void approve(),
    retry,
  }
}
