# UI components (Agent 4)

| Path | Role |
|------|------|
| `shell/` | Sidebar + TopBar |
| `api/operator-api.ts` | Typed fetch wrappers (graceful API-pending) |
| `money/` | MoneyText + EUR input → cents parse |
| `alerts/AlertBadge.tsx` | Severity / type badges |
| `receipts/MismatchBanner.tsx` | Danger mismatch callout |
| `ui/` | EmptyState, LoadingState, PageHeader |

Lucide only; no emoji. Money display via `formatEurFromCents`.
