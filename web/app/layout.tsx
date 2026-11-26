import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Witness — Doğrulama',
  description: 'Ses kaydının mühürlendikten sonra değişmediğini kanıtlar.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        {/* Gövde metni hemen lazım; ilk boyamada yazı tipi değişimini azaltır */}
        <link rel="preload" href="/fonts/google-sans-flex-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>{children}</body>
    </html>
  )
}
