-- Ensure demo Kolonaki building + apartments exist (idempotent).
-- Fixes prod/demo where migrate ran but prisma db seed never did (or apartments missing).

INSERT INTO "Building" (id, name, address, "createdAt", "updatedAt")
VALUES (
  'seed-building-kolonaki',
  'Κολωνάκι 12',
  'Σκουφά 12, Αθήνα',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Apartment" (
  id,
  "buildingId",
  label,
  "shareBps",
  "elevatorShareBps",
  "heatingShareBps",
  floor,
  "createdAt",
  "updatedAt"
)
VALUES
  ('seed-apt-a1', 'seed-building-kolonaki', 'Α1', 2500, 1500, 2500, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-apt-a2', 'seed-building-kolonaki', 'Α2', 2500, 1500, 2500, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-apt-b1', 'seed-building-kolonaki', 'Β1', 3000, 3500, 3000, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-apt-b2', 'seed-building-kolonaki', 'Β2', 2000, 3500, 2000, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
  "buildingId" = EXCLUDED."buildingId",
  label = EXCLUDED.label,
  "shareBps" = EXCLUDED."shareBps",
  "elevatorShareBps" = EXCLUDED."elevatorShareBps",
  "heatingShareBps" = EXCLUDED."heatingShareBps",
  floor = EXCLUDED.floor,
  "updatedAt" = CURRENT_TIMESTAMP;
