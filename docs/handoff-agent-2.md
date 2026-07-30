# Agent 2 handoff — OCR & receipts

## Created

| Area | Paths |
|------|--------|
| OCR | `src/domain/ocr/{types,mock,document-ai,textract,factory,index}.ts` + `mock.test.ts` |
| Fixtures | `tests/fixtures/ocr/sample-receipt.json` |
| Mismatch | `src/domain/transactions/{mismatch,create,index}.ts` + `mismatch.test.ts` |
| APIs | `POST /api/receipts`, `POST /api/transactions`, `GET /api/buildings/[id]/transactions` |
| Storage | `src/lib/storage.ts` (Supabase Storage if service role set; else `.data/receipts/`) |
| Auth | `src/lib/auth.ts` (Supabase SSR → Prisma User by email); `src/middleware.ts` cookie refresh |
| Contracts | `src/lib/api-types.ts` — receipt/tx + UI list types for Agent 4 |

## Integration with Agent 3 (already landed)

Agent 3 modules were present during merge. Agent 2 **adapted** to their contracts (no stub overwrite):

| Export | Usage in `createTransactionWithIntegrity` |
|--------|---------------------------------------------|
| `appendAuditLog(input, tx)` | `before`/`after` payload shape |
| `createAlert(input, tx)` | `enqueueNotify: false` inside `$transaction` |
| `sendAlertNotifyEvent(alertId)` | after commit for each created alert |
| `evaluateExpenseAnomalyForBuilding(tx, …)` | EXPENSE + `categoryId` present; checks `isAnomaly` |

Pure `evaluateExpenseAnomaly({ amountCents, priorAmountCents })` is Agent 3 unit-test API; create path uses the DB-backed helper.

## Integrity behavior

1. **Mismatch gate** — `amountCents !== receipt.ocrAmountCents` (OCR present) → require justification ≥ 20 chars, else 400.
2. **On override** — `OCR_MISMATCH` HIGH alert + `OCR_AMOUNT_OVERRIDE` audit inside same `$transaction`.
3. **Anomaly** — via Agent 3 `evaluateExpenseAnomalyForBuilding`; on flag → `ANOMALY` alert.
4. **Money** — `assertCents`; no floats.
5. **Roles** — upload/create: OPERATOR\|ADMIN; list: VIEWER+.

## OCR

- `OCR_PROVIDER=mock` (default): fixtures + deterministic hash cents.
- `document_ai` / `textract`: throw `"not configured"`.
- Fixture `receipts/fixture-known.pdf` → 4520¢ / ΔΕΗ / 2026-01-15 / 0.97.

## API shapes (Agent 4)

**POST /api/receipts** →
`{ receiptId, id, buildingId, ocrAmountCents, ocrVendor, ocrDate, confidence, status, storagePath }`

**POST /api/transactions** →
`{ transaction: { id, amountCents, type, buildingId, receiptId, mismatchJustification, occurredAt }, alerts, anomalyFired }`

Without Supabase public keys, `getSessionUser()` → `null` → 401.

## Verified

- `npx vitest run src/domain/ocr src/domain/transactions src/domain/money`
- `npm run typecheck`
