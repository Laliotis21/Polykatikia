# Polykatoikia Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use godmode:task-runner to implement this plan task-by-task. Parallel agents may execute Agent 1–4 workstreams after Agent 1 schema lands (see Parallel Workstreams).

**Goal:** Ship an integrity-first vertical slice: cents-only money, receipt OCR with mismatch justification, anomaly alerts, audit trail, Inngest jobs, and a five-screen operator dashboard for one management company with many buildings.

**Architecture:** Next.js App Router modular monolith with domain modules (`money`, `ocr`, `anomaly`, `audit`, `alerts`, `transactions`, `dunning`). Prisma + Supabase Postgres/Storage/Auth. Inngest for dunning + admin notify (+ optional async OCR). Resend for email. Zod at API boundaries. OCR via `OcrProvider` (`mock` default).

**Tech Stack:** Next.js (App Router), TypeScript, Prisma, Supabase (Postgres + Storage + Auth), Inngest, Resend, Zod, Vitest, Lucide, Fira Sans / Fira Code, Tailwind CSS (or CSS variables).

**Design reference:** `docs/plans/2026-07-30-polykatoikia-design.md`

**Test posture:** TDD per task (godmode:test-first). DRY. YAGNI. Frequent commits.

---

## Parallel Workstreams (multi-agent split)

| Agent | Owns (folders/files) | Depends on | Must not touch |
|-------|----------------------|------------|----------------|
| **Agent 1 — Scaffold & kernel** | `package.json`, `next.config.*`, `tsconfig.json`, `prisma/schema.prisma`, `prisma/seed.ts`, `src/domain/money/**`, `src/lib/db.ts`, `src/lib/env.ts`, `.env.example`, `vitest.config.ts`, base `src/app/layout.tsx` shell tokens | Nothing (starts first) | OCR adapters, Inngest fns, UI screens beyond layout tokens |
| **Agent 2 — OCR & receipts** | `src/domain/ocr/**`, `src/domain/transactions/mismatch.ts`, `src/app/api/receipts/**`, `src/app/api/transactions/**` (create path + mismatch), `tests/**/ocr*`, `tests/**/mismatch*`, `tests/fixtures/ocr/**` | Agent 1 schema + Money + Prisma client | Anomaly math, Inngest, Resend, UI pages |
| **Agent 3 — Anomaly, alerts, jobs** | `src/domain/anomaly/**`, `src/domain/alerts/**`, `src/domain/audit/**`, `src/domain/dunning/**`, `src/app/api/alerts/**`, `src/inngest/**`, `src/lib/resend.ts`, `tests/**/anomaly*`, `tests/**/alerts*`, `tests/**/inngest*` | Agent 1 schema; coordinates with Agent 2 on `POST /api/transactions` alert hooks (merge carefully) | Receipt Storage upload UI, OCR provider internals |
| **Agent 4 — Operator UI** | `src/app/(dashboard)/**` (5 screens), `src/components/**`, `src/styles/tokens.css` (or Tailwind theme), fonts wiring | Agent 1 tokens/layout; **API types/contracts** from Agents 2–3 (can stub fetch until APIs land) | Prisma schema, domain math, Inngest |

**Merge order:** Agent 1 → merge schema/Money → Agents 2+3+4 in parallel → integration pass on `POST /api/transactions` (mismatch + anomaly + audit in one `$transaction`) → E2E smoke.

**Dependency notes:**
- UI needs API request/response types — Agent 4 may start with Zod schemas duplicated from design or import from `src/lib/api-types.ts` owned by Agent 1 initially.
- Jobs need schema (`Alert`, `DunningNotice`, `User.role`) — Agent 3 blocked until Agent 1 Prisma merge.
- Agent 2 and Agent 3 both touch transaction create — prefer Agent 2 owns route file; Agent 3 exports `evaluateAnomaly` + `createAlert` called from that route.

---

## Phase 0 — Repo bootstrap (Agent 1)

### Task 1: Scaffold Next.js + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.env.example`, `.gitignore`
- Create: `src/app/layout.tsx`, `src/app/page.tsx` (redirect to dashboard later)
- Create: `src/styles/tokens.css`

