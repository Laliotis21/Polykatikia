# Demo slice — κοινόχρηστα → ειδοποίηση → πληρωμή → εισπράξεις

## 5′ script (hosted / already seeded)

Seed προ-οριστικοποιεί **όλο το 2026** (όλα τα κτίρια), σημαδεύει **Α1 (Μαρία) Aug ως Paid**, και για **Κολωνάκι Ιαν 2026** βάζει ενδείξεις θέρμανσης. Δεν χρειάζεται κλικ Οριστικοποίηση για άδειες οθόνες.

1. **Operator login:**
   - **Hosted demo (recommended):** set Vercel env `DEMO_AUTH_EMAIL=admin@polykatoikia.local` (must exist in seeded `User`). Opens dashboard without Supabase password — **demo only**.
   - **Or** Supabase Auth: create user `admin@polykatoikia.local` in the project linked to `NEXT_PUBLIC_SUPABASE_*`, then `/login` with that password. Prisma `User` row must match the Auth email.
   - **Local without Supabase:** `DEMO_AUTH_EMAIL=admin@polykatoikia.local` in `.env`.
2. **Κτίριο:** Κολωνάκι 12 → `/buildings/seed-building-kolonaki`
3. **Χιλιοστά:** `/buildings/seed-building-kolonaki/shares` — 4 διαμερίσματα με shares.
4. **Ενδείξεις (θέρμανση):** `/buildings/seed-building-kolonaki/meters` → μήνας **01/2026** — Α1=5, Α2=20, Β1=50, Β2=10. Badge «Κατανομή: ενδείξεις».
5. **Κοινόχρηστα (μετρητές):** `/buildings/seed-building-kolonaki/koinoxrista` → μήνας **01/2026** — FINALIZED· γραμμές **Θέρμανση** κατά βάρη κατανάλωσης (όχι μόνο χιλιοστά). Badge «Θέρμανση: ενδείξεις».
6. **Κοινόχρηστα (σταθερά shares):** μήνας **08/2026** — χωρίς ενδείξεις· Θέρμανση δεν υπάρχει (καλοκαίρι)· γενικά/ανελκυστήρας από χιλιοστά. FINALIZED.
7. **Εισπράξεις:** `/buildings/seed-building-kolonaki/collections` → φίλτρο Aug · Α1 **Paid**, Α2/Β1/Β2 **Open**.
8. **Portal (open charge):** `/portal/demo-portal-giannis` → **Πληρωμή (demo)** → ξαναφόρτωσε Εισπράξεις (Α2 πράσινο).
9. **Portal (already paid):** `/portal/demo-portal-maria` — χρέωση Αυγούστου ήδη πληρωμένη.

Optional: OCR path (`/receipts/upload`) για integrity story.

## Re-seed (idempotent)

```bash
npx prisma migrate deploy && npm run db:seed
```

- Vercel build τρέχει `prisma migrate deploy` — migrations upsert κτίριο + διαμερίσματα + `HeatingMeterReading` table.
- `npm run db:seed` upserts owners/portalTokens, categories, monthly expenses, Jan meter readings (Κολωνάκι), finalizes all months, pays Α1 Aug.

## Portal tokens

| Owner | Apartment | URL | Aug status after seed |
|-------|-----------|-----|------------------------|
| Μαρία | Α1 | `/portal/demo-portal-maria` | PAID |
| Γιάννης | Α2 | `/portal/demo-portal-giannis` | OPEN |
| Ελένη | Β1 | `/portal/demo-portal-eleni` | OPEN |
| Νίκος | Β2 | `/portal/demo-portal-nikos` | OPEN |

Emails μετά finalize χρειάζονται `RESEND_API_KEY`· χωρίς key γίνεται log skip (sync fallback).
