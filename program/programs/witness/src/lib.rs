//! Witness programı: her ses hash'i için bir kez yazılabilen `Recording` PDA'sı.
//! Kaynak: docs/TECHNICAL.md → "Solana programı".
//! Bilerek yok: hesap kapatma, güncelleme, admin anahtarı, attach_transcript.
use anchor_lang::prelude::*;

// 3: deploy öncesi `anchor keys sync` ile güncelle.
declare_id!("2CyjSQFX9pSJV7uTVG8UwvGxeDuRQyWZrfHMd8FZeeYJ");

pub const RECORDING_SEED: &[u8] = b"rec";

#[program]
pub mod witness {
    use super::*;

    pub fn register_recording(
        ctx: Context<RegisterRecording>,
        audio_hash: [u8; 32],
        recorded_at: i64,
        duration_ms: u32,
        location_commitment: Option<[u8; 32]>,
    ) -> Result<()> {
        require!(duration_ms > 0, WitnessError::InvalidDuration);

        let anchored_at = Clock::get()?.unix_timestamp;
        let rec = &mut ctx.accounts.recording;
        rec.authority = ctx.accounts.authority.key();
        rec.audio_hash = audio_hash;
        rec.recorded_at = recorded_at;
        rec.anchored_at = anchored_at;
        rec.duration_ms = duration_ms;
        rec.location_commitment = location_commitment;
        rec.bump = ctx.bumps.recording;

        emit!(RecordingRegistered {
            authority: rec.authority,
            audio_hash,
            anchored_at,
            duration_ms,
        });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(audio_hash: [u8; 32])]
pub struct RegisterRecording<'info> {
    // `init`: PDA zaten varsa işlem başarısız olur → aynı hash ikinci kez yazılamaz.
    #[account(
        init,
        payer = authority,
        space = Recording::SPACE,
        seeds = [RECORDING_SEED, audio_hash.as_ref()],
        bump
    )]
    pub recording: Account<'info, Recording>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Recording {
    pub authority: Pubkey,                     // kaydeden cüzdan
    pub audio_hash: [u8; 32],                  // dosyanın SHA-256'sı
    pub recorded_at: i64,                      // telefon saati (beyan)
    pub anchored_at: i64,                      // zincir saati (asıl kanıt)
    pub duration_ms: u32,
    pub location_commitment: Option<[u8; 32]>, // sha256(lat|lon|salt), açık koordinat değil
    pub bump: u8,
}

impl Recording {
    // 8 (discriminator) + 32 + 32 + 8 + 8 + 4 + 33 + 1 = 126 bayt
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 8 + 4 + (1 + 32) + 1;
}

#[event]
pub struct RecordingRegistered {
    pub authority: Pubkey,
    pub audio_hash: [u8; 32],
    pub anchored_at: i64,
    pub duration_ms: u32,
}

#[error_code]
pub enum WitnessError {
    #[msg("duration_ms 0 olamaz")]
    InvalidDuration,
}
