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
    setState({ phase: 'working', fileName, step: 'Parmak izi hesaplanıyor…' })
    try {
      const hash = await sha256HexOfFile(file)
      setState({ phase: 'working', fileName, hash, step: 'Zincir kaydı okunuyor…' })
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
          Doğrulama tamamlanamadı (ağ hatası olabilir): {state.message}. Lütfen tekrar deneyin.
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
