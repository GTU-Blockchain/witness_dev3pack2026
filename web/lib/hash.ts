// 4: Tarayıcıda SHA-256. Hash kuralı (docs/TEKNIK_DOKUMAN.md): dosyanın son halinin
// ham baytlarının SHA-256'sı, küçük harf hex (64 karakter); zincirde 32 bayt.
// Dosya yeniden kodlanmaz, hiçbir yere gönderilmez; sadece ham baytlar okunur.

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

/** Seçilen dosyanın ham baytlarının SHA-256'sı. */
export async function sha256HexOfFile(file: File): Promise<string> {
  return sha256Hex(await file.arrayBuffer())
}
