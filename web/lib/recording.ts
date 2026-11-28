// 4: Derives, reads and decodes the Recording PDA. The ✅/❌ verdict rests ONLY on this on-chain account.
// Rules: PDA seeds ["rec", hash32] (docs/TECHNICAL.md → "Solana program").
import { BorshAccountsCoder } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import idl from '@/idl/witness.json'
import { PROGRAM_ID, RPC_URL } from './config'
import { bytesToHex, hexToBytes } from './hash'

const RECORDING_SEED = new TextEncoder().encode('rec')
const coder = new BorshAccountsCoder(idl as any)

export interface RecordingInfo {
  pda: string
  authority: string
  audioHash: string // lowercase hex
  recordedAt: number // phone clock (the signer's claim), unix seconds
  anchoredAt: number // chain time (the actual proof), unix seconds
  durationMs: number
  hasLocationCommitment: boolean // no plain coordinates, only whether a commitment exists
}

export type LookupResult =
  | { status: 'sealed'; recording: RecordingInfo }
  | { status: 'not_found'; pda: string }
  | { status: 'invalid'; pda: string; reason: string }

let connection: Connection | null = null
export function getConnection(): Connection {
  if (!connection) connection = new Connection(RPC_URL, 'confirmed')
  return connection
}

export function recordingPda(hashHex: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([RECORDING_SEED, hexToBytes(hashHex)], PROGRAM_ID)
  return pda
}

function toNum(v: { toString(): string } | number): number {
  return typeof v === 'number' ? v : Number(v.toString())
}

/** Reads the Recording account for a hash from the chain. */
export async function lookupRecording(hashHex: string): Promise<LookupResult> {
  const pda = recordingPda(hashHex)
  const info = await getConnection().getAccountInfo(pda, 'confirmed')
  if (!info) return { status: 'not_found', pda: pda.toBase58() }
  if (!info.owner.equals(PROGRAM_ID)) {
    return { status: 'invalid', pda: pda.toBase58(), reason: 'Account does not belong to the Witness program' }
  }

  let d: any
  try {
    d = coder.decode('Recording', info.data)
  } catch {
    return { status: 'invalid', pda: pda.toBase58(), reason: 'Account could not be decoded as a Recording' }
  }

  const audioHash = bytesToHex(Uint8Array.from(d.audio_hash))
  if (audioHash !== hashHex) {
    return { status: 'invalid', pda: pda.toBase58(), reason: 'The on-chain hash does not match the file' }
  }

  return {
    status: 'sealed',
    recording: {
      pda: pda.toBase58(),
      authority: (d.authority as PublicKey).toBase58(),
      audioHash,
      recordedAt: toNum(d.recorded_at),
      anchoredAt: toNum(d.anchored_at),
      durationMs: toNum(d.duration_ms),
      hasLocationCommitment: d.location_commitment != null,
    },
  }
}

/** Signature of the transaction that created the PDA (the seal): the account's oldest signature. The PDA doesn't store it. */
export async function findSealSignature(pda: string): Promise<string | null> {
  const sigs = await getConnection().getSignaturesForAddress(new PublicKey(pda), { limit: 1000 }, 'confirmed')
  return sigs.length ? sigs[sigs.length - 1].signature : null
}
