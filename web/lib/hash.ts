// 4: SHA-256 in the browser. Hash rule (docs/TECHNICAL.md): SHA-256 of the raw bytes of the file's
// final form, lowercase hex (64 characters); 32 bytes on chain.
// The file is never re-encoded or sent anywhere; only the raw bytes are read.
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

/** 64 lowercase hex characters → 32 bytes. Throws if invalid. */
export function hexToBytes(hex: string): Uint8Array {
  if (!isHex64(hex)) throw new Error('Hash must be 64 lowercase hex characters')
  const out = new Uint8Array(32)
  for (let i = 0; i < 32; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

/** SHA-256 of raw bytes, lowercase hex. */
export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(new Uint8Array(digest))
}

// Large files (video etc.): file.arrayBuffer() loads the whole file into memory; on a phone a video
// of hundreds of MB can crash the tab. Above this threshold the file is read in CHUNK_BYTES chunks
// and hashed with incremental SHA-256 (@noble/hashes). The result is exactly the same SHA-256 (the
// hash rule doesn't change); only one chunk is in memory at a time.
// Details: web/README.md → "Large files".
export const STREAM_THRESHOLD_BYTES = 64 * 1024 * 1024 // under 64 MB: in one go, native WebCrypto (fast)
export const CHUNK_BYTES = 8 * 1024 * 1024 // 8 MB chunks

/** SHA-256 of the selected file's raw bytes. onProgress: 0–1 (chunked mode only). */
export async function sha256HexOfFile(file: File, onProgress?: (fraction: number) => void): Promise<string> {
  if (file.size <= STREAM_THRESHOLD_BYTES) return sha256Hex(await file.arrayBuffer())

  const hasher = sha256.create()
  let offset = 0
  while (offset < file.size) {
    const chunk = new Uint8Array(await file.slice(offset, offset + CHUNK_BYTES).arrayBuffer())
    if (chunk.length === 0) throw new Error('The file ended unexpectedly while reading')
    hasher.update(chunk)
    offset += chunk.length
    onProgress?.(offset / file.size)
  }
  return bytesToHex(hasher.digest())
}
