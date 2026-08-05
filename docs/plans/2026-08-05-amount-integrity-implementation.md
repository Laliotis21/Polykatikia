# Amount Integrity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use godmode:task-runner to implement this plan task-by-task.

**Goal:** Stop OPERATOR from typing expense amounts — receipt EXPENSE amounts lock to OCR; πάγια amounts are ADMIN-only with OPERATOR activate/pause and idempotent monthly mint.

**Architecture:** Harden `createTransactionWithIntegrity` so receipt-linked EXPENSE must equal `ocrAmountCents` (no mismatch override). Add `RecurringExpense` + mint domain + ADMIN/OPERATOR APIs. Update receipt review UI to confirm/retry only (no amount field). Mint active πάγια into period expenses before κοινόχρηστα preview/finalize.

**Tech Stack:** Next.js App Router, Prisma, Vitest, existing auth (`requireOperator` / new `requireAdmin`), domain modules under `src/domain/`.

**Design reference:** `docs/plans/2026-08-05-amount-integrity-design.md`

**Test posture:** TDD per task (godmode:test-first). DRY. YAGNI. Frequent commits.

---

## Task 1: OCR lock — domain gate (replace mismatch override)

**Files:**
- Modify: `src/domain/transactions/mismatch.ts`
- Modify: `src/domain/transactions/mismatch.test.ts`
- Modify: `src/domain/transactions/create.ts`
- Modify: `src/domain/transactions/index.ts` (exports)

**Step 1: Write failing tests**

In `mismatch.test.ts`, add / replace toward:

```ts
import {
  assertReceiptAmountMatchesOcr,
  ReceiptAmountMismatchError,
  assertReceiptOcrLinkable,
} from "./mismatch";

describe("assertReceiptAmountMatchesOcr", () => {
  it("accepts equal amounts", () => {
    expect(() =>
      assertReceiptAmountMatchesOcr({
        amountCents: 4520,
        ocrAmountCents: 4520,
      }),
    ).not.toThrow();
  });

  it("rejects unequal amounts", () => {
    expect(() =>
      assertReceiptAmountMatchesOcr({
        amountCents: 4500,
        ocrAmountCents: 4520,
      }),
    ).toThrow(ReceiptAmountMismatchError);
  });
});
```

Keep `assertReceiptOcrLinkable` tests. Deprecate or delete tests that assert “accepts justification on mismatch” for expense create policy — either remove `assertMismatchJustification` usage from create path or keep helper only if still used elsewhere (prefer delete unused).

**Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/domain/transactions/mismatch.test.ts
```

Expected: FAIL — `assertReceiptAmountMatchesOcr` not found.

**Step 3: Implement gate**

In `mismatch.ts`:

```ts
export class ReceiptAmountMismatchError extends Error {
  readonly status = 400;
  constructor(message = "amountCents must equal receipt OCR amount") {
    super(message);
    this.name = "ReceiptAmountMismatchError";
  }
}

export function assertReceiptAmountMatchesOcr(input: {
  amountCents: number;
  ocrAmountCents: number;
}): void {
  assertCents(input.amountCents);
  assertCents(input.ocrAmountCents);
  if (input.amountCents !== input.ocrAmountCents) {
    throw new ReceiptAmountMismatchError();
  }
}
```

In `create.ts` when `receiptId` present (after `assertReceiptOcrLinkable`):

- Call `assertReceiptAmountMatchesOcr({ amountCents: input.amountCents, ocrAmountCents: receipt.ocrAmountCents! })`.
- Remove `assertMismatchJustification`, `needsMismatchJustification`, OCR_MISMATCH alert, `OCR_AMOUNT_OVERRIDE` audit, and `mismatchOverride` true path.
- Return `mismatchOverride: false` always (or remove field from result + update callers — prefer keep field as `false` for smaller API churn).
- Stop persisting `mismatchJustification` on receipt-linked creates (leave column nullable for historical rows).

**Step 4: Run tests — expect PASS**

```bash
npx vitest run src/domain/transactions/
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/domain/transactions/
git commit -m "$(cat <<'EOF'
Lock receipt expense amounts to OCR; remove mismatch override path.

EOF
)"
```

---

## Task 2: API — reject amount ≠ OCR on POST /api/transactions

**Files:**
- Modify: `src/app/api/transactions/route.ts` (map `ReceiptAmountMismatchError` → 400)
- Add/adjust: any route tests if present; else manual curl note in verify

**Step 1:** Ensure route catches `ReceiptAmountMismatchError` / `MismatchJustificationError` status and returns JSON `{ error: message }` with 400.

**Step 2: Verify**

```bash
npx vitest run src/domain/transactions/
npm run typecheck
```

Expected: PASS / no type errors.

**Step 3: Commit**

```bash
git add src/app/api/transactions/route.ts
git commit -m "$(cat <<'EOF'
Return 400 when transaction amount differs from receipt OCR.

