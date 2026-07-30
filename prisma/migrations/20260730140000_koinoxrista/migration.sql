-- AlterEnum
CREATE TYPE "AllocationMethod" AS ENUM ('GENERAL_SHARES', 'ELEVATOR_SHARES', 'HEATING_SHARES', 'EQUAL', 'MANUAL');

-- AlterEnum
CREATE TYPE "SettlementStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- AlterTable
ALTER TABLE "Apartment" ADD COLUMN "elevatorShareBps" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Apartment" ADD COLUMN "heatingShareBps" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Apartment" ADD COLUMN "floor" INTEGER;

-- Backfill: copy general shares into elevator/heating until seed/operator overrides.
UPDATE "Apartment" SET "elevatorShareBps" = "shareBps", "heatingShareBps" = "shareBps";

-- AlterTable
ALTER TABLE "ExpenseCategory" ADD COLUMN "allocationMethod" "AllocationMethod" NOT NULL DEFAULT 'GENERAL_SHARES';

-- CreateTable
CREATE TABLE "CommonExpenseSettlement" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "totalCents" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommonExpenseSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommonExpenseSettlementLine" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "apartmentId" TEXT NOT NULL,
    "categoryId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "shareUsedBps" INTEGER NOT NULL,
    "expenseIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommonExpenseSettlementLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommonExpenseSettlement_buildingId_year_month_key" ON "CommonExpenseSettlement"("buildingId", "year", "month");

-- AddForeignKey
ALTER TABLE "CommonExpenseSettlement" ADD CONSTRAINT "CommonExpenseSettlement_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommonExpenseSettlement" ADD CONSTRAINT "CommonExpenseSettlement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommonExpenseSettlementLine" ADD CONSTRAINT "CommonExpenseSettlementLine_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "CommonExpenseSettlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommonExpenseSettlementLine" ADD CONSTRAINT "CommonExpenseSettlementLine_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommonExpenseSettlementLine" ADD CONSTRAINT "CommonExpenseSettlementLine_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
