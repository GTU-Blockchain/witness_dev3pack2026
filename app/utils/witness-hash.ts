// 2: The file's SHA-256, the basis of sealing.
// Shared rule (docs/TECHNICAL.md): "SHA-256 of the raw bytes of the file's final form,
// lowercase hex." The file is never re-encoded; the raw bytes are hashed.
// Note: expo-crypto + expo-file-system are native modules; adding a screen that calls them
// needs a new dev build (expo run:android).
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

/** SHA-256 of raw bytes, lowercase hex (64 characters). */
export async function sha256HexOfBytes(data: Uint8Array): Promise<string> {
  // cast: the TS lib's BufferSource generic doesn't match Uint8Array<ArrayBufferLike>;
  // the native digest accepts a Uint8Array at runtime.
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data as unknown as ArrayBuffer)
  return toLowerHex(digest)
}

/** Reads the raw bytes at a file URI and returns their SHA-256 hex. */
export async function sha256HexOfFile(uri: string): Promise<string> {
  const buffer = await new File(uri).arrayBuffer()
  return sha256HexOfBytes(new Uint8Array(buffer))
}
