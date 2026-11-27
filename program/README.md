# /program — Witness Anchor program

The program's only job: open a typed, write‑once record account for each file hash that is discoverable *from the hash alone*. Written in Anchor, running on devnet. It gives verification **from the file alone**, protection against sealing the same hash twice, and typed on‑chain data.

**Program ID (devnet):** `2CyjSQFX9pSJV7uTVG8UwvGxeDuRQyWZrfHMd8FZeeYJ`

## Setup

```bash
cd program
yarn install
anchor build
anchor keys sync          # updates declare_id! and Anchor.toml with the real ID
anchor test               # localnet (4 scenarios)
anchor deploy --provider.cluster devnet
```

After deploy, share: `WITNESS_PROGRAM_ID` (into the root `.env.example`) and `target/idl/witness.json` (committed).

## Account: `Recording` — seeds `["rec", audio_hash]`, 126 bytes

```rust
#[account]
pub struct Recording {
    pub authority: Pubkey,                     // sealing wallet
    pub audio_hash: [u8; 32],                  // SHA-256 of the file
    pub recorded_at: i64,                       // phone time (claimed)
    pub anchored_at: i64,                        // Clock::get()?.unix_timestamp (the real proof)
    pub duration_ms: u32,
    pub location_commitment: Option<[u8; 32]>,  // sha256(lat|lon|salt), not raw coordinates
    pub bump: u8,
}
```

## Instruction

`register_recording(audio_hash, recorded_at, duration_ms, location_commitment)` — the sealing wallet (signer + payer) opens the PDA via `init`, writes the fields, takes `anchored_at` from the on‑chain clock, and emits a `RecordingRegistered` event.

- Same hash a second time → fails (`init` on an existing PDA). One record per file, ever.
- `duration_ms == 0` → `InvalidDuration`. Files with no duration (e.g. photos) are sealed with `duration_ms = 1`.

**Read side (web & app):** derive the PDA with `findProgramAddressSync([Buffer.from("rec"), hashBytes], PROGRAM_ID)`. No account → "this file was never sealed"; account present → decode with the Anchor coder.

## Deliberately omitted

No account close (proof can't be deleted), no update instruction (immutability), no admin key, no `attach_transcript`. Upgrade authority stays with the team on devnet; on mainnet the program would be made immutable.