EOF
)"
```

---

## Task 3: UI — receipt review confirm / retry (no amount field)

**Files:**
- Modify: `src/app/(dashboard)/receipts/[id]/review/page.tsx`
- Modify: `src/components/receipts/MismatchBanner.tsx` (only if still used for review; simplify or remove amount-diff UX)
- Modify: `src/app/(dashboard)/receipts/[id]/justify/page.tsx` — redirect to review with notice, or remove from nav/flows (keep file as redirect stub to avoid broken bookmarks)
- Modify: `src/components/api/operator-api.ts` — `createTransaction` always sends OCR amount when receipt-linked; drop mismatchJustification from happy path

**Step 1: Behavior**

Review page:
- Show OCR amount via `MoneyText` (read-only).
- Category select + optional description.
- Primary: «Επιβεβαίωση & δημιουργία δαπάνης» → POST with `amountCents: draft.ocrAmountCents`.
- Secondary: «Λάθος OCR — νέο ανέβασμα» → link `/receipts/upload`.
- Remove euro amount `<input>` and navigation to justify when amounts differ.

Justify page: client redirect to `/receipts/[id]/review`.

**Step 2: Typecheck**

```bash
npm run typecheck
```

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/receipts/ src/components/receipts/ src/components/api/operator-api.ts
git commit -m "$(cat <<'EOF'
Make receipt review confirm OCR only; drop operator amount entry.

EOF
)"
```

---

## Task 4: Schema — RecurringExpense + Transaction link

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/YYYYMMDDHHMMSS_recurring_expense/migration.sql`

**Step 1: Prisma models**

```prisma
model RecurringExpense {
  id          String   @id @default(cuid())
  buildingId  String
  building    Building @relation(fields: [buildingId], references: [id])
  categoryId  String
  category    ExpenseCategory @relation(fields: [categoryId], references: [id])
  label       String
  amountCents Int
  dayOfMonth  Int      @default(1) // 1–28
  active      Boolean  @default(true)
  createdById String
  createdBy   User     @relation("RecurringExpenseCreator", fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  transactions Transaction[]

  @@index([buildingId, active])
}

// On Transaction add:
recurringExpenseId String?
recurringExpense   RecurringExpense? @relation(fields: [recurringExpenseId], references: [id])
@@unique([recurringExpenseId, /* cannot unique with occurredAt easily */])
```

Idempotency: add

```prisma
@@unique([recurringExpenseId, buildingId, /* use period fields */])
```

Prefer explicit period columns on EXPENSE when minted from recurring:

```prisma
// On Transaction (nullable; set only for recurring mints)
recurringPeriodYear  Int?
recurringPeriodMonth Int?
@@unique([recurringExpenseId, recurringPeriodYear, recurringPeriodMonth])
```

Prisma allows multiple NULLs in unique on Postgres — OK for non-recurring txs.

Wire `Building.recurringExpenses`, `ExpenseCategory.recurringExpenses`, `User` relation.

**Step 2: Migrate**

```bash
npx prisma migrate dev --name recurring_expense
npx prisma generate
```

Expected: migration applied; client generated.

**Step 3: Commit**

```bash
git add prisma/
git commit -m "$(cat <<'EOF'
Add RecurringExpense model and period-unique mint link on Transaction.

EOF
)"
```

---

## Task 5: Domain — mint recurring expenses for period

**Files:**
- Create: `src/domain/recurring/mint.ts`
- Create: `src/domain/recurring/mint.test.ts`
- Create: `src/domain/recurring/index.ts`
- Create: `src/domain/recurring/errors.ts` (optional)

**Step 1: Failing test**

```ts
import { describe, expect, it } from "vitest";
import { planRecurringMints } from "./mint";

describe("planRecurringMints", () => {
  it("plans active templates missing for period", () => {
    const plans = planRecurringMints({
      year: 2026,
      month: 3,
      templates: [
        {
          id: "r1",
          buildingId: "b1",
          categoryId: "c1",
          label: "Κηπουρός",
          amountCents: 15000,
          active: true,
        },
      ],
      alreadyMintedRecurringIds: new Set<string>(),
    });
    expect(plans).toEqual([
      {
        recurringExpenseId: "r1",
        buildingId: "b1",
        categoryId: "c1",
        amountCents: 15000,
        description: "Κηπουρός",
        year: 2026,
        month: 3,
      },
    ]);
  });

  it("skips inactive and already minted", () => {
    const plans = planRecurringMints({
      year: 2026,
      month: 3,
      templates: [
        {
          id: "r1",
          buildingId: "b1",
          categoryId: "c1",
          label: "Κηπουρός",
          amountCents: 15000,
          active: false,
        },
        {
          id: "r2",
          buildingId: "b1",
          categoryId: "c1",
          label: "Θυρωρός",
          amountCents: 80000,
          active: true,
        },
      ],
      alreadyMintedRecurringIds: new Set(["r2"]),
    });
    expect(plans).toEqual([]);
  });
});
```

**Step 2: Implement pure `planRecurringMints` + DB wrapper `mintRecurringExpensesForPeriod(db, { buildingId, year, month, createdById })`** that:

1. Loads active templates for building.
2. Finds existing txs with `recurringExpenseId` + period year/month.
3. Creates missing EXPENSE rows via `createTransactionWithIntegrity` **without** `receiptId`, with `amountCents` from template, set `recurringExpenseId` / period fields (extend create input or create directly in same `$transaction` if create API lacks those fields — prefer extend `CreateTransactionInput` with optional recurring fields).

**Step 3:** Hook call at start of `previewKoinoxrista` / `finalizeKoinoxristaSettlement` in `src/domain/koinoxrista/settle.ts` (mint then load expenses) so πάγια appear in statement.

**Step 4:**

```bash
npx vitest run src/domain/recurring/ src/domain/koinoxrista/
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/domain/recurring/ src/domain/koinoxrista/ src/domain/transactions/create.ts
git commit -m "$(cat <<'EOF'
Mint active πάγια into period expenses before κοινόχρηστα settle.

