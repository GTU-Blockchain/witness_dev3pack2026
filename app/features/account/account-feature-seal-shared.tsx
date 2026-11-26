import { PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import type { ShareIntentFile } from 'expo-share-intent'
import { Text, View } from 'react-native'
import { AppActionButton } from '@/components/app-action-button'
import { appStyles } from '@/constants/app-styles'
import { ellipsify } from '@/utils/ellipsify'
import { sha256HexOfFile } from '@/utils/witness-hash'
import { buildRegisterRecordingIx, fetchRecording } from '@/utils/witness-program'

// Katman 1 — "Paylaş → Witness ile mühürle".
// Başka bir uygulamadan (ses kaydedici, kamera, dosya) paylaşılan dosya buraya düşer;
// uygulama içi "kaydet" yerine dış dosyanın GERÇEK hash'iyle register_recording çağrılır.
// Not: Mühür "bu dosya mühürden sonra değişmedi"yi kanıtlar; paylaşmadan önceki
// düzenlemeyi göremeyiz (bkz. docs → Katman 4 / capture-time hedefi).

/** 64 karakter hex → 32 bayt. */
function bytesFromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

/** expo-share-intent Android'de düz bir dosya yolu verebilir; File URI'ye normalize et. */
function toFileUri(path: string): string {
  if (path.startsWith('file://') || path.startsWith('content://')) return path
  return `file://${path}`
}

export function AccountFeatureSealShared({ address, file }: { address: PublicKey; file: ShareIntentFile }) {
  const { connection, signAndSendTransactions } = useMobileWallet()

  return (
    <View style={appStyles.stack}>
      <View style={appStyles.card}>
        <Text style={{ fontWeight: 'bold' }}>Paylaşılan dosya</Text>
        <Text>{file.fileName || 'dosya'}</Text>
        <Text>
          {file.mimeType}
          {file.size ? ` · ${Math.round(file.size / 1024)} KB` : ''}
        </Text>
      </View>

      <AppActionButton
        title="Witness ile mühürle"
        onPress={async () => {
          // account.address runtime'da base58 string gelebiliyor (tip PublicKey dese de).
          const payer = address instanceof PublicKey ? address : new PublicKey(address as unknown as string)

          // 1. Dosyanın ham baytlarından SHA-256 (ortak kural: küçük harf hex).
          const hashHex = await sha256HexOfFile(toFileUri(file.path))
          const audioHash = bytesFromHex(hashHex)

          // 2. register_recording işlemini kur + imzalat.
          const {
            context: { slot: minContextSlot },
            value: latestBlockhash,
          } = await connection.getLatestBlockhashAndContext()

          const { ix, pda } = await buildRegisterRecordingIx(connection, payer, {
            audioHash,
            recordedAt: Math.floor(Date.now() / 1000),
            // Program duration_ms > 0 şartı koyuyor (InvalidDuration). Katman 1 her dosya
            // tipine açık; fotoğraf gibi süresi olmayan paylaşımlarda en az 1 gönderiyoruz.
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

          // 3. PDA okuması best-effort: imza başarılıysa akış başarılıdır.
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
            title: 'Mühürlendi',
          } as const
        }}
      />
    </View>
  )
}
