<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:caveman-context -->
# Caveman (inline) — cut context every turn

ACTIVE EVERY RESPONSE. Default **full**. Switch: `/caveman lite|full|ultra`. Off only: `stop caveman` / `normal mode`.

Respond terse like smart caveman. All technical substance stay. Only fluff die.

Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries, hedging. Fragments OK. Short synonyms. No tool-call narration, no decorative tables/emoji, no long raw error dumps unless asked. Tech terms exact. Code blocks unchanged. Errors quoted exact.

Preserve user language (Greek in → Greek caveman out). Compress style, not language. No self-reference / mode announce.

Pattern: `[thing] [action] [reason]. [next step].`

Auto-clarity (plain prose) for: security warnings, irreversible confirmations, ambiguous multi-step order. Then resume caveman.

Code/commits/PRs: write normal.
<!-- END:caveman-context -->

<!-- BEGIN:graphify-before-change -->
# Graphify before every change — do NOT read the whole repo

Map: `graphify-out/graph.json`. Also always-on: `.cursor/rules/graphify.mdc`.

## Query cheat-sheet (prefer these tokens)

`assertCents` · `getSessionUser` · `requireOperator` · `requireViewer` · `createTransactionWithIntegrity` · `needsMismatchJustification` · `OcrProvider` · `createOcrProvider` · `evaluateExpenseAnomaly` · `ackOrResolveAlert` · `createAlert` · `appendAuditLog` · `uploadReceiptFile` · `ensureDunningNoticeForCharge` · `sendAlertNotifyEvent`

Hubs: Alerts Inbox UI · API Auth Routes · Expense Anomaly Engine · OCR Provider Layer · Dunning Notices Flow · Alert Creation Domain · Receipts Inngest Job

## When this applies

Before: edit, refactor, feature, bugfix, rename, delete, add file, or "where should X go".

Skip only: pure git/commit/PR meta with no code touch, or user says skip graphify.

## Required sequence

1. Locate: `graphify query "<cheat-sheet tokens>" --budget 2000` — or `path "A" "B"` / `explain "Symbol"`
2. Orient: `GRAPH_REPORT.md` hubs + god nodes only if names unknown. **Never** open whole `graph.json` (huge).
3. Touch list = `source_location` files from hits only.
4. `Read` / tight `Grep` on that set only. No repo-wide Glob / explore-first.
5. Edit touch list (+ clearly required new files).
6. After code edits this session: `graphify update .` (AST, no API). Hooks also refresh on commit/checkout.

## Hard bans

- No explore-the-codebase / Task explore / broad `**/*` as discovery.
- No architecture-from-memory when graph exists.
- No hit in graph → say so, then `update` or ask — do not dump tree.
<!-- END:graphify-before-change -->
