'use client'
// 4: Sonuç ekranı (docs/TEKNIK_DOKUMAN.md → "Sonuç ekranında olması gerekenler").
// Yerleşim: yerel dosya | eşleşme köprüsü | zincirdeki kayıt.
import { useEffect, useState } from 'react'
import type { LookupResult } from '@/lib/recording'
import { findSealSignature } from '@/lib/recording'
import { explorerAddress, explorerTx, formatDuration, formatIstanbul, shortAddress } from '@/lib/format'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function ResultCard({
  fileName,
  fileSize,
  hash,
  result,
}: {
  fileName: string
  fileSize: number
  hash: string
  result: LookupResult
}) {
  const sealed = result.status === 'sealed'
  const tone = sealed ? 'is-valid' : 'is-tampered'
  const [sig, setSig] = useState<string | null>(null)

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
    <div className="meta-list" style={{ gap: 12 }} data-testid="result">
      <h2 className={`verdict ${tone}`}>
        {sealed ? '✅ Bu dosya mühürlü kayıtla birebir aynı' : '❌ Bu dosya hiç mühürlenmemiş ya da değiştirilmiş'}
      </h2>

      <div className="split-grid">
        {/* Sol: yerel dosya */}
        <div className="forensic-pane">
          <div className="pane-header">
            <h3 className="pane-title">Yerel dosya</h3>
            <span className="pane-tag text-muted">TARAYICIDA</span>
          </div>
          <div className="info-box meta-list">
            <div className="meta-row">
              <span className="meta-key">Ad</span>
              <span className="meta-val mono-val">{fileName}</span>
            </div>
            <div className="meta-row">
              <span className="meta-key">Boyut</span>
              <span className="meta-val">{formatSize(fileSize)}</span>
            </div>
          </div>
          <div className="hash-label">Hesaplanan SHA-256</div>
          <div className={`hash-readout ${tone}`}>{hash}</div>
        </div>

        {/* Orta: eşleşme köprüsü */}
        <div className="bridge-column">
          <div className={`bridge-badge ${tone}`}>{sealed ? '=' : '≠'}</div>
          <span className="bridge-label">{sealed ? 'EŞLEŞTİ' : 'EŞLEŞME YOK'}</span>
        </div>

        {/* Sağ: zincir kaydı */}
        <div className="forensic-pane">
          <div className="pane-header">
            <h3 className="pane-title">Solana PDA kaydı</h3>
            <span className={`pane-tag ${sealed ? 'text-positive' : 'text-error'}`}>
              {sealed ? 'ON-CHAIN' : 'KAYIT YOK'}
            </span>
          </div>

          {result.status === 'sealed' ? (
            <>
              <div className="meta-list">
                <div className="meta-row is-stacked">
                  <span className="meta-key">En geç şu anda vardı</span>
                  <span className="anchor-time">{formatIstanbul(result.recording.anchoredAt)}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-key">Cihaz saati (beyan)</span>
                  <span className="meta-val text-muted">{formatIstanbul(result.recording.recordedAt)}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-key">Cüzdan</span>
                  <span className="meta-val mono-val">
                    <a href={explorerAddress(result.recording.authority)} target="_blank" rel="noreferrer">
                      {shortAddress(result.recording.authority)}
                    </a>
                  </span>
                </div>
                <div className="meta-row">
                  <span className="meta-key">Süre</span>
                  <span className="meta-val">{formatDuration(result.recording.durationMs)}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-key">İşlem</span>
                  <span className="meta-val mono-val">
                    {sig ? (
                      <a href={explorerTx(sig)} target="_blank" rel="noreferrer">
                        {shortAddress(sig)}
                      </a>
                    ) : (
                      '…'
                    )}
                    {' · '}
                    <a href={explorerAddress(result.recording.pda)} target="_blank" rel="noreferrer">
                      Kayıt hesabı
                    </a>
                  </span>
                </div>
                {result.recording.hasLocationCommitment && (
                  <div className="meta-row">
                    <span className="meta-key">Konum</span>
                    <span className="meta-val text-muted">Beyan edildi (gizli, sadece commitment)</span>
                  </div>
                )}
              </div>
              <div className="hash-label">Zincirdeki SHA-256</div>
              <div className="hash-readout">{result.recording.audioHash}</div>
            </>
          ) : (
            <p className="text-muted" style={{ margin: 0 }}>
              {result.status === 'invalid'
                ? result.reason
                : 'Bu parmak izine ait bir mühür zincirde yok. Dosya hiç mühürlenmemiş ya da mühürlendikten sonra değiştirilmiş (kesilmiş, yeniden kaydedilmiş, dönüştürülmüş) olabilir.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
