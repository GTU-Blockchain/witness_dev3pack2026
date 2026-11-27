import { Verifier } from '@/components/Verifier'

export default function Home() {
  return (
    <div className="wrap">
      <header>
        <div className="brand">
          <div className="mark">🔏</div>
          <h1>Witness</h1>
        </div>
        <p>
          Verify that a file hasn&apos;t been altered since it was sealed. The fingerprint is computed in your
          browser — the file is never uploaded anywhere.
        </p>
      </header>

      <Verifier />

      <p className="foot">
        This page proves the content was not <b>altered</b> after sealing — not that it is <b>true</b>.
      </p>
    </div>
  )
}
