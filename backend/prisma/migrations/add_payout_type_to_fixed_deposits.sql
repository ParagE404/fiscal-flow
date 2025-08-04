-- Add payoutType column to fixed_deposits table
ALTER TABLE "fixed_deposits" ADD COLUMN "payoutType" TEXT NOT NULL DEFAULT 'Maturity';

-- Add check constraint to ensure valid payout types
ALTER TABLE "fixed_deposits" ADD CONSTRAINT "fixed_deposits_payoutType_check" 
CHECK ("payoutType" IN ('Monthly', 'Quarterly', 'Half-yearly', 'Yearly', 'Maturity'));