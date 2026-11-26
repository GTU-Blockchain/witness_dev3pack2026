// 4: Hash çapraz testi + CLI doğrulama. Sadece OKUR, zincire yazmaz.
// Kullanım: node scripts/hash-file.mjs <dosya>      (dosyayı hash'ler, PDA'yı kontrol eder)
//           node scripts/hash-file.mjs --hash <hex>  (verilen hash'in PDA'sını kontrol eder)
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { Connection, PublicKey } from '@solana/web3.js'
import anchorPkg from '@coral-xyz/anchor'

const { BorshAccountsCoder } = anchorPkg
const idl = JSON.parse(readFileSync(new URL('../idl/witness.json', import.meta.url)))
const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
const programId = new PublicKey(process.env.NEXT_PUBLIC_WITNESS_PROGRAM_ID || idl.address)

const [arg, val] = process.argv.slice(2)
if (!arg) {
  console.error('Kullanım: node scripts/hash-file.mjs <dosya> | --hash <hex>')
  process.exit(1)
}
const hashHex = arg === '--hash' ? String(val).toLowerCase() : createHash('sha256').update(readFileSync(arg)).digest('hex')
if (!/^[0-9a-f]{64}$/.test(hashHex)) {
  console.error('Geçersiz hash')
  process.exit(1)
}

const [pda] = PublicKey.findProgramAddressSync([Buffer.from('rec'), Buffer.from(hashHex, 'hex')], programId)
console.log('sha256:', hashHex)
console.log('pda:   ', pda.toBase58())

const info = await new Connection(rpc, 'confirmed').getAccountInfo(pda)
if (!info) {
  console.log('result: account NOT found (mühürlenmemiş ya da değiştirilmiş) ❌')
  process.exitCode = 2
} else {
  printRecording(new BorshAccountsCoder(idl).decode('Recording', info.data))
}

function printRecording(d) {
console.log('result: account found ✅')
console.log('authority:  ', d.authority.toBase58())
console.log('anchored_at:', d.anchored_at.toString(), new Date(Number(d.anchored_at) * 1000).toISOString())
console.log('recorded_at:', d.recorded_at.toString())
console.log('duration_ms:', d.duration_ms)
}
