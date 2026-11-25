// Witness Memo yedeği — CLI kanıtı.
// Dosyanın SHA-256'sını `witness:v1:<hash>` formatında SPL Memo olarak devnet'e yazar.
// Çalıştırma: node scripts/send-witness-memo.mjs [hash-hex]
// Anahtar: ~/.config/solana/id.json (deploy/dev cüzdanı)
import { Connection, Keypair, Transaction, clusterApiUrl } from '@solana/web3.js'
import { createMemoInstruction } from '@solana/spl-memo'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const hashHex = process.argv[2] ?? '0'.repeat(64)
if (!/^[0-9a-f]{64}$/.test(hashHex)) {
  console.error('Hash 64 karakter küçük harf hex olmalı')
  process.exit(1)
}

const secret = JSON.parse(readFileSync(join(homedir(), '.config/solana/id.json'), 'utf8'))
const payer = Keypair.fromSecretKey(Uint8Array.from(secret))
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')

const memo = `witness:v1:${hashHex}`
const tx = new Transaction().add(createMemoInstruction(memo))

console.log('Cüzdan :', payer.publicKey.toBase58())
console.log('Memo   :', memo)
const sig = await connection.sendTransaction(tx, [payer])
await connection.confirmTransaction(sig, 'confirmed')
console.log('İmza   :', sig)
console.log('Explorer:', `https://explorer.solana.com/tx/${sig}?cluster=devnet`)
