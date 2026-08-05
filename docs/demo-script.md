# Demo slice — κοινόχρηστα → ειδοποίηση → πληρωμή → εισπράξεις

## 5′ script

1. **Seed / migrate** (μία φορά): `npx prisma migrate deploy && npm run db:seed`
   - Vercel build runs `prisma migrate deploy` — migration `ensure_seed_kolonaki_apartments` upserts Κολωνάκι 12 + 4 διαμερίσματα.
   - Χιλιοστά UI: `/buildings/seed-building-kolonaki/shares` (ή **Χιλιοστά** στο sidebar με ενεργό Κολωνάκι 12).
2. **Local auth χωρίς Supabase:** στο `.env` βάλε `DEMO_AUTH_EMAIL=admin@polykatoikia.local`
3. Operator: `/buildings/seed-building-kolonaki/koinoxrista` → Αύγουστος 2026 → **Οριστικοποίηση**
4. Owner: άνοιξε `/portal/demo-portal-maria` → **Πληρωμή (demo)**
5. Operator: `/buildings/seed-building-kolonaki/collections` → Α1 πράσινο / Paid

Optional: OCR path (`/receipts/upload`) πριν το finalize για integrity story.

## Portal tokens (seed)

| Owner | URL |
|-------|-----|
| Μαρία | `/portal/demo-portal-maria` |
| Γιάννης | `/portal/demo-portal-giannis` |
| Ελένη | `/portal/demo-portal-eleni` |
| Νίκος | `/portal/demo-portal-nikos` |

Emails μετά finalize χρειάζονται `RESEND_API_KEY`· χωρίς key γίνεται log skip (sync fallback).