EOF
)"
```

---

## Task 6: Auth + API for πάγια

**Files:**
- Modify: `src/lib/auth.ts` — add `requireAdmin`
- Create: `src/app/api/buildings/[id]/recurring-expenses/route.ts` (GET list VIEWER+; POST ADMIN)
- Create: `src/app/api/buildings/[id]/recurring-expenses/[rid]/route.ts` (PATCH: ADMIN may change amount/label/day; OPERATOR+ADMIN may set `active` only; reject amount change for OPERATOR)

**Step 1: `requireAdmin`**

```ts
export function requireAdmin(user: SessionUser | null): SessionUser {
  if (!user) throw new AuthError(401, "Unauthorized");
  if (user.role !== "ADMIN") {
    throw new AuthError(403, "Forbidden: ADMIN required");
  }
  return user;
}
```

**Step 2: POST body (ADMIN)**

```ts
{
  categoryId: string;
  label: string;
  amountCents: number; // positive int
  dayOfMonth?: number; // 1–28 default 1
  active?: boolean;
}
```

**Step 3: PATCH body**

- If role OPERATOR: only `{ active: boolean }` allowed; if `amountCents` present → 403.
- If ADMIN: `{ active?, amountCents?, label?, dayOfMonth?, categoryId? }`.

**Step 4: Verify**

```bash
npm run typecheck
```

**Step 5: Commit**

```bash
git add src/lib/auth.ts src/app/api/buildings/
git commit -m "$(cat <<'EOF'
Add recurring-expense APIs with ADMIN amount writes and OPERATOR toggle.

EOF
)"
```

---

## Task 7: UI — building Πάγια page + nav + operator-api

**Files:**
- Create: `src/app/(dashboard)/buildings/[id]/recurring/page.tsx`
- Modify: `src/components/shell/nav.ts` — item «Πάγια»
- Modify: `src/components/api/operator-api.ts` — fetch/create/patch helpers
- Modify: `src/lib/api-types.ts` — `RecurringExpenseItem`

**Behavior:**
- List templates with amount (`MoneyText`), category, active badge.
- OPERATOR: toggle active only.
- ADMIN: form create + edit amount (show only if session role ADMIN — if demo user is OPERATOR, document that seed should include ADMIN or page shows read-only amount with message).
- For demo: upsert seed user `admin@polykatoikia.local` Role.ADMIN if missing.

**Step: Commit**

```bash
git add src/app/\(dashboard\)/buildings/\[id\]/recurring/ src/components/shell/nav.ts src/components/api/operator-api.ts src/lib/api-types.ts
git commit -m "$(cat <<'EOF'
Add building Πάγια UI for ADMIN setup and OPERATOR activate/pause.

EOF
)"
```

---

## Task 8: Seed πάγιο + docs touch-up

**Files:**
- Modify: `prisma/seed.ts` — ADMIN user + one active «Κηπουρός» recurring on Kolonaki
- Modify: `docs/koinoxrista-practice.md` — short note: amounts from OCR or πάγια; no operator typing
- Modify: `docs/plans/2026-07-30-polykatoikia-design.md` — one-line pointer that mismatch override superseded by 2026-08-05 design (optional footer)

**Step:**

```bash
npx prisma db seed
npx vitest run src/domain/transactions/ src/domain/recurring/ src/domain/koinoxrista/
npm run typecheck
```

Expected: PASS.

**Step: Commit**

```bash
git add prisma/seed.ts docs/
git commit -m "$(cat <<'EOF'
Seed Κηπουρός πάγιο and document OCR/πάγια amount sources.

EOF
)"
```

---

## Done when

- [ ] Receipt EXPENSE cannot be created with amount ≠ OCR (domain + API + UI).
- [ ] Justify-mismatch amount flow gone from happy path.
- [ ] ADMIN CRUD amount on RecurringExpense; OPERATOR toggle only.
- [ ] Preview/finalize mints missing active πάγια once per period.
- [ ] Seed demo shows πάγιο; tests green.

---

## Execution options

After this plan is saved:

1. **Delegated Execution (this session)** — fresh subagent per task, review between tasks  
2. **Separate Session** — new chat with task-runner on this plan  

Which approach?
