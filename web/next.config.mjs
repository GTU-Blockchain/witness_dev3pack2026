/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Mobile Wallet Adapter wallets verify the app's identity with Solana's
        // digital-asset-links-android, which requires this exact Content-Type.
        // The default "application/json; charset=utf-8" fails that check, so wallets
        // showed "identity could not be verified".
        source: '/.well-known/assetlinks.json',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
    ]
  },
}

export default nextConfig
