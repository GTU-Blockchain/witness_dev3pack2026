'use client'
// 4: "/" doğrulama akışı: dosya → tarayıcıda SHA-256 → PDA → getAccountInfo → ✅/❌.
import { useState } from 'react'
import { DropZone } from './DropZone'
import { ResultCard } from './ResultCard'
import { sha256HexOfFile } from '@/lib/hash'
import { lookupRecording, type LookupResult } from '@/lib/recording'

type State =
  | { phase: 'idle' }
  | { phase: 'working'; fileName: string; step: string; hash?: string }
  | { phase: 'done'; fileName: string; hash: string; result: LookupResult; file: File }
  | { phase: 'error'; fileName: string; message: string }

export function Verifier() {
  const [state, setState] = useState<State>({ phase: 'idle' })

  async function verify(file: File) {
    const fileName = file.name
    setState({ phase: 'working', fileName, step: 'Computing fingerprint…' })
    try {
      // Büyük dosyada parça parça hash'lenir; ilerleme yüzde olarak gösterilir (web/README.md → Büyük dosyalar)
      let lastPct = -1
      const hash = await sha256HexOfFile(file, (f) => {
        const pct = Math.floor(f * 100)
        if (pct === lastPct) return
        lastPct = pct
        setState({ phase: 'working', fileName, step: `Computing fingerprint… ${pct}%` })
      })
      setState({ phase: 'working', fileName, hash, step: 'Reading the on-chain record…' })
      const result = await lookupRecording(hash)
      setState({ phase: 'done', fileName, hash, result, file })
    } catch (e) {
      setState({ phase: 'error', fileName, message: e instanceof Error ? e.message : String(e) })
    }
  }

  return (
    <div className="card">
      <DropZone onFile={verify} disabled={state.phase === 'working'} />

      {state.phase === 'working' && (
        <div className="working">
          {state.step}
          {state.hash && <span className="h">{state.hash}</span>}
        </div>
      )}

      {state.phase === 'error' && (
        <div className="working">
          Verification could not complete (possibly a network error): {state.message}. Please try again.
        </div>
      )}

      {state.phase === 'done' && (
        <ResultCard
          fileName={state.fileName}
          hash={state.hash}
          result={state.result}
          file={state.file}
          onReset={() => setState({ phase: 'idle' })}
        />
      )}
    </div>
  )
}
