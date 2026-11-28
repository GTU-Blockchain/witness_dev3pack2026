// Client for the Supabase Edge Functions (owner: Backend + captain).
// Contract: supabase/README.md → "register API" and "transcribe API".
//
// Runs IN THE BACKGROUND once the seal is on chain; the user never waits for it.
// If Supabase is unreachable no proof is lost (the seal is on chain); only the transcript doesn't arrive.

// With the New Architecture (Fabric) on, uploading a file with fetch + FormData fails with
// "Unsupported FormDataPart implementation" before the request leaves the device. So transcribe
// sends the file with expo-file-system's native multipart upload (uploadAsync, legacy API).
import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy'

// Public values (same as .env.example); taken from .env if present.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://tckkwwejujtjgzufbecl.supabase.co'
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_SkZJ_A0YUfhA_2v-yev1sw_AsEuKR-f'

const REGISTER_TIMEOUT_MS = 30_000
const TRANSCRIBE_TIMEOUT_MS = 90_000 // ElevenLabs can take a while on long recordings
const REGISTER_ATTEMPTS = 4

export class BackendError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
  /** Worth retrying (network, RPC lag, server error)? */
  get retryable(): boolean {
    return this.status === 0 || this.status >= 500 || this.code === 'tx_not_found'
  }
}

async function callFunction<T>(name: string, body: BodyInit, timeoutMs: number, json: boolean): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, ...(json ? { 'Content-Type': 'application/json' } : {}) },
      body,
      signal: controller.signal,
    })
  } catch (e) {
    throw new BackendError(0, 'network', e instanceof Error ? e.message : String(e))
  } finally {
    clearTimeout(timer)
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string }
  if (!res.ok) throw new BackendError(res.status, data.error ?? 'unknown', data.message ?? `HTTP ${res.status}`)
  return data
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// uploadAsync has no AbortController; reject the promise if the upload runs too long (the native
// upload may continue briefly, which is fine for a best-effort background flow).
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)),
  ])
}

export type RegisterInput = {
  /** 64 lowercase hex characters. */
  hash: string
  /** The signature returned by signAndSendTransactions (base58). */
  signature: string
  /** The signing wallet (base58). */
  wallet: string
  /** E.g. "audio/mp4", "image/jpeg". No transcript unless it's audio/video. */
  mimeType?: string
}

/** Writes the record to Supabase. The server verifies everything on chain. Retries a few times on transient errors. */
export async function registerRecording(input: RegisterInput): Promise<void> {
  const body = JSON.stringify({
    audio_hash: input.hash,
    tx_signature: input.signature,
    wallet: input.wallet,
    mime_type: input.mimeType,
  })
  for (let attempt = 1; ; attempt++) {
    try {
      await callFunction('register', body, REGISTER_TIMEOUT_MS, true)
      return
    } catch (e) {
      if (!(e instanceof BackendError) || !e.retryable || attempt >= REGISTER_ATTEMPTS) throw e
      await sleep(2_000 * attempt) // wait a bit in case the RPC doesn't see the transaction yet
    }
  }
}

export type TranscriptResult = { transcript: string | null; lang: 'tr' | 'en' | null }

type TranscribeResponse = {
  transcript?: string | null
  transcript_lang?: 'tr' | 'en' | null
  error?: string
  message?: string
}

/** Sends the exact sealed file (not re-encoded) and returns its transcript. Audio/video only.
 *  The file goes as the multipart form the server expects: a `file` field + an `audio_hash` parameter
 *  (not callFunction/fetch; native uploadAsync because of the New Arch FormData limit, see the note above). */
export async function transcribeRecording(
  hash: string,
  fileUri: string,
  mimeType = 'audio/mp4',
): Promise<TranscriptResult> {
  let result
  try {
    result = await withTimeout(
      uploadAsync(`${SUPABASE_URL}/functions/v1/transcribe`, fileUri, {
        httpMethod: 'POST',
        uploadType: FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType,
        parameters: { audio_hash: hash },
        headers: { apikey: SUPABASE_ANON_KEY },
      }),
      TRANSCRIBE_TIMEOUT_MS,
    )
  } catch (e) {
    throw new BackendError(0, 'network', e instanceof Error ? e.message : String(e))
  }
  let data: TranscribeResponse = {}
  try {
    data = JSON.parse(result.body) as TranscribeResponse
  } catch {
    // empty/HTML body: data stays {}, and an error is built from the status below
  }
  if (result.status < 200 || result.status >= 300) {
    throw new BackendError(result.status, data.error ?? 'unknown', data.message ?? `HTTP ${result.status}`)
  }
  return { transcript: data.transcript ?? null, lang: data.transcript_lang ?? null }
}

export const isTranscribable = (mimeType: string) => mimeType.startsWith('audio/') || mimeType.startsWith('video/')
