import { getRecording, updateRecording } from '@/features/record/recordings-store'
import { isTranscribable, registerRecording, transcribeRecording } from '@/utils/witness-backend'

// Mühürlenmiş bir kaydı Supabase'e yazar, sonra transkriptini alır (sahibi: 5 Backend + kaptan).
// Mühürleme akışını hiç bekletmez: çağıran `void syncRecordingToBackend(id)` der ve devam eder.
// Hata olursa sessizce kalır; kayıt ekranı tekrar açıldığında yeniden denenir. Kanıt zincirde, kaybolmaz.

// Uygulama içi kayıtlar her zaman m4a (AAC). Paylaşılan dosyalar için ileride kayda mimeType eklenebilir.
const RECORDING_MIME = 'audio/mp4'

const inFlight = new Set<string>()

/** Mühürlenmiş ama Supabase'e yazılmamış ya da transkripti alınmamış kayıt mı? */
export function needsBackendSync(id: string): boolean {
  const rec = getRecording(id)
  if (!rec || rec.status !== 'sealed' || !rec.hash || !rec.signature || !rec.wallet) return false
  return !rec.backendSynced || rec.transcriptStatus === 'pending' || rec.transcriptStatus === undefined
}

export async function syncRecordingToBackend(id: string): Promise<void> {
  if (inFlight.has(id) || !needsBackendSync(id)) return
  inFlight.add(id)
  try {
    const rec = getRecording(id)!

    if (!rec.backendSynced) {
      await registerRecording({
        hash: rec.hash!,
        signature: rec.signature!,
        wallet: rec.wallet!,
        mimeType: RECORDING_MIME,
      })
      updateRecording(id, { backendSynced: true })
    }

    if (!isTranscribable(RECORDING_MIME)) {
      updateRecording(id, { transcriptStatus: 'skipped' })
      return
    }
    updateRecording(id, { transcriptStatus: 'pending' })
    try {
      const { transcript, lang } = await transcribeRecording(rec.hash!, rec.uri, RECORDING_MIME)
      updateRecording(id, { transcript: transcript ?? undefined, transcriptLang: lang, transcriptStatus: 'done' })
    } catch (e) {
      // 'failed': ekranda "transkript yok" görünür; bir sonraki açılışta tekrar denenmez (ElevenLabs ücreti).
      updateRecording(id, { transcriptStatus: 'failed' })
      console.warn('[witness] transcribe failed', e)
    }
  } catch (e) {
    // register başarısız (ağ vs.): backendSynced false kalır, bir sonraki açılışta tekrar denenir.
    console.warn('[witness] register failed', e)
  } finally {
    inFlight.delete(id)
  }
}
