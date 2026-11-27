# Memo fallback `?tx=` contract

If the Anchor program is ever unavailable, the MVP survives through this path. It's a **fallback** — if the program (PDA) path works, this isn't used. Both give the same promise: "this file hasn't changed since the moment it was signed." Shared rules: [`TEKNIK_DOKUMAN.md`](TEKNIK_DOKUMAN.md).

## Definitions

- **Memo program:** `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr` (SPL Memo)
- **Memo text:** exactly `witness:v1:<hash hex>` — `<hash hex>` is the SHA‑256 of the file's raw bytes, 64‑char lowercase hex
- **`<hash>` (in the URL path):** the same hash; `/v/<hash>` already carries it

## App side

If the program isn't deployed, an SPL Memo tx is sent instead of `register_recording`:

- One instruction: `createMemoInstruction("witness:v1:" + hashHex)` (signer = user wallet)
- Sign + send (MWA `signAndSendTransactions`), await confirmation
- The returned **signature** is added to the share link: `/<verify-base>/v/<hashHex>?tx=<signature>`
- (optional) `(hash, tx signature, wallet)` can be stored in Supabase; the web path reads from the signature even without it

Helpers: `app/utils/witness-hash.ts` → `sha256HexOfFile(uri)` and `witnessMemo(hashHex)`.

## Web side — verification steps

URL: `/v/<hash>?tx=<signature>`. Entirely in the browser; the file never goes to a server.

```ts
import { Connection, PublicKey } from "@solana/web3.js"

const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!, "confirmed")

const tx = await connection.getTransaction(signature, {
  maxSupportedTransactionVersion: 0,
  commitment: "confirmed",
})
```

1. **Exists / succeeded:** `tx == null` → ❌ "transaction not found". `tx.meta?.err != null` → ❌ "transaction failed".
2. **Read the memo text** (easiest from the logs):
   ```ts
   const memoLine = tx.meta?.logMessages?.find(l => l.includes("witness:v1:"))
   const memoText = memoLine?.split("Program log: ")[1]?.trim()
   ```
   (Alternative: UTF‑8‑decode the Memo instruction's `data` bytes. Also confirm `MEMO_PROGRAM_ID` is in `accountKeys`.)
3. **Validate format:** if `memoText` doesn't match `^witness:v1:[0-9a-f]{64}$` → ❌ "invalid seal". `hashFromMemo = memoText.slice("witness:v1:".length)`.
4. **Consistency with the URL path:** `hashFromMemo !== <hash>` → ❌ "link is inconsistent".
5. **Compare with the file (the real proof):** when the user uploads the file, `crypto.subtle.digest("SHA-256", bytes)` → lowercase hex. Equal to `hashFromMemo` → **✅**, else **❌ "not that record"**.
6. **Time:** `tx.blockTime` (unix seconds) = the moment it was sealed. Show this (not the phone's clock).
7. **Who sealed it:** fee payer = `tx.transaction.message.getAccountKeys().get(0)` (versioned) or `staticAccountKeys[0]`.

## The only difference from the program path

| | Program (PDA) | Memo fallback |
| --- | --- | --- |
| Input | file only → hash → PDA | file + `?tx=<signature>` |
| Time source | `anchored_at` (PDA field) | `blockTime` |
| Same hash twice | blocked on chain | not blocked (just a log) |
| Footer | "proves unaltered, not true" | same |

The PDA path takes priority; with no `?tx=`, the page uses the normal `/v/<hash>` PDA flow.
