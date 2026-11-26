import { PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { AppActionButton } from '@/components/app-action-button'
import { buildRegisterRecordingIx, fetchRecording } from '@/utils/witness-program'
import { ellipsify } from '@/utils/ellipsify'

// Demo: gerçek akışta audio_hash dosyanın SHA-256'sı olacak (utils/witness-hash.ts,
// expo-crypto — dev build rebuild'i ister). Burada her denemede yeni bir PDA açmak
// için 32 rastgele bayt kullanılıyor; amaç register_recording'in zincirde çalıştığını
// göstermek (PDA açılır + anchored_at zincir saatinden).
function demoHash(): Uint8Array {
  const bytes = new Uint8Array(32)
  for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  return bytes
}

export function AccountFeatureRegisterRecording({ address }: { address: PublicKey }) {
  const { connection, signAndSendTransactions } = useMobileWallet()

  return (
    <AppActionButton
      onPress={async () => {
        // account.address runtime'da base58 string gelebiliyor (tip PublicKey dese de);
        // web3 payerKey gerçek PublicKey ister.
        const payer = address instanceof PublicKey ? address : new PublicKey(address as unknown as string)

        const {
          context: { slot: minContextSlot },
          value: latestBlockhash,
        } = await connection.getLatestBlockhashAndContext()

        const audioHash = demoHash()
        const { ix, pda } = await buildRegisterRecordingIx(connection, payer, {
          audioHash,
          recordedAt: Math.floor(Date.now() / 1000),
          durationMs: 12_345,
          locationCommitment: null,
        })

        const message = new TransactionMessage({
          payerKey: payer,
          recentBlockhash: latestBlockhash.blockhash,
          instructions: [ix],
        }).compileToLegacyMessage()

        const signature = await signAndSendTransactions(new VersionedTransaction(message), minContextSlot)
        await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed')

        // PDA'yı okumak best-effort: imza başarılıysa akış başarılıdır, okuma
        // hatası başarıyı bozmaz.
        let anchoredAt: string | undefined
        try {
          const rec = await fetchRecording(connection, pda)
          anchoredAt = rec?.anchoredAt.toString()
        } catch {}

        return {
          description: `PDA ${ellipsify(pda.toString(), 6)} açıldı${anchoredAt ? ` · anchored_at ${anchoredAt}` : ''} · sig ${signature}`,
          status: 'success',
          title: 'Register recording',
        } as const
      }}
      title="Register recording"
    />
  )
}
