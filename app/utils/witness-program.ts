// 2+3: Witness programı istemci yardımcıları — register_recording instruction'ını
// IDL'dan encode eder, PDA'yı türetir, Recording hesabını okur.
// Program ID + IDL: program devnet'e deploy edildi (docs → deploy).
import * as anchor from '@coral-xyz/anchor'
import { Connection, PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
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
  const rawIx = await program.methods
    .registerRecording(
      Array.from(args.audioHash),
      new anchor.BN(args.recordedAt),
      args.durationMs,
      args.locationCommitment ? Array.from(args.locationCommitment) : null,
    )
    .accountsPartial({ recording: pda, authority, systemProgram: SystemProgram.programId })
    .instruction()

  // Anchor'ın ürettiği instruction'ı uygulamanın @solana/web3.js tipleriyle yeniden
  // inşa et (temiz PublicKey + Buffer). Böylece compileToLegacyMessage Hermes'te
  // tutarlı çalışır.
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

/** Recording PDA'sını okur ve çözer; hesap yoksa null.
 *  program.account.* namespace'i yerine doğrudan coder kullanıyoruz (RN/Hermes'te
 *  namespace erişimi tutarsız olabiliyor). */
export async function fetchRecording(
  connection: Connection,
  pda: PublicKey,
): Promise<RecordingAccount | null> {
  const info = await connection.getAccountInfo(pda)
  if (!info) return null
  const coder = new anchor.BorshAccountsCoder(idl as Witness)
  return coder.decode('Recording', info.data) as RecordingAccount
}
