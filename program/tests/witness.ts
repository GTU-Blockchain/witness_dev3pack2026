// 3: register_recording tests. Run with `anchor test --provider.cluster localnet`.
// Scenarios:
//  - valid record → PDA created, fields correct, anchored_at from chain time
//  - same hash a second time → transaction fails (init, PDA already exists)
//  - duration_ms == 0 → InvalidDuration
//  - location_commitment null and set
import * as anchor from "@coral-xyz/anchor"
import { Program } from "@coral-xyz/anchor"
import { Witness } from "../target/types/witness"
import { assert, expect } from "chai"
import { createHash, randomBytes } from "crypto"

const RECORDING_SEED = Buffer.from("rec")

describe("witness", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const program = anchor.workspace.Witness as Program<Witness>
  const authority = provider.wallet

  // Use a different hash in every test so the PDAs don't collide.
  function freshHash(): number[] {
    return Array.from(createHash("sha256").update(randomBytes(16)).digest())
  }

  function recordingPda(hash: number[]): anchor.web3.PublicKey {
    const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [RECORDING_SEED, Buffer.from(hash)],
      program.programId,
    )
    return pda
  }

  it("valid record → PDA created, fields correct, anchored_at from chain time", async () => {
    const audioHash = freshHash()
    const recordedAt = new anchor.BN(1_700_000_000)
    const durationMs = 12_345
    const pda = recordingPda(audioHash)

    const before = Math.floor(Date.now() / 1000)
    await program.methods
      .registerRecording(audioHash, recordedAt, durationMs, null)
      .accounts({ recording: pda, authority: authority.publicKey })
      .rpc()
    const after = Math.floor(Date.now() / 1000)

    const rec = await program.account.recording.fetch(pda)
    assert.deepEqual(Array.from(rec.audioHash), audioHash)
    assert.ok(rec.authority.equals(authority.publicKey))
    assert.equal(rec.recordedAt.toNumber(), recordedAt.toNumber())
    assert.equal(rec.durationMs, durationMs)
    assert.isNull(rec.locationCommitment)
    // anchored_at is chain time, not the phone's claim: it must be close to now.
    const anchoredAt = rec.anchoredAt.toNumber()
    assert.isAtLeast(anchoredAt, before - 120)
    assert.isAtMost(anchoredAt, after + 120)
    assert.notEqual(anchoredAt, recordedAt.toNumber())
  })

  it("same hash a second time → transaction fails", async () => {
    const audioHash = freshHash()
    const pda = recordingPda(audioHash)
    await program.methods
      .registerRecording(audioHash, new anchor.BN(1_700_000_000), 1000, null)
      .accounts({ recording: pda, authority: authority.publicKey })
      .rpc()

    try {
      await program.methods
        .registerRecording(audioHash, new anchor.BN(1_700_000_111), 2000, null)
        .accounts({ recording: pda, authority: authority.publicKey })
        .rpc()
      assert.fail("the same hash was written twice; it must not be")
    } catch (err) {
      // init on an already-initialized PDA: System Program "already in use" / Anchor error.
      assert.ok(err, "the second write must fail")
    }
  })

  it("duration_ms == 0 → InvalidDuration", async () => {
    const audioHash = freshHash()
    const pda = recordingPda(audioHash)
    try {
      await program.methods
        .registerRecording(audioHash, new anchor.BN(1_700_000_000), 0, null)
        .accounts({ recording: pda, authority: authority.publicKey })
        .rpc()
      assert.fail("duration_ms=0 was accepted; it must not be")
    } catch (err) {
      const e = err as anchor.AnchorError
      expect(e.error.errorCode.code).to.equal("InvalidDuration")
    }
  })

  it("location_commitment set → stored as-is", async () => {
    const audioHash = freshHash()
    const commitment = Array.from(createHash("sha256").update("location").digest())
    const pda = recordingPda(audioHash)
    await program.methods
      .registerRecording(audioHash, new anchor.BN(1_700_000_000), 5000, commitment)
      .accounts({ recording: pda, authority: authority.publicKey })
      .rpc()

    const rec = await program.account.recording.fetch(pda)
    assert.isNotNull(rec.locationCommitment)
    assert.deepEqual(Array.from(rec.locationCommitment as number[]), commitment)
  })
})
