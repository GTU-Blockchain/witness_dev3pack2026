import { PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { AppActionButton } from '@/components/app-action-button'
import { buildRegisterRecordingIx, fetchRecording } from '@/utils/witness-program'
import { ellipsify } from '@/utils/ellipsify'

// Dev-only test (the /dev page, __DEV__ builds): in the real flow audio_hash is the file's SHA-256
// (utils/witness-hash.ts). Here 32 random bytes are used so every try opens a new PDA; the point is
// to show that register_recording works on chain (PDA created + anchored_at from chain time).
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
        // account.address can be a base58 string at runtime (even though the type says PublicKey);
        // web3's payerKey needs a real PublicKey.
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

        // Reading the PDA is best-effort: if the signature went through the flow succeeded, and a
        // read error doesn't undo that.
        let anchoredAt: string | undefined
        try {
          const rec = await fetchRecording(connection, pda)
          anchoredAt = rec?.anchoredAt.toString()
        } catch {}

        return {
          description: `PDA ${ellipsify(pda.toString(), 6)} created${anchoredAt ? ` · anchored_at ${anchoredAt}` : ''} · sig ${signature}`,
          status: 'success',
          title: 'Register recording',
        } as const
      }}
      title="Register recording"
    />
  )
}
