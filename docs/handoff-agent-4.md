# Agent 4 handoff — Operator UI

## Routes created

| Route | Screen |
|-------|--------|
| `/(dashboard)` → `/` | Redirect to `/receipts/upload` |
| `/receipts/upload` | Receipt dropzone + building select + processing CTA |
| `/receipts/[id]/review` | OCR fields + editable operator amount (Fira Code / `formatEurFromCents`) |
| `/receipts/[id]/justify` | Mismatch justification ≥20 chars; primary CTA disabled until valid; danger styling |
| `/buildings/[id]/expenses` | Transaction ledger table; type filter stub; mismatch/anomaly badges |
| `/alerts` | Alerts inbox; severity-sorted; ack/resolve; link to related ledger |

Also: root `/` links to the operator dashboard (does not break layout tokens).

## Components

| Path | Purpose |
|------|---------|
| `src/components/shell/{Sidebar,TopBar}.tsx` | Dashboard shell |
| `src/components/api/operator-api.ts` | Typed fetch wrappers; seed building fallback; “API pending” empty states |
| `src/components/money/{MoneyText,parseEurInput}.tsx/ts` | Display via domain formatter; integer-safe EUR→cents input parse |
| `src/components/alerts/AlertBadge.tsx` | Danger/warning badges |
| `src/components/receipts/MismatchBanner.tsx` | Danger mismatch callout |
| `src/components/ui/{EmptyState,LoadingState,PageHeader}.tsx` | Shared chrome |

## Design notes

- Tokens: navy `#1E3A8A`, slate surfaces, Fira Sans/Code, Lucide only, no emoji
- Touch targets ≥44px (`min-h-11`); focus-visible outlines on controls
- Money never displayed via float formatting — only `formatEurFromCents`
- When APIs 404/501/unreachable: empty lists + **API pending** (seed building for upload select)

## Verified

- `npm run typecheck` — pass (after aligning to live `src/lib/api-types.ts` from Agents 2/3)

## Dependencies added

- `lucide-react`

## Not owned / left alone

- Prisma, domain OCR/anomaly/transactions/alerts/audit/dunning, Inngest, API route handlers
- Did not commit parallel Agent 2/3 files

## Next for integration

1. Wire live `GET /api/buildings` (optional; seed fallback works).
2. Confirm `POST /api/receipts` returns `CreateReceiptResponse` including `buildingId` / `receiptId`.
3. `GET /api/receipts/:id` for review after refresh (session draft covers same-tab flow).
4. Alerts list currently calls `GET /api/alerts` — ensure Agent 3 exposes it (or UI stays on pending empty).
5. E2E smoke: upload → review → justify → expenses → alerts ack.
