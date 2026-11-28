'use client'
// 4: Result card: a big ✅/❌, a waveform for audio files, "existed no later than".
// Technical fields (hash, wallet, tx, PDA…) are in the "Details" pop-up (DetailsModal).
import { useEffect, useRef, useState } from 'react'
import type { LookupResult } from '@/lib/recording'
import { findSealSignature } from '@/lib/recording'
import { formatIstanbul } from '@/lib/format'
import { WaveForm } from './WaveForm'
import { DetailsModal } from './DetailsModal'

export function ResultCard({
  fileName,
  hash,
  result,
  file,
  badTitle,
  badLine,
  onReset,
}: {
  fileName: string
  hash: string
  result: LookupResult
  file: File
  /** Optional ❌ wording, e.g. on /v/<hash> when the file is not the one in the link. */
  badTitle?: string
  badLine?: string
  onReset: () => void
}) {
  const sealed = result.status === 'sealed'
  const [sig, setSig] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // On a phone the card can land below the fold (e.g. under the record on /v/<hash>):
  // bring it into view, so picking a file visibly does something. No-op when already visible.
  useEffect(() => {
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  useEffect(() => {
    setSig(null)
    if (result.status !== 'sealed') return
    let cancelled = false
    findSealSignature(result.recording.pda)
      .then((s) => !cancelled && setSig(s))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [result])

  return (
    <div ref={cardRef} className={`result ${sealed ? 'r-ok' : 'r-bad'}`}>
      <div className="head">
        <div className="badge">{sealed ? '✓' : '✕'}</div>
        <h2>{sealed ? 'Unaltered' : (badTitle ?? "Doesn't match the sealed record")}</h2>
      </div>
      <p className="line">
        {sealed
          ? 'This file has not been altered since it was sealed.'
          : (badLine ?? 'This file was never sealed, or was modified after sealing.')}
      </p>

      <WaveForm file={file} colorVar={sealed ? '--ok-ink' : '--faint'} />

      {sealed && result.status === 'sealed' && (
        <div className="when">
          Existed no later than
          <b>{formatIstanbul(result.recording.anchoredAt)}</b>
        </div>
      )}

      <div className="actions">
        <button className="btn-primary" onClick={() => setOpen(true)}>
          Details
        </button>
        <button className="btn-ghost" onClick={onReset}>
          New file
        </button>
      </div>

      {open && (
        <DetailsModal fileName={fileName} fileType={file.type} hash={hash} result={result} sig={sig} onClose={() => setOpen(false)} />
      )}
    </div>
  )
}
