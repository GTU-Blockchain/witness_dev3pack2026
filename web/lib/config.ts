// 4: Web doğrulama yapılandırması. Gizli değer yok; env yoksa devnet + IDL adresi.
// Kurallar: docs/TECHNICAL.md → "Ortak kurallar" (Program, Paket sürümleri).
import { PublicKey } from '@solana/web3.js'
import idl from '@/idl/witness.json'

export const SOLANA_CLUSTER = 'devnet'

export const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'

export const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_WITNESS_PROGRAM_ID || idl.address)

if (PROGRAM_ID.toBase58() !== idl.address) {
  // IDL kopyası ile env farklıysa decode yanlış programa göre yapılır; erken uyar.
  console.warn(`[witness] NEXT_PUBLIC_WITNESS_PROGRAM_ID (${PROGRAM_ID.toBase58()}) != IDL address (${idl.address})`)
}
