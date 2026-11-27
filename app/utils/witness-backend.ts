// Supabase Edge Function'larına bağlantı (sahibi: 5 Backend + kaptan).
// Sözleşme: supabase/README.md → "register API" ve "transcribe API".
//
// Mühür zincirde olduktan sonra ARKA PLANDA çalışır; kullanıcı hiçbir zaman bunu beklemez.
// Supabase'e ulaşılamazsa kanıt kaybolmaz (mühür zincirde), sadece transkript gelmez.

// Public değerler (.env.example ile aynı); .env varsa oradan gelir.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://tckkwwejujtjgzufbecl.supabase.co'
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_SkZJ_A0YUfhA_2v-yev1sw_AsEuKR-f'

const REGISTER_TIMEOUT_MS = 30_000
const TRANSCRIBE_TIMEOUT_MS = 90_000 // ElevenLabs uzun kayıtlarda zaman alabilir
const REGISTER_ATTEMPTS = 4

export class BackendError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
  /** Tekrar denemeye değer mi (ağ, RPC gecikmesi, sunucu hatası)? */
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

export type RegisterInput = {
  /** 64 karakter küçük harf hex. */
  hash: string
  /** signAndSendTransactions'ın döndürdüğü imza (base58). */
  signature: string
  /** İmzalayan cüzdan (base58). */
  wallet: string
  /** Örn. "audio/mp4", "image/jpeg". Ses/video değilse transkript yapılmaz. */
  mimeType?: string
}

/** Kaydı Supabase'e yazar. Sunucu her şeyi zincirden doğrular. Geçici hatalarda birkaç kez dener. */
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
      await sleep(2_000 * attempt) // işlem RPC'de henüz görünmüyorsa biraz bekle
    }
  }
}

export type TranscriptResult = { transcript: string | null; lang: 'tr' | 'en' | null }

/** Mühürlenen dosyanın aynısını (yeniden kodlanmamış) gönderir, transkripti döner. Sadece ses/video için. */
export async function transcribeRecording(
  hash: string,
  fileUri: string,
  mimeType = 'audio/mp4',
): Promise<TranscriptResult> {
  const form = new FormData()
  form.append('audio_hash', hash)
  // React Native FormData dosyayı { uri, name, type } ile alır.
  form.append('file', { uri: fileUri, name: 'recording.m4a', type: mimeType } as unknown as Blob)
  const data = await callFunction<{ transcript: string | null; transcript_lang: 'tr' | 'en' | null }>(
    'transcribe',
    form,
    TRANSCRIBE_TIMEOUT_MS,
    false,
  )
  return { transcript: data.transcript, lang: data.transcript_lang }
}

export const isTranscribable = (mimeType: string) => mimeType.startsWith('audio/') || mimeType.startsWith('video/')
