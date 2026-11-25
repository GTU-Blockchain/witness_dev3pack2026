import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Witness — Doğrulama',
  description: 'Ses kaydının mühürlendikten sonra değişmediğini kanıtlar.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>{children}</body>
    </html>
  )
}
