-- Performance optimization indexes for sync operations
-- Run this migration to improve sync query performance

-- Composite indexes for sync metadata queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_metadata_user_type_status 
ON sync_metadata(user_id, investment_type, sync_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_metadata_last_sync_status 
ON sync_metadata(last_sync_at, sync_status) 
WHERE sync_status IN ('synced', 'failed');

-- Partial indexes for active sync configurations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_configurations_enabled_type 
ON sync_configurations(user_id, investment_type, sync_frequency) 
WHERE is_enabled = true;

-- Indexes for investment sync operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mutual_funds_sync_ready 
ON mutual_funds(user_id, sync_status, last_sync_at) 
WHERE manual_override = false AND isin IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stocks_sync_ready 
ON stocks(user_id, sync_status, last_sync_at) 
WHERE manual_override = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_epf_accounts_sync_ready 
ON epf_accounts(user_id, sync_status, last_sync_at) 
WHERE manual_override = false AND uan IS NOT NULL;

-- Indexes for job execution tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_executions_job_status_start 
ON job_executions(job_name, status, start_time);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_executions_recent 
ON job_executions(start_time DESC) 
WHERE start_time > NOW() - INTERVAL '7 days';

-- Indexes for audit log queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_type_timestamp 
ON audit_logs(user_id, investment_type, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_recent_by_type 
ON audit_logs(audit_type, timestamp DESC) 
WHERE timestamp > NOW() - INTERVAL '30 days';

-- Covering indexes for common sync queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mutual_funds_sync_data 
ON mutual_funds(user_id, isin) 
INCLUDE (id, name, scheme_code, invested_amount, sip_investment, current_value, cagr, sync_status, last_sync_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stocks_sync_data 
ON stocks(user_id, symbol, exchange) 
INCLUDE (id, company_name, isin, quantity, buy_price, current_price, invested_amount, current_value, pnl, sync_status, last_sync_at);

-- Indexes for batch operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_metadata_batch_update 
ON sync_metadata(user_id, investment_type, investment_id, updated_at);

-- Statistics update for better query planning
ANALYZE sync_metadata;
ANALYZE sync_configurations;
ANALYZE mutual_funds;
ANALYZE stocks;
ANALYZE epf_accounts;
ANALYZE job_executions;
ANALYZE audit_logs;