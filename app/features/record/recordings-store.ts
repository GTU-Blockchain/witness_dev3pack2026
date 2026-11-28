import { useSyncExternalStore } from 'react'
import { Directory, File, Paths } from 'expo-file-system'
import type { RecordingItem } from '@/src/screens/RecordingsScreen'

// The recordings list: stored on the phone as JSON in the app's persistent folder.
// Audio files are moved from the cache (which the system may clear) to the persistent folder too.
// Moving doesn't change the bytes; the file is never re-encoded or trimmed.
// Unsealed ("pending") recordings are never deleted automatically.

export type StoredRecording = RecordingItem & {
  /** Path of the media file (file://...). */
  uri: string
  /** MIME type (e.g. "audio/mp4", "image/jpeg"). Set for shared files; left empty for in-app
   *  recordings, which are always m4a (backend-sync falls back to that). */
  mimeType?: string
  signature?: string
  slot?: number
  /** The sealing wallet (base58), for the Supabase register call. */
  wallet?: string
  /** Did the Supabase `register` call succeed (see features/record/backend-sync.ts)? */
  backendSynced?: boolean
  transcriptStatus?: 'pending' | 'done' | 'failed' | 'skipped'
  transcriptLang?: 'tr' | 'en' | null
}

const dir = new Directory(Paths.document, 'recordings')
const indexFile = new File(Paths.document, 'recordings.json')

let recordings: StoredRecording[] = load()
const listeners = new Set<() => void>()

function load(): StoredRecording[] {
  try {
    return indexFile.exists ? (JSON.parse(indexFile.textSync()) as StoredRecording[]) : []
  } catch {
    return []
  }
}

function save(next: StoredRecording[]) {
  recordings = next
  try {
    indexFile.write(JSON.stringify(next))
  } catch {
    // If saving fails, the list at least stays in memory for this session.
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Adds a new recording to the list as "pending" and moves its file to the persistent folder. */
export function addRecording(tempUri: string, durationMillis: number, locationEnabled: boolean): StoredRecording {
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true })
  const source = new File(tempUri)
  const dest = new File(dir, source.name)
  source.move(dest)
  const item: StoredRecording = {
    id: `${Date.now()}`,
    recordedAt: Date.now(),
    durationMillis,
    status: 'pending',
    locationEnabled,
    uri: dest.uri,
  }
  save([item, ...recordings])
  return item
}

/** Role 6: adds a file shared from another app (audio/image) to the list as "pending".
 *  COPIES the file to the persistent folder (doesn't move it; the source may belong to another app or a cache).
 *  The bytes don't change; the file is never re-encoded. After that it's the same as a recording: the /seal pipeline. */
export function addSharedRecording(
  sourceUri: string,
  fileName: string,
  mimeType: string,
  durationMillis: number,
): StoredRecording {
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true })
  const now = Date.now()
  const source = new File(sourceUri)
  const safeName = fileName?.trim() || source.name || `shared-${now}`
  const dest = new File(dir, `${now}-${safeName}`)
  source.copy(dest)
  const item: StoredRecording = {
    id: `${now}`,
    recordedAt: now,
    durationMillis,
    status: 'pending',
    locationEnabled: false,
    uri: dest.uri,
    mimeType,
  }
  save([item, ...recordings])
  return item
}

export function updateRecording(id: string, patch: Partial<StoredRecording>) {
  save(recordings.map((r) => (r.id === id ? { ...r, ...patch } : r)))
}

export function getRecording(id: string): StoredRecording | undefined {
  return recordings.find((r) => r.id === id)
}

export function useRecordings(): StoredRecording[] {
  return useSyncExternalStore(subscribe, () => recordings)
}
