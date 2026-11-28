import { PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import type { ShareIntentFile } from 'expo-share-intent'
import { Text, View } from 'react-native'
import { AppActionButton } from '@/components/app-action-button'
import { appStyles } from '@/constants/app-styles'
import { ellipsify } from '@/utils/ellipsify'
import { sha256HexOfFile } from '@/utils/witness-hash'
import { buildRegisterRecordingIx, fetchRecording } from '@/utils/witness-program'

// Layer 1 (old /dev card): "Share → Seal with Witness".
// A file shared from another app (voice recorder, camera, files) lands here, and register_recording
// is called with that file's REAL hash instead of an in-app recording.
// Note: a seal proves "this file hasn't changed since it was sealed"; we can't see edits made before
// it was shared (see docs → capture-time goal on the roadmap).

/** 64 hex characters → 32 bytes. */
function bytesFromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

/** On Android expo-share-intent can give a plain file path; normalize it to a file URI. */
function toFileUri(path: string): string {
  if (path.startsWith('file://') || path.startsWith('content://')) return path
  return `file://${path}`
}

export function AccountFeatureSealShared({ address, file }: { address: PublicKey; file: ShareIntentFile }) {
  const { connection, signAndSendTransactions } = useMobileWallet()

  return (
    <View style={appStyles.stack}>
      <View style={appStyles.card}>
        <Text style={{ fontWeight: 'bold' }}>Shared file</Text>
        <Text>{file.fileName || 'file'}</Text>
        <Text>
          {file.mimeType}
          {file.size ? ` · ${Math.round(file.size / 1024)} KB` : ''}
        </Text>
      </View>

      <AppActionButton
        title="Seal with Witness"
        onPress={async () => {
          // account.address can be a base58 string at runtime (even though the type says PublicKey).
          const payer = address instanceof PublicKey ? address : new PublicKey(address as unknown as string)

          // 1. SHA-256 of the file's raw bytes (shared rule: lowercase hex).
          const hashHex = await sha256HexOfFile(toFileUri(file.path))
          const audioHash = bytesFromHex(hashHex)

          // 2. Build the register_recording transaction and have it signed.
          const {
            context: { slot: minContextSlot },
            value: latestBlockhash,
          } = await connection.getLatestBlockhashAndContext()

          const { ix, pda } = await buildRegisterRecordingIx(connection, payer, {
            audioHash,
            recordedAt: Math.floor(Date.now() / 1000),
            // The program requires duration_ms > 0 (InvalidDuration). Layer 1 accepts any file
            // type, so for shares without a duration (e.g. photos) we send at least 1.
            durationMs: Math.max(1, Math.round(file.duration ?? 0)),
            locationCommitment: null,
          })

          const message = new TransactionMessage({
            payerKey: payer,
            recentBlockhash: latestBlockhash.blockhash,
            instructions: [ix],
          }).compileToLegacyMessage()

          const signature = await signAndSendTransactions(new VersionedTransaction(message), minContextSlot)
          await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed')

          // 3. Reading the PDA is best-effort: if the signature went through, the flow succeeded.
          let anchoredAt: string | undefined
          try {
            const rec = await fetchRecording(connection, pda)
            anchoredAt = rec?.anchoredAt.toString()
          } catch {}

          return {
            description: `hash ${ellipsify(hashHex, 8)} · PDA ${ellipsify(pda.toString(), 6)}${
              anchoredAt ? ` · anchored_at ${anchoredAt}` : ''
            } · sig ${signature}`,
            status: 'success',
            title: 'Sealed',
          } as const
        }}
      />
    </View>
  )
}
