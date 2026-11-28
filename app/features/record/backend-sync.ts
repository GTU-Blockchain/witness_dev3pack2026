import { getRecording, updateRecording } from '@/features/record/recordings-store'
import { isTranscribable, registerRecording, transcribeRecording } from '@/utils/witness-backend'

// Writes a sealed recording to Supabase, then fetches its transcript (owner: Backend + captain).
// Never blocks sealing: the caller does `void syncRecordingToBackend(id)` and moves on.
// Fails quietly and is retried the next time the screen opens. The proof is on chain and can't be lost.

// In-app recordings are always m4a (AAC); shared files (Role 6) use the recording's mimeType.
const DEFAULT_MIME = 'audio/mp4'

const inFlight = new Set<string>()

/** Sealed, but not yet written to Supabase or still missing its transcript? */
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
    const mime = rec.mimeType ?? DEFAULT_MIME

    if (!rec.backendSynced) {
      await registerRecording({
        hash: rec.hash!,
        signature: rec.signature!,
        wallet: rec.wallet!,
        mimeType: mime,
      })
      updateRecording(id, { backendSynced: true })
    }

    if (!isTranscribable(mime)) {
      // Resim/belge vb.: transkript yok, register yeterli.
      updateRecording(id, { transcriptStatus: 'skipped' })
      return
    }
    updateRecording(id, { transcriptStatus: 'pending' })
    try {
      const { transcript, lang } = await transcribeRecording(rec.hash!, rec.uri, mime)
      updateRecording(id, { transcript: transcript ?? undefined, transcriptLang: lang, transcriptStatus: 'done' })
    } catch (e) {
      // 'failed': the screen shows "no transcript"; not retried on the next open (ElevenLabs costs money).
      updateRecording(id, { transcriptStatus: 'failed' })
      console.warn('[witness] transcribe failed', e)
    }
  } catch (e) {
    // register failed (network etc.): backendSynced stays false and it's retried on the next open.
    console.warn('[witness] register failed', e)
  } finally {
    inFlight.delete(id)
  }
}
