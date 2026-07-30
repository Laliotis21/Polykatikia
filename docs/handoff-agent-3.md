# Agent 3 handoff — Anomaly, alerts, audit, dunning, Inngest

## Created / owned

| Area | Paths |
|------|--------|
| Anomaly | `src/domain/anomaly/{trailingAverage,evaluate,history,index}.ts` + `evaluate.test.ts` |
| Audit | `src/domain/audit/{write,index}.ts` + `write.test.ts` |
| Alerts | `src/domain/alerts/{create,resolve,index}.ts` |
| Dunning | `src/domain/dunning/{generate,index}.ts` + `generate.test.ts` |
| Resend | `src/lib/resend.ts` |
| Inngest | `src/inngest/{client,events,index}.ts`, `functions/{notify-admin,dunning-daily,receipts-process}.ts`, `events.test.ts` |
| API | `GET /api/alerts`, `PATCH /api/alerts/[id]`, `GET|POST|PUT /api/inngest` |

## Stable exports (Agent 2)

```ts
import {
  evaluateExpenseAnomaly,          // pure math
  evaluateAnomaly,                 // alias
  evaluateExpenseAnomalyForBuilding, // DB-backed trailing 12-mo
} from "@/domain/anomaly";

import { appendAuditLog } from "@/domain/audit";

import {
  createAlert,
  listOpenAlerts,
  ackOrResolveAlert,
  sendAlertNotifyEvent,            // re-export
} from "@/domain/alerts";
```

### Transaction create merge pattern

```ts
await prisma.$transaction(async (tx) => {
  const transaction = await tx.transaction.create({ data: ... });

  await appendAuditLog({
    actorId,
    action: "TRANSACTION_CREATED",
    entityType: "Transaction",
    entityId: transaction.id,
    after: { amountCents, type },
  }, tx);

  const alertIds: string[] = [];

  if (mismatch) {
    const a = await createAlert({
      type: "OCR_MISMATCH",
      title: "OCR amount override",
      buildingId,
      transactionId: transaction.id,
      enqueueNotify: false, // ← inside $transaction
    }, tx);
    alertIds.push(a.id);
    await appendAuditLog({
      actorId,
      action: "OCR_AMOUNT_OVERRIDE",
      entityType: "Transaction",
      entityId: transaction.id,
      before: { ocrAmountCents },
      after: { amountCents, mismatchJustification },
    }, tx);
  }

  if (type === "EXPENSE" && categoryId) {
    const anomaly = await evaluateExpenseAnomalyForBuilding(tx, {
      buildingId,
      categoryId,
      amountCents,
      occurredAt,
    });
    if (anomaly.isAnomaly) {
      const a = await createAlert({
        type: "ANOMALY",
        title: "Expense above trailing average",
        body: `amount ${anomaly.amountCents} > avg ${anomaly.avgCents} + ${anomaly.marginBps} bps`,
        buildingId,
        transactionId: transaction.id,
        enqueueNotify: false,
      }, tx);
      alertIds.push(a.id);
    }
  }

  return { transaction, alertIds };
});

// AFTER commit — enqueue admin notify
for (const id of alertIds) {
  await sendAlertNotifyEvent(id);
}
```

## Inngest function names

| `name` (dashboard) | `id` | Trigger | Idempotency |
|--------------------|------|---------|-------------|
| `alerts/notify-admin` | `alerts-notify-admin` | event `alert/created` | event id `alert:{alertId}:notify` |
| `dunning/daily` | `dunning-daily` | cron `0 8 * * *` | step + DB status `PENDING\|SENT:{chargeId}:{yyyy-mm-dd}` |
| `receipts/process` | `receipts-process` | event `receipt/process` | event id `receipt:{receiptId}` (stub for Agent 2) |

Serve path: `/api/inngest` (`src/app/api/inngest/route.ts`).

Local: `npx inngest-cli@latest dev` → point at the Next app.

## Alert types note

Prisma `AlertType` is **`OCR_MISMATCH` | `ANOMALY`** (Agent 1 schema). Overdue charges use **`DunningNotice`**, not an `OVERDUE` alert. Adding `OVERDUE` to the enum needs a schema migration from Agent 1 / lead.

Default severity for mismatch/anomaly creates: **HIGH**.

## Env (already in `.env.example`)

```
ANOMALY_MARGIN_BPS=3000
RESEND_API_KEY=
RESEND_FROM=noreply@example.com
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

`sendEmail` no-ops + logs when `RESEND_API_KEY` is empty.

## Verified

- `npx vitest run src/domain/anomaly src/domain/audit src/domain/dunning src/inngest` — pass
- Agent 3 paths typecheck clean
- Remaining `tsc` errors are Agent 4 dashboard (`AlertStatus`, expense table fields) — out of scope

## Next for Agent 2

1. Import the helpers above in `POST /api/transactions` create path.
2. Always `enqueueNotify: false` inside `$transaction`; call `sendAlertNotifyEvent` after commit.
3. Optional: `sendReceiptProcessEvent(receiptId)` from receipts upload when `OCR_PROVIDER !== mock`.

## Next for Agent 4

- `GET /api/alerts` → `{ alerts: [...] }` (OPEN only)
- `PATCH /api/alerts/:id` body `{ status: "ACKED" | "RESOLVED" }` — ADMIN only
