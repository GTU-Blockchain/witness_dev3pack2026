'use client'
// 4: Sonuç kartı — büyük ✅/❌, ses dosyalarında dalga formu, "en geç şu tarihte vardı".
// Teknik alanlar (hash, cüzdan, tx, PDA…) "Detaylar" pop-up'ında (DetailsModal).
import { useEffect, useState } from 'react'
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
  onReset,
}: {
  fileName: string
  hash: string
  result: LookupResult
  file: File
  onReset: () => void
}) {
  const sealed = result.status === 'sealed'
  const [sig, setSig] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

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
    <div className={`result ${sealed ? 'r-ok' : 'r-bad'}`}>
      <div className="head">
        <div className="badge">{sealed ? '✓' : '✕'}</div>
        <h2>{sealed ? 'Unaltered' : "Doesn't match the sealed record"}</h2>
      </div>
      <p className="line">
        {sealed
          ? 'This file has not been altered since it was sealed.'
          : 'This file was never sealed, or was modified after sealing.'}
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
