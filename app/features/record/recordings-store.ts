import { useSyncExternalStore } from 'react'
import { Directory, File, Paths } from 'expo-file-system'
import type { RecordingItem } from '@/src/screens/RecordingsScreen'

// Kayıt listesi: telefonda, uygulamanın kalıcı klasöründe JSON olarak durur.
// Ses dosyaları da cache'ten (sistem silebilir) kalıcı klasöre taşınır.
// Taşıma baytları değiştirmez; dosya asla yeniden kodlanmaz / kırpılmaz.
// Mühürlenmemiş ("pending") kayıtlar otomatik silinmez.

export type StoredRecording = RecordingItem & {
  /** Ses dosyasının yolu (file://...). */
  uri: string
  /** MIME türü (ör. "audio/mp4", "image/jpeg"). Paylaşılan dosyalar için set edilir;
   *  uygulama içi kayıtlar her zaman m4a olduğundan boş bırakılır (backend-sync fallback eder). */
  mimeType?: string
  signature?: string
  slot?: number
  /** Mühürleyen cüzdan (base58); Supabase'e register için. */
  wallet?: string
  /** Supabase `register` başarılı oldu mu (bkz. features/record/backend-sync.ts). */
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
    // Kaydedilemezse liste en azından bu oturumda bellekte kalır.
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Yeni çekilen kaydı listeye "pending" olarak ekler, dosyasını kalıcı klasöre taşır. */
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

/** Rol 6 — başka uygulamadan paylaşılan dosyayı (ses/resim) listeye "pending" ekler.
 *  Dosyayı kalıcı klasöre KOPYALAR (taşımaz; kaynak başka uygulamanın/cache'in olabilir).
 *  Baytlar değişmez; dosya asla yeniden kodlanmaz. Sonrası normal kayıtla aynı: /seal hattı. */
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
