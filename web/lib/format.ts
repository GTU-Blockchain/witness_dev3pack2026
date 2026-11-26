// 4: Görüntüleme yardımcıları. Zaman: zincirde Unix saniye, UI'da İstanbul saati.
import { SOLANA_CLUSTER } from './config'

export function shortAddress(addr: string): string {
  return addr.length > 10 ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : addr
}

const istanbul = new Intl.DateTimeFormat('tr-TR', {
  timeZone: 'Europe/Istanbul',
  dateStyle: 'long',
  timeStyle: 'medium',
})

export function formatIstanbul(unixSeconds: number): string {
  return `${istanbul.format(new Date(unixSeconds * 1000))} (İstanbul)`
}

export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return m > 0 ? `${m} dk ${s} sn` : `${s} sn`
}

/**
 * Süre gösterilmeli mi? Program `duration_ms > 0` istediği için fotoğraf gibi süresiz dosyalar
 * zincire `duration_ms = 1` ile yazılır (docs/TEKNIK_DOKUMAN.md → Supabase → duration_ms).
 * Kural: sadece ses/videoda göster. Tarayıcı türü bilmiyorsa (boş MIME) 1 ms'yi "süresiz" say.
 */
export function shouldShowDuration(mimeType: string, durationMs: number): boolean {
  if (mimeType.startsWith('audio/') || mimeType.startsWith('video/')) return true
  if (mimeType === '') return durationMs > 1
  return false
}

export function explorerAddress(addr: string): string {
  return `https://explorer.solana.com/address/${addr}?cluster=${SOLANA_CLUSTER}`
}

export function explorerTx(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=${SOLANA_CLUSTER}`
}
