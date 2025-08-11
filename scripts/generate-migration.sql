-- Auto-Sync Integration Database Migration
-- This script contains all the database changes needed for sync functionality
-- Run this script in production after backing up your database

-- =====================================================
-- SYNC METADATA TABLES
-- =====================================================

-- Create sync_metadata table
CREATE TABLE IF NOT EXISTS "sync_metadata" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "investment_type" TEXT NOT NULL,
    "investment_id" TEXT NOT NULL,
    "last_sync_at" TIMESTAMP(3),
    "sync_status" TEXT NOT NULL DEFAULT 'manual',
    "sync_source" TEXT,
    "error_message" TEXT,
    "data_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_metadata_pkey" PRIMARY KEY ("id")
);

-- Create sync_configurations table
CREATE TABLE IF NOT EXISTS "sync_configurations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "investment_type" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sync_frequency" TEXT NOT NULL DEFAULT 'daily',
    "preferred_source" TEXT NOT NULL,
    "fallback_source" TEXT,
    "custom_schedule" TEXT,
    "notify_on_success" BOOLEAN NOT NULL DEFAULT false,
    "notify_on_failure" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_configurations_pkey" PRIMARY KEY ("id")
);

-- Create encrypted_credentials table
CREATE TABLE IF NOT EXISTS "encrypted_credentials" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "encrypted_data" TEXT NOT NULL,
    "key_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "encrypted_credentials_pkey" PRIMARY KEY ("id")
);

-- =====================================================
-- EXTEND EXISTING INVESTMENT TABLES
-- =====================================================

-- Add sync fields to mutual_funds table
ALTER TABLE "mutual_funds" 
ADD COLUMN IF NOT EXISTS "isin" TEXT,
ADD COLUMN IF NOT EXISTS "scheme_code" TEXT,
ADD COLUMN IF NOT EXISTS "last_sync_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "sync_status" TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS "manual_override" BOOLEAN DEFAULT false;

-- Add sync fields to epf_accounts table
ALTER TABLE "epf_accounts" 
ADD COLUMN IF NOT EXISTS "uan" TEXT,
ADD COLUMN IF NOT EXISTS "last_sync_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "sync_status" TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS "manual_override" BOOLEAN DEFAULT false;

-- Add sync fields to stocks table
ALTER TABLE "stocks" 
ADD COLUMN IF NOT EXISTS "exchange" TEXT,
ADD COLUMN IF NOT EXISTS "isin" TEXT,
ADD COLUMN IF NOT EXISTS "last_sync_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "sync_status" TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS "manual_override" BOOLEAN DEFAULT false;

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for sync_metadata table
CREATE INDEX IF NOT EXISTS "idx_sync_metadata_user_type" ON "sync_metadata"("user_id", "investment_type");
CREATE INDEX IF NOT EXISTS "idx_sync_metadata_status" ON "sync_metadata"("sync_status", "last_sync_at");
CREATE UNIQUE INDEX IF NOT EXISTS "sync_metadata_user_id_investment_type_investment_id_key" ON "sync_metadata"("user_id", "investment_type", "investment_id");

-- Indexes for sync_configurations table
CREATE INDEX IF NOT EXISTS "idx_sync_configurations_user" ON "sync_configurations"("user_id");
CREATE INDEX IF NOT EXISTS "idx_sync_configurations_enabled" ON "sync_configurations"("user_id", "investment_type") WHERE "is_enabled" = true;
CREATE UNIQUE INDEX IF NOT EXISTS "sync_configurations_user_id_investment_type_key" ON "sync_configurations"("user_id", "investment_type");

-- Indexes for encrypted_credentials table
CREATE INDEX IF NOT EXISTS "idx_encrypted_credentials_user" ON "encrypted_credentials"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "encrypted_credentials_user_id_service_key" ON "encrypted_credentials"("user_id", "service");

-- Indexes for investment tables with sync fields
CREATE INDEX IF NOT EXISTS "idx_mutual_funds_isin" ON "mutual_funds"("isin") WHERE "isin" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_mutual_funds_scheme_code" ON "mutual_funds"("scheme_code") WHERE "scheme_code" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_mutual_funds_sync_status" ON "mutual_funds"("sync_status", "last_sync_at");

CREATE INDEX IF NOT EXISTS "idx_epf_accounts_uan" ON "epf_accounts"("uan") WHERE "uan" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_epf_accounts_sync_status" ON "epf_accounts"("sync_status", "last_sync_at");

CREATE INDEX IF NOT EXISTS "idx_stocks_exchange_symbol" ON "stocks"("exchange", "symbol");
CREATE INDEX IF NOT EXISTS "idx_stocks_isin" ON "stocks"("isin") WHERE "isin" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_stocks_sync_status" ON "stocks"("sync_status", "last_sync_at");

-- =====================================================
-- ADD FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Add foreign key constraints (if users table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- Add foreign key for sync_metadata
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'sync_metadata_user_id_fkey') THEN
            ALTER TABLE "sync_metadata" ADD CONSTRAINT "sync_metadata_user_id_fkey" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        -- Add foreign key for sync_configurations
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'sync_configurations_user_id_fkey') THEN
            ALTER TABLE "sync_configurations" ADD CONSTRAINT "sync_configurations_user_id_fkey" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        -- Add foreign key for encrypted_credentials
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'encrypted_credentials_user_id_fkey') THEN
            ALTER TABLE "encrypted_credentials" ADD CONSTRAINT "encrypted_credentials_user_id_fkey" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- =====================================================
