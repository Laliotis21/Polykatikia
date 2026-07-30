-- Backfill allocation methods from known category codes (seed + conventions).
-- Prior migration defaulted every category to GENERAL_SHARES.
UPDATE "ExpenseCategory"
SET "allocationMethod" = 'ELEVATOR_SHARES'
WHERE upper(coalesce("code", '')) IN ('ELEVATOR', 'LIFT');

UPDATE "ExpenseCategory"
SET "allocationMethod" = 'HEATING_SHARES'
WHERE upper(coalesce("code", '')) IN ('HEATING', 'HEAT');

-- Link CHARGE txs to the settlement that minted them (cascade wipe on DRAFT replace).
ALTER TABLE "Transaction" ADD COLUMN "settlementId" TEXT;

CREATE INDEX "Transaction_settlementId_idx" ON "Transaction"("settlementId");

ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_settlementId_fkey"
FOREIGN KEY ("settlementId") REFERENCES "CommonExpenseSettlement"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
