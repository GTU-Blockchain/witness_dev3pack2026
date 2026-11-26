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
          Bir dosyanın mühürlendikten sonra değiştirilmediğini doğrulayın. Parmak izi tarayıcınızda hesaplanır,
          dosya hiçbir yere gönderilmez.
        </p>
      </header>

      <Verifier />

      <p className="foot">
        Bu sayfa içeriğin <b>doğru</b> olduğunu değil, mühürlendikten sonra <b>değiştirilmediğini</b> kanıtlar.
      </p>
    </div>
  )
}