**Step 1:** Initialize app

```bash
npx create-next-app@latest . --typescript --eslint --app --src-dir --tailwind --import-alias "@/*" --use-npm --turbopack=false
```

Expected: project files present; `npm run build` may pass with default page.

**Step 2:** Add dependencies

```bash
npm install @prisma/client zod @supabase/supabase-js @supabase/ssr inngest resend
npm install -D prisma vitest @vitejs/plugin-react tsx @types/node
```

**Step 3:** `.env.example`

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OCR_PROVIDER=mock
ANOMALY_MARGIN_BPS=3000
RESEND_API_KEY=
RESEND_FROM=noreply@example.com
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

**Step 4:** Design tokens in `src/styles/tokens.css`

```css
:root {
  --primary: #1E3A8A;
  --danger: #DC2626;
  --warning: #D97706;
  --surface: #f8fafc;
  --surface-2: #f1f5f9;
  --ink: #0f172a;
  font-family: "Fira Sans", system-ui, sans-serif;
}
.font-mono-amounts {
  font-family: "Fira Code", ui-monospace, monospace;
}
```

Wire Fira Sans + Fira Code via `next/font/google` or CDN in `layout.tsx`.

**Step 5: Commit**

```bash
git add package.json package-lock.json next.config.ts tsconfig.json vitest.config.ts .env.example .gitignore src/app src/styles
git commit -m "$(cat <<'EOF'
chore: scaffold Next.js app with integrity-slice tooling

EOF
)"
```

---

### Task 2: Prisma schema + Money module (TDD)

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/domain/money/cents.ts`
- Create: `src/domain/money/format.ts`
- Create: `src/domain/money/index.ts`
- Test: `src/domain/money/cents.test.ts`
- Test: `src/domain/money/format.test.ts`
- Create: `src/lib/db.ts`
- Create: `prisma/seed.ts`

**Step 1: Write failing Money tests**

```ts
// src/domain/money/cents.test.ts
import { describe, it, expect } from "vitest";
import { assertCents, addCents, mulBps } from "./cents";

describe("assertCents", () => {
  it("accepts integers", () => {
    expect(assertCents(1250)).toBe(1250);
  });
  it("rejects floats", () => {
    expect(() => assertCents(12.5)).toThrow(/cents/i);
  });
  it("rejects non-finite", () => {
    expect(() => assertCents(NaN)).toThrow();
  });
});

describe("addCents", () => {
  it("sums without float", () => {
    expect(addCents(199, 1)).toBe(200);
  });
});

describe("mulBps", () => {
  it("applies basis points to cents", () => {
    // 10000 cents * 3000 bps = 30% → 3000
    expect(mulBps(10000, 3000)).toBe(3000);
  });
});
```

```ts
// src/domain/money/format.test.ts
import { describe, it, expect } from "vitest";
import { formatEurFromCents } from "./format";

describe("formatEurFromCents", () => {
  it("formats el-GR EUR from cents", () => {
    const s = formatEurFromCents(123456);
    expect(s).toMatch(/1.?234,56/); // thin space / grouping may vary
    expect(s).toMatch(/€/);
  });
});
```

**Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/domain/money
```

Expected: FAIL module not found / exports missing.

**Step 3: Implement Money**

```ts
// src/domain/money/cents.ts
export function assertCents(value: number): number {
  if (!Number.isInteger(value) || !Number.isFinite(value)) {
    throw new Error("Money must be integer cents");
  }
  return value;
}

export function addCents(a: number, b: number): number {
  return assertCents(a) + assertCents(b);
}

/** amountCents * bps / 10000, integer truncation toward zero */
export function mulBps(amountCents: number, bps: number): number {
  assertCents(amountCents);
  if (!Number.isInteger(bps)) throw new Error("bps must be integer");
  return Math.trunc((amountCents * bps) / 10000);
}
```

```ts
// src/domain/money/format.ts
import { assertCents } from "./cents";

export function formatEurFromCents(cents: number, locale = "el-GR"): string {
  assertCents(cents);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
```

**Step 4: Run tests — expect PASS**

```bash
npx vitest run src/domain/money
```

