'use client'
// 4: Sonuç ekranı (docs/TEKNIK_DOKUMAN.md → "Sonuç ekranında olması gerekenler").
import { useEffect, useState } from 'react'
import type { LookupResult } from '@/lib/recording'
import { findSealSignature } from '@/lib/recording'
import { explorerAddress, explorerTx, formatDuration, formatIstanbul, shortAddress } from '@/lib/format'

const mono: React.CSSProperties = { fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all', fontSize: 13 }

export function ResultCard({ fileName, hash, result }: { fileName: string; hash: string; result: LookupResult }) {
  const sealed = result.status === 'sealed'
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
    <section
      style={{
        marginTop: 24,
        borderRadius: 12,
        padding: 20,
        border: `2px solid ${sealed ? '#16a34a' : '#dc2626'}`,
        background: sealed ? '#f0fdf4' : '#fef2f2',
      }}
    >
      <h2 style={{ margin: 0, color: sealed ? '#15803d' : '#b91c1c' }}>
        {sealed ? '✅ Bu dosya mühürlü kayıtla birebir aynı' : '❌ Bu dosya hiç mühürlenmemiş ya da değiştirilmiş'}
      </h2>
      {result.status === 'invalid' && <p style={{ color: '#b91c1c' }}>{result.reason}</p>}

      <p style={{ color: '#555', margin: '12px 0 4px' }}>{fileName}</p>
      <div style={mono}>SHA-256: {hash}</div>

      {result.status === 'sealed' && (
        <div style={{ marginTop: 16, lineHeight: 1.6 }}>
          <div style={{ color: '#555' }}>En geç şu anda vardı</div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{formatIstanbul(result.recording.anchoredAt)}</div>
          <div style={{ color: '#777', fontSize: 13 }}>
            Cihaz saati (beyan): {formatIstanbul(result.recording.recordedAt)}
          </div>
          <div style={{ marginTop: 12 }}>
            Cüzdan:{' '}
            <a href={explorerAddress(result.recording.authority)} target="_blank" rel="noreferrer">
              {shortAddress(result.recording.authority)}
            </a>
          </div>
          <div>Süre: {formatDuration(result.recording.durationMs)}</div>
          <div>
            İşlem:{' '}
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
          </div>
          {result.recording.hasLocationCommitment && (
            <div style={{ color: '#555' }}>Konum beyan edildi (gizli, sadece commitment)</div>
          )}
        </div>
      )}

      <p style={{ color: '#666', fontSize: 13, marginTop: 16, marginBottom: 0 }}>
        Bu sayfa içeriğin doğru olduğunu değil, sonradan değiştirilmediğini kanıtlar.
      </p>
    </section>
  )
}
