# Demo slice — κοινόχρηστα → ειδοποίηση → πληρωμή → εισπράξεις

## 5′ script (hosted / already seeded)

Seed προ-οριστικοποιεί **Αύγουστο 2026** + **Ιανουάριο 2026** και σημαδεύει **Α1 (Μαρία) ως Paid**. Δεν χρειάζεται κλικ Οριστικοποίηση για άδειες οθόνες.

1. **Operator login:**
   - **Hosted demo (recommended):** set Vercel env `DEMO_AUTH_EMAIL=admin@polykatoikia.local` (must exist in seeded `User`). Opens dashboard without Supabase password — **demo only**.
   - **Or** Supabase Auth: create user `admin@polykatoikia.local` in the project linked to `NEXT_PUBLIC_SUPABASE_*`, then `/login` with that password. Prisma `User` row must match the Auth email.
   - **Local without Supabase:** `DEMO_AUTH_EMAIL=admin@polykatoikia.local` in `.env`.
2. **Κτίριο:** Κολωνάκι 12 → `/buildings/seed-building-kolonaki`
3. **Χιλιοστά:** `/buildings/seed-building-kolonaki/shares` — 4 διαμερίσματα με shares.
4. **Κοινόχρηστα:** `/buildings/seed-building-kolonaki/koinoxrista` → μήνας **08/2026** — ήδη FINALIZED (προβολή statement / charges). If you see «Το API δεν είναι ακόμη διαθέσιμο», that badge is only for HTTP 501 — 401/404 now show the real error (σύνδεση / κτίριο).
5. **Εισπράξεις:** `/buildings/seed-building-kolonaki/collections` → Α1 **Paid**, Α2/Β1/Β2 **Open**.
6. **Portal (open charge):** `/portal/demo-portal-giannis` → **Πληρωμή (demo)** → ξαναφόρτωσε Εισπράξεις (Α2 πράσινο).
7. **Portal (already paid):** `/portal/demo-portal-maria` — χρέωση Αυγούστου ήδη πληρωμένη.

Optional: OCR path (`/receipts/upload`) για integrity story.

## Re-seed (idempotent)

```bash
npx prisma migrate deploy && npm run db:seed
```

- Vercel build τρέχει `prisma migrate deploy` — migration `ensure_seed_kolonaki_apartments` upserts κτίριο + 4 διαμερίσματα.
- `npm run db:seed` upserts owners/portalTokens, categories, Aug expenses, finalizes Jan+Aug, pays Α1.

## Portal tokens

| Owner | Apartment | URL | Aug status after seed |
|-------|-----------|-----|------------------------|
| Μαρία | Α1 | `/portal/demo-portal-maria` | PAID |
| Γιάννης | Α2 | `/portal/demo-portal-giannis` | OPEN |
| Ελένη | Β1 | `/portal/demo-portal-eleni` | OPEN |
| Νίκος | Β2 | `/portal/demo-portal-nikos` | OPEN |

Emails μετά finalize χρειάζονται `RESEND_API_KEY`· χωρίς key γίνεται log skip (sync fallback).