-- CREATE TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for sync tables
DROP TRIGGER IF EXISTS update_sync_metadata_updated_at ON sync_metadata;
CREATE TRIGGER update_sync_metadata_updated_at 
    BEFORE UPDATE ON sync_metadata 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sync_configurations_updated_at ON sync_configurations;
CREATE TRIGGER update_sync_configurations_updated_at 
    BEFORE UPDATE ON sync_configurations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_encrypted_credentials_updated_at ON encrypted_credentials;
CREATE TRIGGER update_encrypted_credentials_updated_at 
    BEFORE UPDATE ON encrypted_credentials 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INSERT DEFAULT SYNC CONFIGURATIONS
-- =====================================================

-- Insert default sync configurations for existing users
INSERT INTO sync_configurations (id, user_id, investment_type, is_enabled, sync_frequency, preferred_source, notify_on_failure)
SELECT 
    'sync_config_' || u.id || '_mf',
    u.id,
    'mutual_funds',
    false, -- Disabled by default, users need to enable
    'daily',
    'amfi',
    true
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM sync_configurations sc 
    WHERE sc.user_id = u.id AND sc.investment_type = 'mutual_funds'
);

INSERT INTO sync_configurations (id, user_id, investment_type, is_enabled, sync_frequency, preferred_source, notify_on_failure)
SELECT 
    'sync_config_' || u.id || '_epf',
    u.id,
    'epf',
    false, -- Disabled by default, users need to enable and configure credentials
    'monthly',
    'epfo',
    true
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM sync_configurations sc 
    WHERE sc.user_id = u.id AND sc.investment_type = 'epf'
);

INSERT INTO sync_configurations (id, user_id, investment_type, is_enabled, sync_frequency, preferred_source, notify_on_failure)
SELECT 
    'sync_config_' || u.id || '_stocks',
    u.id,
    'stocks',
    false, -- Disabled by default, users need to enable
    'hourly',
    'yahoo_finance',
    true
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM sync_configurations sc 
    WHERE sc.user_id = u.id AND sc.investment_type = 'stocks'
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify table creation
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name IN ('sync_metadata', 'sync_configurations', 'encrypted_credentials')
ORDER BY table_name;

-- Verify column additions
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('mutual_funds', 'epf_accounts', 'stocks')
    AND column_name IN ('isin', 'scheme_code', 'uan', 'exchange', 'last_sync_at', 'sync_status', 'manual_override')
ORDER BY table_name, column_name;

-- Verify indexes
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('sync_metadata', 'sync_configurations', 'encrypted_credentials', 'mutual_funds', 'epf_accounts', 'stocks')
    AND indexname LIKE '%sync%' OR indexname LIKE '%isin%' OR indexname LIKE '%uan%'
ORDER BY tablename, indexname;

-- Count default configurations created
SELECT 
    investment_type,
    COUNT(*) as user_count
FROM sync_configurations 
GROUP BY investment_type
ORDER BY investment_type;

-- =====================================================
-- ROLLBACK SCRIPT (COMMENTED OUT - UNCOMMENT IF NEEDED)
-- =====================================================

/*
-- ROLLBACK SCRIPT - USE WITH EXTREME CAUTION
-- This will remove all sync-related data and schema changes

-- Drop foreign key constraints
ALTER TABLE sync_metadata DROP CONSTRAINT IF EXISTS sync_metadata_user_id_fkey;
ALTER TABLE sync_configurations DROP CONSTRAINT IF EXISTS sync_configurations_user_id_fkey;
ALTER TABLE encrypted_credentials DROP CONSTRAINT IF EXISTS encrypted_credentials_user_id_fkey;

-- Drop triggers
DROP TRIGGER IF EXISTS update_sync_metadata_updated_at ON sync_metadata;
DROP TRIGGER IF EXISTS update_sync_configurations_updated_at ON sync_configurations;
DROP TRIGGER IF EXISTS update_encrypted_credentials_updated_at ON encrypted_credentials;

-- Drop sync tables
DROP TABLE IF EXISTS sync_metadata;
DROP TABLE IF EXISTS sync_configurations;
DROP TABLE IF EXISTS encrypted_credentials;

-- Remove sync columns from investment tables
ALTER TABLE mutual_funds 
DROP COLUMN IF EXISTS isin,
DROP COLUMN IF EXISTS scheme_code,
DROP COLUMN IF EXISTS last_sync_at,
DROP COLUMN IF EXISTS sync_status,
DROP COLUMN IF EXISTS manual_override;

ALTER TABLE epf_accounts 
DROP COLUMN IF EXISTS uan,
DROP COLUMN IF EXISTS last_sync_at,
DROP COLUMN IF EXISTS sync_status,
DROP COLUMN IF EXISTS manual_override;

ALTER TABLE stocks 
DROP COLUMN IF EXISTS exchange,
DROP COLUMN IF EXISTS isin,
DROP COLUMN IF EXISTS last_sync_at,
DROP COLUMN IF EXISTS sync_status,
DROP COLUMN IF EXISTS manual_override;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();
*/