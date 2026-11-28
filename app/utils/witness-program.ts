// 2+3: Witness program client helpers: encodes the register_recording instruction from the IDL,
// derives the PDA, reads the Recording account.
// Program ID + IDL: the program is deployed to devnet (docs → deploy).
import * as anchor from '@coral-xyz/anchor'
import { Connection, PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import idl from '@/idl/witness.json'
import type { Witness } from '@/idl/witness'

export const WITNESS_PROGRAM_ID = new PublicKey(idl.address)
export const RECORDING_SEED = Buffer.from('rec')

export interface RegisterRecordingArgs {
  audioHash: Uint8Array // 32 bytes (the file's SHA-256)
  recordedAt: number // phone clock, unix seconds (the signer's claim)
  durationMs: number
  locationCommitment?: Uint8Array | null // sha256(lat|lon|salt), optional
}

/** The Recording PDA from the ["rec", audio_hash] seeds. */
export function recordingPda(audioHash: Uint8Array): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([RECORDING_SEED, Buffer.from(audioHash)], WITNESS_PROGRAM_ID)
  return pda
}

// Read-only Program (no signer): enough to build instructions and read accounts;
// signing happens separately through MWA.
function readonlyProgram(connection: Connection, authority: PublicKey): anchor.Program<Witness> {
  const wallet = {
    publicKey: authority,
    signTransaction: async <T>(tx: T) => tx,
    signAllTransactions: async <T>(txs: T[]) => txs,
  } as unknown as anchor.Wallet
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  return new anchor.Program(idl as Witness, provider)
}

/** Builds the register_recording instruction and returns the PDA too. Signing is up to the caller. */
export async function buildRegisterRecordingIx(
  connection: Connection,
  authority: PublicKey,
  args: RegisterRecordingArgs,
) {
  const program = readonlyProgram(connection, authority)
  const pda = recordingPda(args.audioHash)
  const rawIx = await program.methods
    .registerRecording(
      Array.from(args.audioHash),
      new anchor.BN(args.recordedAt),
      args.durationMs,
      args.locationCommitment ? Array.from(args.locationCommitment) : null,
    )
    .accountsPartial({ recording: pda, authority, systemProgram: SystemProgram.programId })
    .instruction()

  // Rebuild Anchor's instruction with the app's own @solana/web3.js types (clean PublicKey +
  // Buffer), so compileToLegacyMessage behaves consistently on Hermes.
  const ix = new TransactionInstruction({
    programId: new PublicKey(rawIx.programId.toBytes()),
    keys: rawIx.keys.map((k) => ({
      pubkey: new PublicKey(k.pubkey.toBytes()),
      isSigner: k.isSigner,
      isWritable: k.isWritable,
    })),
    data: Buffer.from(rawIx.data),
  })
  return { ix, pda }
}

export interface RecordingAccount {
  authority: PublicKey
  audioHash: number[]
  recordedAt: anchor.BN
  anchoredAt: anchor.BN
  durationMs: number
  locationCommitment: number[] | null
  bump: number
}

/** Reads and decodes the Recording PDA; null if the account doesn't exist.
 *  Uses the coder directly instead of the program.account.* namespace (namespace access
 *  can be inconsistent on RN/Hermes). */
export async function fetchRecording(
  connection: Connection,
  pda: PublicKey,
): Promise<RecordingAccount | null> {
  const info = await connection.getAccountInfo(pda)
  if (!info) return null
  const coder = new anchor.BorshAccountsCoder(idl as Witness)
  return coder.decode('Recording', info.data) as RecordingAccount
}
