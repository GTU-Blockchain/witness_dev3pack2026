// Digital Asset Links for the Android app (MWA dApp identity + App Links).
//
// Served from a route handler, not public/: Solana's digital-asset-links-android (used by
// wallets to verify the dApp identity) requires the Content-Type to be EXACTLY
// "application/json". Vercel serves public/ files as "application/json; charset=utf-8"
// and ignores next.config header overrides for them, so wallets reported
// "identity could not be verified". force-dynamic keeps the response coming from this
// function with the header below, instead of a static copy.
export const dynamic = 'force-dynamic'

// Package + SHA-256 of the APK signing certificate (release builds use the debug keystore).
const ASSET_LINKS = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'com.anonymous.app',
      sha256_cert_fingerprints: [
        'FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C',
      ],
    },
  },
]

export function GET() {
  return new Response(JSON.stringify(ASSET_LINKS, null, 2), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
  })
}
