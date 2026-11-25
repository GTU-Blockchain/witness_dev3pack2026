export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px' }}>
      <h1>Witness</h1>
      <p>
        Bir ses kaydının mühürlendikten sonra değiştirilmediğini kanıtlar. Doğrulama sayfası (dosya
        yükle → tarayıcıda hash → zincirle karşılaştır) yapım aşamasında.
      </p>
      <p style={{ color: '#666', fontSize: 14 }}>
        Bu sayfa içeriğin doğru olduğunu değil, sonradan değiştirilmediğini kanıtlar.
      </p>
    </main>
  )
}
