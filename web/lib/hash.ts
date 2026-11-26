// 4: Tarayıcıda SHA-256. Hash kuralı (docs/TEKNIK_DOKUMAN.md): dosyanın son halinin
// ham baytlarının SHA-256'sı, küçük harf hex (64 karakter); zincirde 32 bayt.
// Dosya yeniden kodlanmaz, hiçbir yere gönderilmez; sadece ham baytlar okunur.
import { sha256 } from '@noble/hashes/sha2'

const HEX64 = /^[0-9a-f]{64}$/

export function isHex64(value: string): boolean {
  return HEX64.test(value)
}

export function bytesToHex(bytes: Uint8Array): string {
  let hex = ''
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0')
  return hex
}

/** 64 karakter küçük harf hex → 32 bayt. Geçersizse hata fırlatır. */
export function hexToBytes(hex: string): Uint8Array {
  if (!isHex64(hex)) throw new Error('Hash 64 karakter küçük harf hex olmalı')
  const out = new Uint8Array(32)
  for (let i = 0; i < 32; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

/** Ham baytların SHA-256'sı, küçük harf hex. */
export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(new Uint8Array(digest))
}

// Büyük dosyalar (video vb.): file.arrayBuffer() dosyanın tamamını belleğe alır; telefonda
// yüzlerce MB'lık bir videoda sekme çökebilir. Bu eşiğin üstünde dosya CHUNK_BYTES'lık
// parçalar halinde okunur ve artımlı SHA-256 (@noble/hashes) ile hash'lenir. Sonuç
// birebir aynı SHA-256'dır (hash kuralı değişmez); bellekte aynı anda sadece bir parça durur.
// Ayrıntı: web/README.md → "Büyük dosyalar".
export const STREAM_THRESHOLD_BYTES = 64 * 1024 * 1024 // 64 MB altı: tek seferde, yerel WebCrypto (hızlı)
export const CHUNK_BYTES = 8 * 1024 * 1024 // 8 MB parçalar

/** Seçilen dosyanın ham baytlarının SHA-256'sı. onProgress: 0–1 arası (sadece parça parça modda). */
export async function sha256HexOfFile(file: File, onProgress?: (fraction: number) => void): Promise<string> {
  if (file.size <= STREAM_THRESHOLD_BYTES) return sha256Hex(await file.arrayBuffer())

  const hasher = sha256.create()
  let offset = 0
  while (offset < file.size) {
    const chunk = new Uint8Array(await file.slice(offset, offset + CHUNK_BYTES).arrayBuffer())
    if (chunk.length === 0) throw new Error('Dosya okunurken beklenmedik şekilde bitti')
    hasher.update(chunk)
    offset += chunk.length
    onProgress?.(offset / file.size)
  }
  return bytesToHex(hasher.digest())
}