**Step 5: Prisma schema** (models exactly as design)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  OPERATOR
  VIEWER
}

enum TransactionType {
  EXPENSE
  INCOME
  CHARGE
}

enum ReceiptStatus {
  UPLOADED
  PROCESSING
  READY
  FAILED
}

enum AlertType {
  OCR_MISMATCH
  ANOMALY
}

enum AlertSeverity {
  HIGH
}

enum AlertStatus {
  OPEN
  ACKED
  RESOLVED
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(OPERATOR)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  transactions Transaction[] @relation("CreatedBy")
  auditLogs    AuditLog[]
  receipts     Receipt[]     @relation("ReceiptCreator")
  resolvedAlerts Alert[]     @relation("ResolvedBy")
}

model Building {
  id        String   @id @default(cuid())
  name      String
  address   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  apartments   Apartment[]
  transactions Transaction[]
  receipts     Receipt[]
  alerts       Alert[]
  dunningNotices DunningNotice[]
}

model Apartment {
  id         String   @id @default(cuid())
  buildingId String
  building   Building @relation(fields: [buildingId], references: [id])
  label      String
  shareBps   Int
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  owners       ApartmentOwner[]
  transactions Transaction[]
  dunningNotices DunningNotice[]
}

model Owner {
  id        String   @id @default(cuid())
  name      String
  email     String?
  phone     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  apartments ApartmentOwner[]
  dunningNotices DunningNotice[]
}

model ApartmentOwner {
  id          String    @id @default(cuid())
  apartmentId String
  ownerId     String
  apartment   Apartment @relation(fields: [apartmentId], references: [id])
  owner       Owner     @relation(fields: [ownerId], references: [id])
  fromDate    DateTime
  toDate      DateTime?
}

model ExpenseCategory {
  id        String   @id @default(cuid())
  name      String
  code      String?  @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  transactions Transaction[]
}

model Transaction {
  id                     String          @id @default(cuid())
  buildingId             String
  building               Building        @relation(fields: [buildingId], references: [id])
  apartmentId            String?
  apartment              Apartment?      @relation(fields: [apartmentId], references: [id])
  categoryId             String?
  category               ExpenseCategory? @relation(fields: [categoryId], references: [id])
  type                   TransactionType
  amountCents            Int
  description            String?
  occurredAt             DateTime
  receiptId              String?         @unique
  receipt                Receipt?        @relation(fields: [receiptId], references: [id])
  mismatchJustification  String?
  createdById            String
  createdBy              User            @relation("CreatedBy", fields: [createdById], references: [id])
  createdAt              DateTime        @default(now())
  updatedAt              DateTime        @updatedAt
  alerts                 Alert[]
}

model Receipt {
  id             String        @id @default(cuid())
  buildingId     String
  building       Building      @relation(fields: [buildingId], references: [id])
  storagePath    String
  mimeType       String
  ocrAmountCents Int?
  ocrVendor      String?
  ocrRaw         Json?
  status         ReceiptStatus @default(UPLOADED)
  createdById    String
  createdBy      User          @relation("ReceiptCreator", fields: [createdById], references: [id])
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  transaction    Transaction?
}

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String
  actor      User     @relation(fields: [actorId], references: [id])
  action     String
  entityType String
  entityId   String
  payload    Json?
  createdAt  DateTime @default(now())
}

model Alert {
  id            String        @id @default(cuid())
  buildingId    String?
  building      Building?     @relation(fields: [buildingId], references: [id])
  transactionId String?
  transaction   Transaction?  @relation(fields: [transactionId], references: [id])
  type          AlertType
  severity      AlertSeverity @default(HIGH)
  status        AlertStatus   @default(OPEN)
  title         String
  body          String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  resolvedAt    DateTime?
  resolvedById  String?
  resolvedBy    User?         @relation("ResolvedBy", fields: [resolvedById], references: [id])
}

