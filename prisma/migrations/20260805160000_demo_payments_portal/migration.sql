-- AlterTable
ALTER TABLE "Owner" ADD COLUMN "portalToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Owner_portalToken_key" ON "Owner"("portalToken");

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "paysChargeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_paysChargeId_key" ON "Transaction"("paysChargeId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_paysChargeId_fkey" FOREIGN KEY ("paysChargeId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
