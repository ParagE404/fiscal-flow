-- AlterTable
ALTER TABLE "mutual_funds" ADD COLUMN     "sipInvestment" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalInvestment" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "sips" ADD COLUMN     "mutualFundId" TEXT;

-- CreateIndex
CREATE INDEX "sips_mutualFundId_idx" ON "sips"("mutualFundId");

-- AddForeignKey
ALTER TABLE "sips" ADD CONSTRAINT "sips_mutualFundId_fkey" FOREIGN KEY ("mutualFundId") REFERENCES "mutual_funds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update totalInvestment for existing records
UPDATE "mutual_funds" SET "totalInvestment" = "investedAmount";