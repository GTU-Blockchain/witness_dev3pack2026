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
  | { phase: 'done'; fileName: string; hash: string; result: LookupResult }
  | { phase: 'error'; fileName: string; hash?: string; message: string }

export function Verifier() {
  const [state, setState] = useState<State>({ phase: 'idle' })

  async function verify(file: File) {
    const fileName = file.name
    setState({ phase: 'working', fileName, step: 'Parmak izi hesaplanıyor…' })
    let hash: string | undefined
    try {
      hash = await sha256HexOfFile(file)
      setState({ phase: 'working', fileName, hash, step: 'Zincir kaydı okunuyor…' })
      const result = await lookupRecording(hash)
      setState({ phase: 'done', fileName, hash, result })
    } catch (e) {
      setState({ phase: 'error', fileName, hash, message: e instanceof Error ? e.message : String(e) })
    }
  }

  return (
    <>
      <DropZone onFile={verify} disabled={state.phase === 'working'} />
      {state.phase === 'working' && (
        <p style={{ marginTop: 16 }}>
          {state.step}
          {state.hash && <span style={{ display: 'block', fontFamily: 'monospace', fontSize: 13 }}>{state.hash}</span>}
        </p>
      )}
      {state.phase === 'error' && (
        <p style={{ marginTop: 16, color: '#b91c1c' }}>
          Doğrulama tamamlanamadı (ağ hatası olabilir): {state.message}. Lütfen tekrar deneyin.
        </p>
      )}
      {state.phase === 'done' && <ResultCard fileName={state.fileName} hash={state.hash} result={state.result} />}
    </>
  )
}
