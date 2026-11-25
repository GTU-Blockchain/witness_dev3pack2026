# Memo yedeği `?tx=` sözleşmesi

_Rol 2+3 (Cüzdan + program) belirler, Rol 4 (web) uygular. Program devnet'e deploy edilemezse MVP bu yolla ayakta kalır. Ortak kurallar: `docs/TEKNIK_DOKUMAN.md`. Memo formatı: `witness:v1:<hash hex>`._

Program (PDA) yolu çalışıyorsa buna gerek yok; bu yol **yedek**. İkisi de aynı doğrulama vaadini verir: "bu dosya, imza anından sonra değişmedi."

## Tanımlar

- **Memo programı:** `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr` (SPL Memo)
- **Memo metni:** tam olarak `witness:v1:<hash hex>` — `<hash hex>` dosyanın ham baytlarının SHA-256'sı, 64 karakter küçük harf hex
- **`<hash>` (URL yolundaki):** aynı hash; `/v/<hash>` sayfası zaten bununla gelir

## Uygulama tarafı (Rol 2)

Program deploy değilse, `register_recording` yerine SPL Memo işlemi gönderilir:

- Tek instruction: `createMemoInstruction("witness:v1:" + hashHex)` (imzalayan = kullanıcı cüzdanı)
- İmzala + gönder (MWA `signAndSendTransactions`), onay bekle
- Dönen **imza** paylaşım linkine eklenir: `/<verify-base>/v/<hashHex>?tx=<imza>`
- (ekstra) Supabase'e `(hash, tx imza, cüzdan)` yazılabilir; web yoksa da imzadan okur

`hashHex` için: `app/utils/witness-hash.ts` → `sha256HexOfFile(uri)` ve memo metni için `witnessMemo(hashHex)`.

## Web tarafı (Rol 4) — doğrulama adımları

URL: `/v/<hash>?tx=<imza>`. Sayfa tamamen tarayıcıda çalışır; dosya sunucuya gitmez.

```ts
import { Connection, PublicKey } from "@solana/web3.js"

const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!, "confirmed")

const tx = await connection.getTransaction(signature, {
  maxSupportedTransactionVersion: 0,
  commitment: "confirmed",
})
```

1. **İşlem var mı / başarılı mı:** `tx == null` → ❌ "İşlem bulunamadı". `tx.meta?.err != null` → ❌ "İşlem başarısız".
2. **Memo metnini oku:** en kolay yol log'lardan —
   ```ts
   const memoLine = tx.meta?.logMessages?.find(l => l.includes("witness:v1:"))
   // örn: "Program log: witness:v1:adc2ea..."
   const memoText = memoLine?.split("Program log: ")[1]?.trim()
   ```
   (Alternatif: Memo instruction'ının `data` baytlarını UTF-8 decode et. İşlemde Memo programının çağrıldığını `accountKeys` içinde `MEMO_PROGRAM_ID` var mı diye de teyit et.)
3. **Formatı doğrula:** `memoText` `^witness:v1:[0-9a-f]{64}$` kalıbına uymuyorsa → ❌ "Geçersiz mühür". `hashFromMemo = memoText.slice("witness:v1:".length)`.
4. **URL yolu ile tutarlılık:** `hashFromMemo !== <hash>` (yoldaki) → ❌ "Bağlantı tutarsız".
5. **Dosya ile karşılaştır (asıl kanıt):** kullanıcı dosya yükleyince `crypto.subtle.digest("SHA-256", bytes)` → küçük harf hex. Bu hex `hashFromMemo`'ya **eşitse ✅**, değilse **❌ "Bu dosya o kayıt değil"**.
6. **Zaman:** `tx.blockTime` (unix saniye) = zincire mühürlenme anı. Ekranda göster (asıl kanıt budur; telefon saati değil).
7. **Kim mühürledi:** fee payer = `tx.transaction.message.getAccountKeys().get(0)` (versioned) ya da `staticAccountKeys[0]` — mühürleyen cüzdan adresi.

## Program yolu ile tek fark

| | Program (PDA) | Memo yedeği |
| --- | --- | --- |
| Girdi | sadece dosya → hash → PDA | dosya + `?tx=<imza>` |
| Zaman kaynağı | `anchored_at` (PDA alanı) | `blockTime` |
| Aynı hash 2. kez | zincirde engellenir | engellenmez (sadece kayıt) |
| Dipnot | her ekranda: "Bu sayfa içeriğin doğru olduğunu değil, sonradan değiştirilmediğini kanıtlar." | aynı |

PDA yolu önceliklidir; `?tx=` yoksa sayfa normal `/v/<hash>` PDA akışını kullanır.