model DunningNotice {
  id          String     @id @default(cuid())
  buildingId  String
  building    Building   @relation(fields: [buildingId], references: [id])
  apartmentId String?
  apartment   Apartment? @relation(fields: [apartmentId], references: [id])
  ownerId     String?
  owner       Owner?     @relation(fields: [ownerId], references: [id])
  amountCents Int
  dueDate     DateTime
  status      String     @default("PENDING")
  sentAt      DateTime?
  createdAt   DateTime   @default(now())
}
```

**Step 6:** `src/lib/db.ts` Prisma singleton; `prisma/seed.ts` with 1 building, apartments with `shareBps`, categories, ADMIN + OPERATOR users.

**Step 7:**

```bash
npx prisma migrate dev --name init
npx prisma db seed
npx vitest run src/domain/money
```

Expected: migrate OK, seed OK, money tests PASS.

**Step 8: Commit**

```bash
git add prisma src/domain/money src/lib/db.ts
git commit -m "$(cat <<'EOF'
feat: add Prisma schema and integer-cents money kernel

EOF
)"
```

---

## Phase 1 — OCR + receipts + mismatch (Agent 2)

### Task 3: OcrProvider + mock

**Files:**
- Create: `src/domain/ocr/types.ts`
- Create: `src/domain/ocr/mock.ts`
- Create: `src/domain/ocr/factory.ts`
- Create: `src/domain/ocr/index.ts`
- Test: `src/domain/ocr/mock.test.ts`
- Create: `tests/fixtures/ocr/sample-receipt.json`

**Step 1: Failing test**

```ts
import { describe, it, expect } from "vitest";
import { MockOcrProvider } from "./mock";

describe("MockOcrProvider", () => {
  it("returns deterministic amountCents", async () => {
    const p = new MockOcrProvider();
    const a = await p.extract({ storagePath: "receipts/a.pdf", mimeType: "application/pdf" });
    const b = await p.extract({ storagePath: "receipts/a.pdf", mimeType: "application/pdf" });
    expect(a.amountCents).toEqual(b.amountCents);
    expect(Number.isInteger(a.amountCents)).toBe(true);
  });
});
```

**Step 2:** Implement interface + mock (hash path → cents in a fixed range, or fixture map). Stub `document_ai` / `textract` modules that throw `not configured` unless env keys set.

**Step 3:** Factory reads `OCR_PROVIDER`.

**Step 4: Commit** `feat: add OcrProvider with mock default`

---

### Task 4: Mismatch domain gate (TDD)

**Files:**
- Create: `src/domain/transactions/mismatch.ts`
- Test: `src/domain/transactions/mismatch.test.ts`

**Step 1: Tests**

```ts
import { describe, it, expect } from "vitest";
import { assertMismatchJustification } from "./mismatch";

