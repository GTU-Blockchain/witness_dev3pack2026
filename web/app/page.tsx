import { Verifier } from '@/components/Verifier'

export default function Home() {
  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '48px 16px' }}>
      <h1 style={{ marginTop: 0 }}>Witness</h1>
      <p>
        Bir ses kaydının mühürlendikten sonra değiştirilmediğini doğrulayın. Dosyanın parmak izi tarayıcınızda
        hesaplanır ve doğrudan Solana (devnet) kaydıyla karşılaştırılır.
      </p>
      <Verifier />
    </main>
  )
}
