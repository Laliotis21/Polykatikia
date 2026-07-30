# Operator dashboard (Agent 4)

| Route | Screen |
|-------|--------|
| `/` (group index) | Redirect → `/receipts/upload` |
| `/receipts/upload` | Receipt dropzone + building select |
| `/receipts/[id]/review` | OCR fields + operator amount |
| `/receipts/[id]/justify` | Mismatch justification (≥20) |
| `/buildings/[id]/expenses` | Transaction ledger |
| `/buildings/[id]/koinoxrista` | Monthly κοινόχρηστα preview + finalize |
| `/buildings/[id]/shares` | Χιλιοστά + category allocation keys |
| `/alerts` | Alerts inbox |

Shell: `layout.tsx` → Sidebar + TopBar. Tokens: `src/styles/tokens.css`.
