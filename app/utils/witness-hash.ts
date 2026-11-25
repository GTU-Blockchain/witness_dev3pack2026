// 2: Ses dosyasının SHA-256'sı — mühürlemenin temeli.
// Ortak kural (docs/TEKNIK_DOKUMAN.md): "Dosyanın son halinin ham baytlarının
// SHA-256'sı, küçük harf hex." Dosya asla yeniden kodlanmaz; ham baytlar hash'lenir.
// Not: expo-crypto + expo-file-system native modül; bunları çağıran bir ekran
// eklenince dev build'in yeniden alınması (expo run:android) gerekir.
import * as Crypto from 'expo-crypto'
import { File } from 'expo-file-system'

function toLowerHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

/** Ham baytların SHA-256'sı, küçük harf hex (64 karakter). */
export async function sha256HexOfBytes(data: Uint8Array): Promise<string> {
  // cast: TS lib'in BufferSource generic'i Uint8Array<ArrayBufferLike> ile
  // uyuşmuyor; native digest runtime'da Uint8Array'i kabul ediyor.
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data as unknown as ArrayBuffer)
  return toLowerHex(digest)
}

/** Verilen dosya URI'sinin ham baytlarını okuyup SHA-256 hex döner. */
export async function sha256HexOfFile(uri: string): Promise<string> {
  const buffer = await new File(uri).arrayBuffer()
  return sha256HexOfBytes(new Uint8Array(buffer))
}

/** Memo yedeği metni: `witness:v1:<hash hex>` (docs/TEKNIK_DOKUMAN.md → Memo yedeği). */
export function witnessMemo(hashHex: string): string {
  return `witness:v1:${hashHex}`
}
