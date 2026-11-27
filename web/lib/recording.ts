// 4: Recording PDA'sını türetir, okur, çözer. ✅/❌ kararı SADECE zincirdeki bu hesaba dayanır.
// Kurallar: PDA seed'leri ["rec", hash32] (docs/TECHNICAL.md → Solana programı / Okuma tarafı).
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
  audioHash: string // küçük harf hex
  recordedAt: number // telefon saati (beyan), unix sn
  anchoredAt: number // zincir saati (asıl kanıt), unix sn
  durationMs: number
  hasLocationCommitment: boolean // açık koordinat yok, sadece commitment var/yok
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

/** Hash'e ait Recording hesabını zincirden okur. */
export async function lookupRecording(hashHex: string): Promise<LookupResult> {
  const pda = recordingPda(hashHex)
  const info = await getConnection().getAccountInfo(pda, 'confirmed')
  if (!info) return { status: 'not_found', pda: pda.toBase58() }
  if (!info.owner.equals(PROGRAM_ID)) {
    return { status: 'invalid', pda: pda.toBase58(), reason: 'Hesap Witness programına ait değil' }
  }

  let d: any
  try {
    d = coder.decode('Recording', info.data)
  } catch {
    return { status: 'invalid', pda: pda.toBase58(), reason: 'Hesap Recording olarak çözülemedi' }
  }

  const audioHash = bytesToHex(Uint8Array.from(d.audio_hash))
  if (audioHash !== hashHex) {
    return { status: 'invalid', pda: pda.toBase58(), reason: 'Zincirdeki hash dosyanınkiyle eşleşmiyor' }
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

/** PDA'yı açan (mühürleme) işlemin imzası: hesabın en eski imzası. PDA tx imzasını saklamaz. */
export async function findSealSignature(pda: string): Promise<string | null> {
  const sigs = await getConnection().getSignaturesForAddress(new PublicKey(pda), { limit: 1000 }, 'confirmed')
  return sigs.length ? sigs[sigs.length - 1].signature : null
}