describe("assertMismatchJustification", () => {
  it("allows equal amounts without justification", () => {
    expect(() =>
      assertMismatchJustification({ amountCents: 1000, ocrAmountCents: 1000, justification: null })
    ).not.toThrow();
  });
  it("rejects mismatch without justification", () => {
    expect(() =>
      assertMismatchJustification({ amountCents: 1000, ocrAmountCents: 900, justification: null })
    ).toThrow(/justification/i);
  });
  it("rejects short justification", () => {
    expect(() =>
      assertMismatchJustification({
        amountCents: 1000,
        ocrAmountCents: 900,
        justification: "too short",
      })
    ).toThrow(/20/);
  });
  it("accepts justification >= 20 chars on mismatch", () => {
    expect(() =>
      assertMismatchJustification({
        amountCents: 1000,
        ocrAmountCents: 900,
        justification: "Vendor invoice differed after discount applied",
      })
    ).not.toThrow();
  });
  it("skips when ocrAmountCents is null", () => {
    expect(() =>
      assertMismatchJustification({ amountCents: 1000, ocrAmountCents: null, justification: null })
    ).not.toThrow();
  });
});
```

**Step 2:** Implement `needsMismatchJustification` + `assertMismatchJustification` (min length 20).

**Step 3: Commit** `feat: enforce OCR mismatch justification gate`

---

### Task 5: POST /api/receipts

**Files:**
- Create: `src/app/api/receipts/route.ts`
- Create: `src/lib/supabase/server.ts` (storage upload helper)
- Create: `src/lib/auth.ts` (session + role)
- Test: `src/app/api/receipts/route.test.ts` (or integration under `tests/integration/receipts.test.ts`)

**Behavior:**
1. Auth OPERATOR|ADMIN
2. Parse multipart: `file`, `buildingId`
3. Upload to Storage bucket `receipts` → `storagePath`
4. Create Receipt `UPLOADED` then run OCR (mock sync) → update `ocrAmountCents`, `status READY`
5. Optionally emit Inngest `receipts/process` when provider ≠ mock (leave hook; Agent 3 may wire)

**Zod:** response `{ id, ocrAmountCents, status, storagePath }`

**Verify:**

```bash
npx vitest run tests/integration/receipts.test.ts
```

**Commit:** `feat: add receipt upload API with OCR draft`

---

### Task 6: POST /api/transactions (+ GET building txs)

**Files:**
- Create: `src/app/api/transactions/route.ts`
- Create: `src/app/api/buildings/[id]/transactions/route.ts`
- Create: `src/domain/transactions/create.ts`
- Modify: call into anomaly/alert helpers once Agent 3 exports them (use no-op stubs initially)
- Test: `tests/integration/transaction-create.test.ts`

**Create path (integrity):**

```ts
await prisma.$transaction(async (tx) => {
  assertMismatchJustification(...);
  const transaction = await tx.transaction.create({ data: ... });
  await tx.auditLog.create({
    data: {
      actorId,
      action: "TRANSACTION_CREATED",
      entityType: "Transaction",
      entityId: transaction.id,
      payload: { amountCents, type },
    },
  });
  if (mismatch) {
    await tx.alert.create({ /* OCR_MISMATCH HIGH */ });
    await tx.auditLog.create({
      data: { action: "OCR_AMOUNT_OVERRIDE", /* ... */ },
    });
  }
  // anomaly: Agent 3 injects evaluateAnomaly → maybe Alert ANOMALY
  return { transaction, alerts };
});
// after commit: inngest.send notify for each HIGH alert
```

**GET** `/api/buildings/:id/transactions` — VIEWER+; order by `occurredAt` desc.

**Commit:** `feat: create transactions with mismatch audit and alerts`

---

## Phase 2 — Anomaly, alerts, Inngest, Resend (Agent 3)

### Task 7: Anomaly domain (TDD)

**Files:**
- Create: `src/domain/anomaly/trailingAverage.ts`
- Create: `src/domain/anomaly/evaluate.ts`
- Test: `src/domain/anomaly/evaluate.test.ts`

**Logic:**

```ts
// flag if amountCents > avg * (1 + marginBps/10000)
// equiv: amountCents > avg + mulBps(avg, marginBps)
// default marginBps = 3000
// if sampleCount < 3 → { flagged: false, reason: "insufficient_history" }
```

**Tests:** known series avg 10000 cents; amount 14000 with 3000 bps → flagged; 12999 → not flagged (boundary: `>` not `>=`).

**Commit:** `feat: flag expenses over trailing category average`

---

### Task 8: Audit + alerts domain + PATCH API

**Files:**
- Create: `src/domain/audit/write.ts`
- Create: `src/domain/alerts/create.ts`
- Create: `src/domain/alerts/resolve.ts`
- Create: `src/app/api/alerts/[id]/route.ts`
- Test: `tests/integration/alerts.test.ts`

**PATCH body Zod:** `{ status: "ACKED" | "RESOLVED" }` — ADMIN only; write AuditLog `ALERT_ACKED` / `ALERT_RESOLVED`.

**Commit:** `feat: alert ack/resolve API with audit trail`

---

### Task 9: Wire anomaly into transaction create

**Files:**
- Modify: `src/domain/transactions/create.ts` (Agent 2 file — coordinate merge)
- Test: extend `tests/integration/transaction-create.test.ts`

Ensure single `$transaction` still wraps Transaction + AuditLog + Alert(s).

**Commit:** `feat: emit anomaly alerts on oversized expenses`

---

### Task 10: Inngest + Resend

**Files:**
- Create: `src/inngest/client.ts`
- Create: `src/inngest/functions/notify-admin.ts`
- Create: `src/inngest/functions/dunning-daily.ts`
- Create: `src/inngest/functions/receipts-process.ts` (optional)
- Create: `src/app/api/inngest/route.ts`
- Create: `src/lib/resend.ts`
- Create: `src/domain/dunning/generate.ts`
- Test: unit tests with mocked Resend; idempotency key assertions

**Functions:**
- `alerts/notify-admin` — event `alert/created`; idempotency `alert:{id}:notify`
- `dunning/daily` — cron `0 8 * * *`; idempotency `dunning:{buildingId}:{yyyy-mm-dd}`
- `receipts/process` — event `receipt/process`; idempotency `receipt:{id}`

**Commit:** `feat: add Inngest notify, dunning, and optional OCR jobs`

---

## Phase 3 — Operator UI (Agent 4)

### Task 11: Dashboard shell + tokens

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/components/shell/Sidebar.tsx`
- Create: `src/components/shell/TopBar.tsx`
- Modify: `src/styles/tokens.css`, `src/app/layout.tsx` fonts

