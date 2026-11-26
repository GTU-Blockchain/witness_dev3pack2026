'use client'
// 4: "/" doğrulama akışı: dosya → tarayıcıda SHA-256 → PDA → getAccountInfo → ✅/❌.
import { useState } from 'react'
import { DropZone } from './DropZone'
import { ResultCard } from './ResultCard'
import { sha256HexOfFile } from '@/lib/hash'
import { lookupRecording, type LookupResult } from '@/lib/recording'

type FileMeta = { name: string; size: number }

type State =
  | { phase: 'idle' }
  | { phase: 'working'; file: FileMeta; step: string; hash?: string }
  | { phase: 'done'; file: FileMeta; hash: string; result: LookupResult }
  | { phase: 'error'; file: FileMeta; hash?: string; message: string }

function StatusPill({ state }: { state: State }) {
  if (state.phase === 'working') return <span className="status-pill is-hashing">{state.step}</span>
  if (state.phase === 'error') return <span className="status-pill is-tampered">✕ Doğrulanamadı</span>
  if (state.phase === 'done') {
    return state.result.status === 'sealed' ? (
      <span className="status-pill is-valid">✓ Bütünlük doğrulandı</span>
    ) : (
      <span className="status-pill is-tampered">✕ Eşleşen mühür yok</span>
    )
  }
  return <span className="status-pill">Dosya bekleniyor</span>
}

function BrandMark() {
  // Ses dalgası işareti (ikon fontu yüklememek için satır içi SVG)
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <rect x="2" y="8" width="2" height="4" rx="1" />
        <rect x="6" y="5" width="2" height="10" rx="1" />
        <rect x="10" y="2" width="2" height="16" rx="1" />
        <rect x="14" y="6" width="2" height="8" rx="1" />
        <rect x="18" y="9" width="2" height="2" rx="1" />
      </svg>
    </span>
  )
}

export function Verifier() {
  const [state, setState] = useState<State>({ phase: 'idle' })

  async function verify(f: File) {
    const file = { name: f.name, size: f.size }
    setState({ phase: 'working', file, step: 'Parmak izi hesaplanıyor…' })
    let hash: string | undefined
    try {
      hash = await sha256HexOfFile(f)
      setState({ phase: 'working', file, hash, step: 'Zincir kaydı okunuyor…' })
      const result = await lookupRecording(hash)
      setState({ phase: 'done', file, hash, result })
    } catch (e) {
      setState({ phase: 'error', file, hash, message: e instanceof Error ? e.message : String(e) })
    }
  }

  return (
    <>
      <section className="top-shell">
        <header className="brand-header">
          <div className="brand-title-group">
            <BrandMark />
            <div>
              <h1 className="brand-title">Witness Doğrulama</h1>
              <p className="brand-subtitle">Ses kaydı parmak izi &amp; Solana PDA mührü</p>
            </div>
          </div>
          <StatusPill state={state} />
        </header>

        <DropZone onFile={verify} disabled={state.phase === 'working'} />

        {state.phase === 'working' && (
          <div className="forensic-pane">
            <div className="pane-header">
              <h3 className="pane-title">{state.step}</h3>
              <span className="pane-tag text-muted mono-val">{state.file.name}</span>
            </div>
            {state.hash && <div className="hash-readout">{state.hash}</div>}
          </div>
        )}

        {state.phase === 'error' && (
          <div className="forensic-pane">
            <p className="text-error" style={{ margin: 0 }}>
              Doğrulama tamamlanamadı (ağ hatası olabilir): {state.message}. Lütfen tekrar deneyin.
            </p>
            {state.hash && <div className="hash-readout">{state.hash}</div>}
          </div>
        )}

        {state.phase === 'done' && (
          <ResultCard fileName={state.file.name} fileSize={state.file.size} hash={state.hash} result={state.result} />
        )}
      </section>

      <div className="note-box">Bu sayfa içeriğin doğru olduğunu değil, sonradan değiştirilmediğini kanıtlar.</div>
    </>
  )
}
