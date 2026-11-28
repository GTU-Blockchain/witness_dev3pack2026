// 4: Web verification config. No secrets; without env it uses devnet + the IDL address.
// Rules: docs/TECHNICAL.md → "Interface contracts".
import { PublicKey } from '@solana/web3.js'
import idl from '@/idl/witness.json'

export const SOLANA_CLUSTER = 'devnet'

export const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'

export const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_WITNESS_PROGRAM_ID || idl.address)

if (PROGRAM_ID.toBase58() !== idl.address) {
  // If the IDL copy and env differ, decoding targets the wrong program; warn early.
  console.warn(`[witness] NEXT_PUBLIC_WITNESS_PROGRAM_ID (${PROGRAM_ID.toBase58()}) != IDL address (${idl.address})`)
}
