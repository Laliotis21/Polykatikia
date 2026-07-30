# Security fixes handoff (cavecrew-review)

Brief map of finding → fix. Integer-cents contracts and Agent 2/3
`enqueueNotify: false` in-tx → notify after commit are preserved.

| # | Finding | Fix |
|---|---------|-----|
| 1 | Receipt upload trusts `file.type` | `validateReceiptBytes` / `sniffReceiptMime` (pdf/jpeg/png/webp) + `MAX_RECEIPT_BYTES` (10MB) in `src/lib/storage.ts`; `POST /api/receipts` rejects before storage |
| 2 | HIGH alert notify empty-caught | After outer commit, `sendAlertNotifyEvent`; on failure `appendAuditLog(NOTIFY_FAILED)` then **rethrow** (`src/domain/transactions/create.ts`) |
| 3 | `createAlert` default notify | Default `enqueueNotify: false`; `shouldEnqueueAlertNotify` never true for TransactionClient (`src/domain/alerts/create.ts`) |
| 4 | Nested TransactionClient notify | Notify only when call owns `$transaction` (`notifiedAfterCommit`); nested callers must notify after outermost commit |
| 5 | Null OCR bypass | `assertReceiptOcrLinkable`: linked receipt must be `READY` + non-null `ocrAmountCents` |
| 6 | Dunning marks sent on fail | `markDunningNoticeSent` only when `sendResult.sent === true` |
| 7 | Inngest signing in prod | `INNGEST_SIGNING_KEY` required when `NODE_ENV=production` (`src/lib/env.ts`) |
| 8 | Storage path traversal | `assertSafeBuildingId` (cuid pattern; reject `/` `..` `\0` `\`) + resolve-under-root check |
| 9 | Dashboard unauth | Middleware redirects unauthenticated users from `/receipts` `/alerts` `/buildings`; dashboard layout also `getSessionUser` + redirect `/`. Marketing `/` stays public. |

## Tests added/updated

- `src/lib/storage.test.ts` — sanitize + sniff + size
- `src/lib/env.test.ts` — production signing key
- `src/domain/alerts/create.test.ts` — default / tx notify gate
- `src/domain/transactions/mismatch.test.ts` — READY + OCR amount

## Verify

```bash
npm test && npm run typecheck
```
