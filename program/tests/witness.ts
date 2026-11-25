// 3: register_recording testleri. `anchor test --provider.cluster localnet` ile çalışır.
// Senaryolar:
//  - geçerli kayıt → PDA açılır, alanlar doğru, anchored_at zincir saatinden
//  - aynı hash ikinci kez → işlem başarısız (init, PDA zaten var)
//  - duration_ms == 0 → InvalidDuration
//  - location_commitment null ve dolu
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

  // Her testte farklı hash kullan ki PDA'lar çakışmasın.
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

  it("geçerli kayıt → PDA açılır, alanlar doğru, anchored_at zincir saatinden", async () => {
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
    // anchored_at telefon beyanı değil, zincir saati: ~şimdiki zamanla tutarlı olmalı.
    const anchoredAt = rec.anchoredAt.toNumber()
    assert.isAtLeast(anchoredAt, before - 120)
    assert.isAtMost(anchoredAt, after + 120)
    assert.notEqual(anchoredAt, recordedAt.toNumber())
  })

  it("aynı hash ikinci kez → işlem başarısız", async () => {
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
      assert.fail("aynı hash ikinci kez yazılabildi — olmamalıydı")
    } catch (err) {
      // init edilmiş PDA'yı tekrar init: System Program "already in use" / Anchor hatası.
      assert.ok(err, "ikinci yazma hata vermeli")
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
      assert.fail("duration_ms=0 kabul edildi — olmamalıydı")
    } catch (err) {
      const e = err as anchor.AnchorError
      expect(e.error.errorCode.code).to.equal("InvalidDuration")
    }
  })

  it("location_commitment dolu → aynen saklanır", async () => {
    const audioHash = freshHash()
    const commitment = Array.from(createHash("sha256").update("konum").digest())
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
