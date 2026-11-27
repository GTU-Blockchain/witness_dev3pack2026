// /v/<hash>: share link for one sealed file. Shows the on-chain record without the file,
// then checks a dropped file against the hash in the URL (components/ShareVerifier.tsx).
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShareVerifier } from '@/components/ShareVerifier'
import { isHex64 } from '@/lib/hash'

export const metadata: Metadata = {
  title: 'Witness — Sealed record',
  description: 'Check that a file is the exact one sealed on Solana under this fingerprint.',
}

export default function SharePage({ params }: { params: { hash: string } }) {
  const raw = safeDecode(params.hash).trim()
  // Same fingerprint written in upper case: send it to the canonical lowercase URL.
  const lower = raw.toLowerCase()
  if (lower !== raw && isHex64(lower)) redirect(`/v/${lower}`)

  return (
    <div className="wrap">
      <header>
        <Link href="/" className="brand brand-link">
          <div className="mark">🔏</div>
          <h1>Witness</h1>
        </Link>
        <p>
          Someone shared a sealed file with you. The record below is read straight from Solana. To check that
          your copy is the sealed one, drop it in: it is hashed in your browser and never uploaded.
        </p>
      </header>

      {isHex64(raw) ? <ShareVerifier hash={raw} /> : <InvalidLink value={raw} />}

      <p className="foot">
        This page proves the content was not <b>altered</b> after sealing — not that it is <b>true</b>.
      </p>
    </div>
  )
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return s // malformed %-escape: show it as-is on the "not valid" card
  }
}

function InvalidLink({ value }: { value: string }) {
  return (
    <div className="card">
      <div className="result r-bad">
        <div className="head">
          <div className="badge">✕</div>
          <h2>This link is not valid</h2>
        </div>
        <p className="line">
          A Witness link ends with a 64-character SHA-256 fingerprint (digits 0–9 and letters a–f). This one
          doesn&apos;t, so it was probably cut off or changed when it was copied. Ask the sender for the full link.
        </p>
        <dl className="inline-dl">
          <div className="row">
            <dt>Received ({value.length} characters)</dt>
            <dd className="m">{value || '(empty)'}</dd>
          </div>
        </dl>
        <div className="actions">
          <Link href="/" className="btn-primary btn-link">
            Verify a file instead
          </Link>
        </div>
      </div>
    </div>
  )
}
