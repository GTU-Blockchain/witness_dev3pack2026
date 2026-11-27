'use client'
// /v/<hash> flow. 1) Read the on-chain record for the hash in the URL (no file needed).
// 2) A dropped file is hashed in the browser; if its hash differs from the URL hash → ❌ without
// touching the chain, otherwise the record is read again and ResultCard shows ✅/❌.
// All chain reads go through lookupRecording (lib/recording.ts), the single lookup function.
import { useCallback, useEffect, useState } from 'react'
import { DropZone } from './DropZone'
import { ResultCard } from './ResultCard'
import { Row } from './DetailsModal'
import { sha256HexOfFile } from '@/lib/hash'
import { findSealSignature, lookupRecording, recordingPda, type LookupResult, type RecordingInfo } from '@/lib/recording'
import { explorerAddress, explorerTx, formatDuration, formatIstanbul, shortAddress, shouldShowDuration } from '@/lib/format'

const NOT_THIS_FILE = 'This is not the sealed file: it was modified, trimmed or re-encoded.'

type Lookup = { phase: 'loading' } | { phase: 'done'; result: LookupResult } | { phase: 'error'; message: string }

type Check =
  | { phase: 'idle' }
  | { phase: 'working'; fileName: string; step: string; fileHash?: string }
  | { phase: 'done'; fileName: string; fileHash: string; result: LookupResult; file: File; matchesLink: boolean }
  | { phase: 'error'; fileName: string; message: string }

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function ShareVerifier({ hash }: { hash: string }) {
  const [lookup, setLookup] = useState<Lookup>({ phase: 'loading' })
  const [check, setCheck] = useState<Check>({ phase: 'idle' })

  const load = useCallback(async () => {
    setLookup({ phase: 'loading' })
    try {
      setLookup({ phase: 'done', result: await lookupRecording(hash) })
    } catch (e) {
      setLookup({ phase: 'error', message: errorMessage(e) })
    }
  }, [hash])

  useEffect(() => {
    void load()
  }, [load])

  async function verify(file: File) {
    const fileName = file.name
    setCheck({ phase: 'working', fileName, step: 'Computing fingerprint…' })
    try {
      let lastPct = -1
      const fileHash = await sha256HexOfFile(file, (f) => {
        const pct = Math.floor(f * 100)
        if (pct === lastPct) return
        lastPct = pct
        setCheck({ phase: 'working', fileName, step: `Computing fingerprint… ${pct}%` })
      })

      if (fileHash !== hash) {
        const result: LookupResult = {
          status: 'invalid',
          pda: recordingPda(fileHash).toBase58(),
          reason: `${NOT_THIS_FILE} The link expects ${hash}.`,
        }
        setCheck({ phase: 'done', fileName, fileHash, result, file, matchesLink: false })
        return
      }

      setCheck({ phase: 'working', fileName, fileHash, step: 'Reading the on-chain record…' })
      const result = await lookupRecording(hash)
      setCheck({ phase: 'done', fileName, fileHash, result, file, matchesLink: true })
    } catch (e) {
      setCheck({ phase: 'error', fileName, message: errorMessage(e) })
    }
  }

  return (
    <div className="card">
      <RecordSection hash={hash} lookup={lookup} onRetry={load} />

      <div className="share-drop">
        <DropZone onFile={verify} disabled={check.phase === 'working'} />
      </div>

      {check.phase === 'working' && (
        <div className="working">
          {check.step}
          {check.fileHash && <span className="h">{check.fileHash}</span>}
        </div>
      )}

      {check.phase === 'error' && (
        <div className="working">
          Verification could not complete (possibly a network error): {check.message}. Please try again.
        </div>
      )}

      {check.phase === 'done' && (
        <ResultCard
          fileName={check.fileName}
          hash={check.fileHash}
          result={check.result}
          file={check.file}
          badTitle={check.matchesLink ? undefined : 'Not the sealed file'}
          badLine={check.matchesLink ? undefined : NOT_THIS_FILE}
          onReset={() => setCheck({ phase: 'idle' })}
        />
      )}
    </div>
  )
}

function RecordSection({ hash, lookup, onRetry }: { hash: string; lookup: Lookup; onRetry: () => void }) {
  if (lookup.phase === 'loading') {
    return (
      <div className="working">
        Reading the on-chain record…
        <span className="h">{hash}</span>
      </div>
    )
  }

  if (lookup.phase === 'error') {
    return (
      <div className="working">
        Could not read the record from Solana (possibly a network error): {lookup.message}.
        <div className="actions">
          <button className="btn-ghost" onClick={onRetry}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  const { result } = lookup
  if (result.status !== 'sealed') {
    return (
      <div className="result r-bad">
        <div className="head">
          <div className="badge">✕</div>
          <h2>No seal for this link</h2>
        </div>
        <p className="line">
          {result.status === 'invalid'
            ? result.reason
            : 'No record with this fingerprint exists on chain. The link may be wrong, or the file was never sealed.'}
        </p>
        <dl className="inline-dl">
          <Row label="SHA-256 (from link)" mono>
            {hash}
          </Row>
        </dl>
      </div>
    )
  }

  return <SealedRecord recording={result.recording} />
}

function SealedRecord({ recording: rec }: { recording: RecordingInfo }) {
  const [sig, setSig] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    setSig(undefined)
    findSealSignature(rec.pda)
      .then((s) => !cancelled && setSig(s))
      .catch(() => !cancelled && setSig(null))
    return () => {
      cancelled = true
    }
  }, [rec.pda])

  return (
    <div className="result r-ok">
      <div className="head">
        <div className="badge">✓</div>
        <h2>Sealed on Solana</h2>
      </div>
      <p className="line">A file with this fingerprint was sealed. Drop your copy below to check it&apos;s this one.</p>

      <div className="when">
        Existed no later than
        <b>{formatIstanbul(rec.anchoredAt)}</b>
      </div>

      <dl className="inline-dl">
        <Row label="Sealing wallet" mono>
          <a href={explorerAddress(rec.authority)} target="_blank" rel="noreferrer">
            {shortAddress(rec.authority)}
          </a>
        </Row>
        {/* The file type is unknown without the file, so the 1 ms placeholder of still media is hidden */}
        {shouldShowDuration('', rec.durationMs) && <Row label="Duration">{formatDuration(rec.durationMs)}</Row>}
        <Row label="Seal transaction" mono>
          {sig ? (
            <a href={explorerTx(sig)} target="_blank" rel="noreferrer">
              {shortAddress(sig)} (Explorer)
            </a>
          ) : sig === null ? (
            <a href={explorerAddress(rec.pda)} target="_blank" rel="noreferrer">
              View record account (Explorer)
            </a>
          ) : (
            '…'
          )}
        </Row>
        <Row label="SHA-256" mono>
          {rec.audioHash}
        </Row>
      </dl>
    </div>
  )
}