Data-dense: slate surfaces, primary `#1E3A8A`, Lucide icons, no emoji.

**Commit:** `feat: add operator dashboard shell and design tokens`

---

### Task 12: Five screens

**Files:**
- Create: `src/app/(dashboard)/receipts/upload/page.tsx`
- Create: `src/app/(dashboard)/receipts/[id]/review/page.tsx`
- Create: `src/app/(dashboard)/receipts/[id]/justify/page.tsx`
- Create: `src/app/(dashboard)/buildings/[id]/expenses/page.tsx`
- Create: `src/app/(dashboard)/alerts/page.tsx`
- Create: shared `MoneyText`, `AlertBadge`, `MismatchBanner` components

| Screen | Behavior |
|--------|----------|
| Receipt upload | Dropzone → POST `/api/receipts` → navigate to OCR review |
| OCR review | Show OCR vs editable amount (Fira Code); continue |
| Mismatch justification | If amounts differ, require ≥20 chars; danger `#DC2626`; POST transaction |
| Building expenses | Table from GET transactions; warning badge for anomaly, danger for mismatch |
| Alerts inbox | List alerts; ADMIN ack/resolve → PATCH |

Format all money via `formatEurFromCents` (`el-GR`).

**Commit:** `feat: add five-screen integrity operator UI`

---

## Phase 4 — Integration hardening (any agent / lead)

### Task 13: Full path tests + README

**Files:**
- Create: `tests/integration/integrity-slice.test.ts`
- Create: `README.md` (setup: Supabase local, env, seed, Inngest dev, `OCR_PROVIDER`)

**Coverage checklist:**
- [ ] Money unit tests
- [ ] Mismatch unit tests
- [ ] Anomaly unit tests
- [ ] Integration: tx + audit + OCR alert
- [ ] Integration: tx + anomaly alert
- [ ] Mock OCR fixtures
- [ ] PATCH alert role gate

```bash
npx vitest run
npm run build
```

Expected: all PASS; build succeeds.

**Commit:** `test: cover integrity vertical slice end-to-end`

---

## Verification matrix (done when)

| Criterion | How to verify |
|-----------|---------------|
| Cents only | `assertCents` rejects floats; schema `Int` |
| Mismatch reject | POST tx without justification → 400 |
| Mismatch accept | justification ≥20 → Alert OCR_MISMATCH + Audit OCR_AMOUNT_OVERRIDE |
| Anomaly | amount > avg*(1+0.3) → Alert ANOMALY + Inngest notify |
| UI | 5 screens usable against local API |
| Jobs | `npx inngest-cli@latest dev` delivers notify/dunning |

---

## Execution handoff

Plan complete and saved to `docs/plans/2026-07-30-polykatoikia-implementation.md`.

**Two execution options:**

1. **Delegated Execution (this session)** — dispatch a fresh subagent per task/workstream, review between merges (godmode:delegated-execution)
2. **Separate Session** — new session with godmode:task-runner, batch with checkpoints

**Recommended parallel start:** Land Agent 1 (Tasks 1–2) first, then run Agents 2, 3, and 4 concurrently per the ownership table above.
