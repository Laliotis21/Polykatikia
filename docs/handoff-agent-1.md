# Agent 1 handoff — Scaffold & kernel

## Created

| Area | Paths |
|------|--------|
| App | `package.json`, `vitest.config.ts`, `src/app/{layout,page,globals}.tsx/css`, `src/styles/tokens.css`, `src/middleware.ts` |
| Prisma | `prisma/schema.prisma`, `prisma/seed.ts` |
| Money | `src/domain/money/{cents,format,index}.ts` + `*.test.ts` |
| Lib | `src/lib/{db,env,auth,api-types}.ts` |
| Env/docs | `.env.example`, `README.md`, this file |
| Placeholders | domain/ocr, transactions, anomaly, alerts, audit, dunning; api/receipts, transactions, alerts, buildings; inngest; `(dashboard)`; components; tests |

## Verified locally

- `npx prisma validate`
- `npx vitest run src/domain/money`
- `npm run typecheck` (after `prisma generate`)

## Blockers for full runtime

- **DATABASE_URL** needed for `migrate` / `seed` (Supabase local or hosted). Schema validates without a live DB.
- **Supabase URL + anon/service keys** needed before real Auth/Storage (stub returns `null` session).
- Prisma pinned to **6.x** (plan-compatible `url` in schema; avoid Prisma 7 `prisma.config.ts` until team upgrades).

## Next for parallel agents

### Agent 2 — OCR & receipts
1. Implement `src/domain/ocr/**` (mock default).
2. `src/domain/transactions/mismatch.ts` + tests.
3. `POST /api/receipts`, `POST /api/transactions`, `GET /api/buildings/[id]/transactions`.
4. Wire `src/lib/auth.ts` session via `@supabase/ssr`; use `src/lib/api-types.ts` contracts.
5. Leave anomaly/alert create as injectable stubs until Agent 3 exports land.

### Agent 3 — Anomaly, alerts, jobs
1. `src/domain/anomaly/**`, `alerts/**`, `audit/**`, `dunning/**`.
2. `PATCH /api/alerts/[id]` (ADMIN).
3. `src/inngest/**` + `src/lib/resend.ts` + `/api/inngest`.
4. Export `evaluateAnomaly` + `createAlert` for Agent 2 transaction create merge.

### Agent 4 — Operator UI
1. `src/app/(dashboard)/layout.tsx` shell + 5 screens (stub fetch OK).
2. Components under `src/components/**`; reuse tokens + `formatEurFromCents`.
3. Import contracts from `src/lib/api-types.ts` until live APIs exist.
