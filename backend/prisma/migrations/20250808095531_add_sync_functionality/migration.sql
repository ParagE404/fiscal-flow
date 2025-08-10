-- AlterTable
ALTER TABLE "epf_accounts" ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "manualOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "syncStatus" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "uan" TEXT;

-- AlterTable
ALTER TABLE "fixed_deposits" ADD COLUMN     "customId" TEXT,
ADD COLUMN     "payoutType" TEXT NOT NULL DEFAULT 'Maturity';

-- AlterTable
ALTER TABLE "mutual_funds" ADD COLUMN     "isin" TEXT,
ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "manualOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "schemeCode" TEXT,
ADD COLUMN     "sipInvestment" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "syncStatus" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "totalInvestment" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "sips" ADD COLUMN     "mutualFundId" TEXT;

-- AlterTable
ALTER TABLE "stocks" ADD COLUMN     "exchange" TEXT,
ADD COLUMN     "isin" TEXT,
ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "manualOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "syncStatus" TEXT NOT NULL DEFAULT 'manual';

-- CreateTable
CREATE TABLE "sync_metadata" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "investmentType" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL,
    "syncSource" TEXT NOT NULL,
    "errorMessage" TEXT,
    "dataHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_configurations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "investmentType" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "syncFrequency" TEXT NOT NULL,
    "preferredSource" TEXT NOT NULL,
    "fallbackSource" TEXT,
    "customSchedule" TEXT,
    "notifyOnSuccess" BOOLEAN NOT NULL DEFAULT false,
    "notifyOnFailure" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encrypted_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "encrypted_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sync_metadata_userId_investmentType_idx" ON "sync_metadata"("userId", "investmentType");

-- CreateIndex
CREATE INDEX "sync_metadata_lastSyncAt_idx" ON "sync_metadata"("lastSyncAt");

-- CreateIndex
CREATE INDEX "sync_metadata_syncStatus_idx" ON "sync_metadata"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "sync_metadata_userId_investmentType_investmentId_key" ON "sync_metadata"("userId", "investmentType", "investmentId");

-- CreateIndex
CREATE INDEX "sync_configurations_userId_idx" ON "sync_configurations"("userId");

-- CreateIndex
CREATE INDEX "sync_configurations_isEnabled_idx" ON "sync_configurations"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "sync_configurations_userId_investmentType_key" ON "sync_configurations"("userId", "investmentType");

-- CreateIndex
CREATE INDEX "encrypted_credentials_userId_idx" ON "encrypted_credentials"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "encrypted_credentials_userId_service_key" ON "encrypted_credentials"("userId", "service");

-- CreateIndex
CREATE INDEX "epf_accounts_uan_idx" ON "epf_accounts"("uan");

-- CreateIndex
CREATE INDEX "fixed_deposits_customId_idx" ON "fixed_deposits"("customId");

-- CreateIndex
CREATE INDEX "mutual_funds_isin_idx" ON "mutual_funds"("isin");

-- CreateIndex
CREATE INDEX "mutual_funds_schemeCode_idx" ON "mutual_funds"("schemeCode");

-- CreateIndex
CREATE INDEX "sips_mutualFundId_idx" ON "sips"("mutualFundId");

-- CreateIndex
CREATE INDEX "stocks_exchange_symbol_idx" ON "stocks"("exchange", "symbol");

-- CreateIndex
CREATE INDEX "stocks_isin_idx" ON "stocks"("isin");

-- AddForeignKey
ALTER TABLE "sips" ADD CONSTRAINT "sips_mutualFundId_fkey" FOREIGN KEY ("mutualFundId") REFERENCES "mutual_funds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_metadata" ADD CONSTRAINT "sync_metadata_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_configurations" ADD CONSTRAINT "sync_configurations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encrypted_credentials" ADD CONSTRAINT "encrypted_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
