import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Witness — Verification',
  description: "Proves a file hasn't changed since it was sealed.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Body text is needed right away; reduces the font swap on first paint (local file, no external request) */}
        <link rel="preload" href="/fonts/google-sans-flex-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>{children}</body>
    </html>
  )
}
