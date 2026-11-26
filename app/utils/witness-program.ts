// 2+3: Witness programı istemci yardımcıları — register_recording instruction'ını
// IDL'dan encode eder, PDA'yı türetir, Recording hesabını okur.
// Program ID + IDL: program devnet'e deploy edildi (docs → deploy).
import * as anchor from '@coral-xyz/anchor'
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js'
import idl from '@/idl/witness.json'
import type { Witness } from '@/idl/witness'

export const WITNESS_PROGRAM_ID = new PublicKey(idl.address)
export const RECORDING_SEED = Buffer.from('rec')

export interface RegisterRecordingArgs {
  audioHash: Uint8Array // 32 bayt (dosyanın SHA-256'sı)
  recordedAt: number // telefon saati, unix saniye (beyan)
  durationMs: number
  locationCommitment?: Uint8Array | null // sha256(lat|lon|salt), opsiyonel
}

/** ["rec", audio_hash] seed'inden Recording PDA'sı. */
export function recordingPda(audioHash: Uint8Array): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([RECORDING_SEED, Buffer.from(audioHash)], WITNESS_PROGRAM_ID)
  return pda
}

// İmzasız (read-only) Program: instruction kurmak ve hesap okumak için yeterli;
// imzalama MWA ile ayrı yapılır.
function readonlyProgram(connection: Connection, authority: PublicKey): anchor.Program<Witness> {
  const wallet = {
    publicKey: authority,
    signTransaction: async <T>(tx: T) => tx,
    signAllTransactions: async <T>(txs: T[]) => txs,
  } as unknown as anchor.Wallet
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  return new anchor.Program(idl as Witness, provider)
}

/** register_recording instruction'ını kurar; PDA'yı da döner. İmzalama çağırana ait. */
export async function buildRegisterRecordingIx(
  connection: Connection,
  authority: PublicKey,
  args: RegisterRecordingArgs,
) {
  const program = readonlyProgram(connection, authority)
  const pda = recordingPda(args.audioHash)
  const ix = await program.methods
    .registerRecording(
      Array.from(args.audioHash),
      new anchor.BN(args.recordedAt),
      args.durationMs,
      args.locationCommitment ? Array.from(args.locationCommitment) : null,
    )
    .accountsPartial({ recording: pda, authority, systemProgram: SystemProgram.programId })
    .instruction()
  return { ix, pda }
}

/** Recording PDA'sını okur ve çözer; hesap yoksa null. */
export async function fetchRecording(connection: Connection, pda: PublicKey) {
  const program = readonlyProgram(connection, pda)
  return program.account.recording.fetchNullable(pda)
}
