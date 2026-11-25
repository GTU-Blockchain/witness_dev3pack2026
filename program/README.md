# /program: Witness Anchor programı

**Sahibi:** 3 Solana programı · **Bekleyenler:** 2 (uygulama) ve 4 (web) IDL'ı bekler.

## Kurulum

```bash
cd program
yarn install
anchor build
anchor keys sync          # declare_id! ve Anchor.toml'u gerçek ID ile günceller
anchor test               # localnet
anchor deploy --provider.cluster devnet
```

Deploy sonrası paylaşılacaklar: `PROGRAM_ID` (kök `.env.example`'a) ve `target/idl/witness.json` (commit'lenir).

## Sözleşme

- Hesap `Recording`, seed'ler `["rec", audio_hash]`, 126 bayt
- `register_recording(audio_hash, recorded_at, duration_ms, location_commitment)`
- Aynı hash ikinci kez yazılamaz (`init`), `duration_ms == 0` → `InvalidDuration`
- `anchored_at` = `Clock::get()?.unix_timestamp`
- Yok: hesap kapatma, güncelleme, admin, `attach_transcript`

## Memo yedeği

Program 26 Kas öğlene kadar deploy edilemezse: Memo programına `witness:v1:<hash hex>` metni gönderilir, web `?tx=<imza>` ile doğrular.

## Görevler

| Tarih | Görev |
| --- | --- |
| 25 Kas 20:00 | `Recording` + `register_recording` + testler (yapıyı 2 ve 4 onaylasın) |
| 25 Kas 23:00 | Devnet deploy, program ID + IDL paylaş |
| 26 Kas 13:00 | SPL Memo yedek yolu (uygulama + web `?tx=`) |
| 27 Kas | Web'e PDA / Memo okumada destek |
| 28 Kas | README, repo düzeni |
| 29 Kas 19:00 | Program ID + README son hali + gönderim |
