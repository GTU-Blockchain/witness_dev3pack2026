'use client'
// 4: Doğrulama detayları pop-up'ı. Ana ekran sade kalsın diye tüm teknik alanlar burada.
import { useEffect } from 'react'
import type { LookupResult } from '@/lib/recording'
import { explorerAddress, explorerTx, formatDuration, formatIstanbul, shortAddress } from '@/lib/format'

function Row({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="row">
      <dt>{label}</dt>
      <dd className={mono ? 'm' : undefined}>{children}</dd>
    </div>
  )
}

export function DetailsModal({
  fileName,
  hash,
  result,
  sig,
  onClose,
}: {
  fileName: string
  hash: string
  result: LookupResult
  sig: string | null
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const rec = result.status === 'sealed' ? result.recording : null

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="m-title">
        <div className="m-head">
          <h3 id="m-title">Doğrulama detayları</h3>
          <button className="close" aria-label="Kapat" onClick={onClose}>
            ✕
          </button>
        </div>
        <dl>
          <Row label="Dosya">{fileName}</Row>
          <Row label="SHA-256 (hesaplanan)" mono>
            {hash}
          </Row>
          {rec ? (
            <>
              <Row label="Zincirdeki SHA-256" mono>
                {rec.audioHash} <span className="tag">eşleşti</span>
              </Row>
              <Row label="En geç şu anda vardı (zincir)">
                <b>{formatIstanbul(rec.anchoredAt)}</b>
              </Row>
              <Row label="Cihaz saati (beyan)">{formatIstanbul(rec.recordedAt)}</Row>
              <Row label="İmzalayan cüzdan" mono>
                <a href={explorerAddress(rec.authority)} target="_blank" rel="noreferrer">
                  {shortAddress(rec.authority)}
                </a>
              </Row>
              <Row label="Mühür işlemi" mono>
                {sig ? (
                  <a href={explorerTx(sig)} target="_blank" rel="noreferrer">
                    {shortAddress(sig)}
                  </a>
                ) : (
                  '…'
                )}
              </Row>
              <Row label="Kayıt hesabı (PDA)" mono>
                <a href={explorerAddress(rec.pda)} target="_blank" rel="noreferrer">
                  {shortAddress(rec.pda)}
                </a>
              </Row>
              <Row label="Süre">{formatDuration(rec.durationMs)}</Row>
              <Row label="Konum taahhüdü">
                {rec.hasLocationCommitment ? (
                  <>
                    var <span className="tag">gizli</span>
                  </>
                ) : (
                  <>
                    — <span className="tag">yok</span>
                  </>
                )}
              </Row>
              <Row label="Ağ">Solana devnet</Row>
            </>
          ) : (
            <Row label="Zincir kaydı">
              {result.status === 'invalid'
                ? result.reason
                : 'Bu parmak izine ait bir mühür bulunamadı. Dosya hiç mühürlenmemiş ya da mühürlendikten sonra değiştirilmiş.'}
            </Row>
          )}
        </dl>
        <p className="note">
          Zincir zamanı asıl kanıttır (“en geç şu anda vardı”); cihaz saati imzalayanın beyanıdır. Konum yalnızca
          gizli taahhüt olarak tutulur, açık koordinat saklanmaz.
        </p>
      </div>
    </div>
  )
}
