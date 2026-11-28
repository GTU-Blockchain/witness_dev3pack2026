// Calls register_recording on devnet with the deployer keypair and checks the PDA
// (a wallet-free check that the program works). Run: node scripts/register-recording-devnet.mjs
// The keypair is only READ from a file (~/.config/solana/id.json); no secret is embedded.
import anchorPkg from '@coral-xyz/anchor'
const { Wallet, AnchorProvider, Program, BN } = anchorPkg
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { createHash, randomBytes } from 'node:crypto'

const idl = JSON.parse(readFileSync(new URL('../idl/witness.json', import.meta.url)))
const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
const secret = JSON.parse(readFileSync(`${homedir()}/.config/solana/id.json`))
const wallet = new Wallet(Keypair.fromSecretKey(Uint8Array.from(secret)))
const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
const program = new Program(idl, provider)

const audioHash = Array.from(createHash('sha256').update(randomBytes(16)).digest())
const [pda] = PublicKey.findProgramAddressSync([Buffer.from('rec'), Buffer.from(audioHash)], program.programId)
const recordedAt = Math.floor(Date.now() / 1000)

console.log('program:', program.programId.toString())
console.log('authority:', wallet.publicKey.toString())
console.log('pda:', pda.toString())

const sig = await program.methods
  .registerRecording(audioHash, new BN(recordedAt), 12_345, null)
  .accountsPartial({ recording: pda, authority: wallet.publicKey, systemProgram: SystemProgram.programId })
  .rpc()
console.log('tx:', sig)

const rec = await program.account.recording.fetch(pda)
console.log('--- PDA read ---')
console.log('authority:', rec.authority.toString())
console.log('audio_hash matches:', Buffer.from(rec.audioHash).equals(Buffer.from(audioHash)))
console.log('recorded_at (claimed):', rec.recordedAt.toString())
console.log('anchored_at (chain):', rec.anchoredAt.toString())
console.log('duration_ms:', rec.durationMs)
console.log('location_commitment:', rec.locationCommitment)
