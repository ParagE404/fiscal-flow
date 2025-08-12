# Auto-Sync Troubleshooting Guide

## Common Issues and Solutions

### 1. Sync Jobs Not Running

**Symptoms:**
- Last sync timestamps are not updating
- Manual sync works but automatic sync doesn't
- No sync job logs in application logs

**Possible Causes & Solutions:**

#### Job Scheduler Not Started
```bash
# Check if job scheduler is initialized
grep "Job scheduler started" logs/app.log

# Verify environment variable
echo $ENABLE_BACKGROUND_JOBS  # Should be 'true'
```

**Solution:**
```javascript
// Ensure JobScheduler.start() is called in server.js
const jobScheduler = new JobScheduler();
jobScheduler.start();
```

#### Timezone Configuration Issues
```bash
# Check timezone setting
echo $JOB_SCHEDULER_TIMEZONE  # Should be 'Asia/Kolkata'

# Verify system timezone
timedatectl status
```

**Solution:**
```bash
# Set correct timezone in environment
export JOB_SCHEDULER_TIMEZONE=Asia/Kolkata

# Or update .env file
JOB_SCHEDULER_TIMEZONE=Asia/Kolkata
```

#### Database Connection Issues
```bash
# Test database connectivity
npx prisma db pull

# Check for migration issues
npx prisma migrate status
```

### 2. AMFI NAV Data Sync Failures

**Symptoms:**
- Mutual fund values not updating
- Error: "Failed to fetch NAV data"
- Sync status shows 'failed' for mutual funds

**Possible Causes & Solutions:**

#### Network Connectivity Issues
```bash
# Test AMFI endpoint directly
curl -I "https://www.amfiindia.com/spages/NAVAll.txt"

# Check response time
curl -w "@curl-format.txt" -o /dev/null -s "https://www.amfiindia.com/spages/NAVAll.txt"
```

**Solution:**
- Verify firewall allows outbound HTTPS connections
- Check if corporate proxy is blocking requests
- Implement retry logic with exponential backoff

#### Data Format Changes
```bash
# Download and inspect current format
curl "https://www.amfiindia.com/spages/NAVAll.txt" | head -20
```

**Solution:**
- Update CSV parsing logic if format changed
- Add data validation to catch format issues early
- Implement fallback to cached data

#### Missing ISIN Codes
```sql
-- Check for mutual funds without ISIN codes
SELECT id, fund_name, isin FROM mutual_funds 
WHERE user_id = 'USER_ID' AND (isin IS NULL OR isin = '');
```

**Solution:**
- Update mutual fund records with correct ISIN codes
- Use scheme codes as alternative identifiers
- Prompt users to add ISIN codes for new funds

### 3. EPF Sync Authentication Failures

**Symptoms:**
- Error: "EPF credentials not configured"
- Error: "Authentication failed"
- EPF sync status shows 'failed'

**Possible Causes & Solutions:**

#### Missing or Invalid Credentials
```sql
-- Check if credentials exist
SELECT service, created_at, updated_at FROM encrypted_credentials 
WHERE user_id = 'USER_ID' AND service = 'epfo';
```

**Solution:**
```javascript
// Test credential decryption
const credentialService = new CredentialService();
const creds = await credentialService.getCredentials(userId, 'epfo');
console.log('Credentials exist:', !!creds);
```

#### EPFO Portal Changes
- EPFO portal may have updated their authentication flow
- Captcha requirements may have been added
- Session timeout policies may have changed

**Solution:**
- Update EPFO data provider to handle new authentication flow
- Implement captcha solving if required
- Add session management and renewal logic

#### Encryption Key Issues
```bash
# Verify encryption key is set
echo $CREDENTIAL_ENCRYPTION_KEY | wc -c  # Should be 32+ characters
```

**Solution:**
```bash
# Generate new encryption key
openssl rand -hex 32

# Update environment variable
export CREDENTIAL_ENCRYPTION_KEY=your-new-key
```

### 4. Stock Price Sync Issues

**Symptoms:**
- Stock prices not updating
- Error: "Rate limit exceeded"
- Error: "Invalid API key"

**Possible Causes & Solutions:**

#### API Key Issues
```bash
# Test Yahoo Finance API
curl -H "X-RapidAPI-Key: $YAHOO_FINANCE_API_KEY" \
     "https://yahoo-finance15.p.rapidapi.com/api/yahoo/qu/quote/RELIANCE.NS"
```

**Solution:**
- Verify API key is correct and active
- Check API subscription status and limits
- Rotate API key if compromised

#### Rate Limiting
```javascript
// Check cache hit rates
const cacheStats = syncCache.getStats();
console.log('Cache hit rate:', cacheStats.hitRate);
```

**Solution:**
- Increase cache TTL during market hours
- Implement request batching
- Add multiple API keys for rotation

#### Symbol Format Issues
```sql
-- Check for invalid stock symbols
SELECT symbol, exchange FROM stocks 
WHERE user_id = 'USER_ID' AND sync_status = 'failed';
```

**Solution:**
- Validate symbols against exchange listings
- Implement symbol normalization (e.g., add .NS for NSE)
- Provide symbol lookup functionality

### 5. Performance Issues

**Symptoms:**
- Sync jobs taking too long
- High memory usage during sync
- Database timeouts

**Possible Causes & Solutions:**

#### Large Dataset Processing
```sql
-- Check user investment counts
SELECT 
  investment_type,
  COUNT(*) as count
FROM (
  SELECT 'mutual_funds' as investment_type FROM mutual_funds WHERE user_id = 'USER_ID'
  UNION ALL
  SELECT 'stocks' as investment_type FROM stocks WHERE user_id = 'USER_ID'
  UNION ALL
  SELECT 'epf' as investment_type FROM epf_accounts WHERE user_id = 'USER_ID'
) counts
GROUP BY investment_type;
```

**Solution:**
- Implement batch processing for large datasets
- Add pagination to sync operations
- Use streaming for memory-efficient processing

#### Database Performance
```sql
-- Check for missing indexes
EXPLAIN ANALYZE SELECT * FROM sync_metadata 
WHERE user_id = 'USER_ID' AND investment_type = 'mutual_funds';
```

**Solution:**
```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_sync_metadata_user_type_status 
ON sync_metadata(user_id, investment_type, sync_status);

-- Optimize queries
VACUUM ANALYZE sync_metadata;
```

#### Concurrent Sync Operations
```javascript
// Check for job overlaps
const activeJobs = await getActiveSyncJobs();
console.log('Active sync jobs:', activeJobs.length);
```

**Solution:**
- Implement job locking mechanism
- Add queue management for concurrent operations
- Set appropriate job concurrency limits

### 6. Data Integrity Issues

**Symptoms:**
- Incorrect calculated values
- Missing sync timestamps
- Inconsistent data states

**Possible Causes & Solutions:**

#### Calculation Errors
```sql
-- Verify current value calculations
SELECT 
  id,
  invested_amount,
  current_value,
  (current_value - invested_amount) / invested_amount * 100 as calculated_return
FROM mutual_funds 
WHERE user_id = 'USER_ID' AND current_value > 0;
```

**Solution:**
- Add data validation rules
- Implement calculation verification
- Create audit trails for value changes

#### Transaction Rollback Issues
```javascript
// Check for partial updates
const incompleteSync = await prisma.syncMetadata.findMany({
  where: {
    syncStatus: 'in_progress',
    updatedAt: {
      lt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
    }
  }
});
```

**Solution:**
- Implement proper transaction management
- Add cleanup jobs for stale sync operations
- Use database constraints to prevent invalid states

## Diagnostic Commands

### Check Sync Status
```bash
# View recent sync operations
tail -f logs/sync.log | grep -E "(SUCCESS|ERROR|FAILED)"

# Check sync metadata in database
psql -d finvista -c "
SELECT 
  investment_type,
  sync_status,
  COUNT(*) as count,
  MAX(last_sync_at) as last_sync
FROM sync_metadata 
GROUP BY investment_type, sync_status;
"
```

### Monitor API Health
```bash
# Test all external APIs
./scripts/test-api-health.sh

# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s "https://www.amfiindia.com/spages/NAVAll.txt"
```

### Database Health Check
```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' AND tablename LIKE '%sync%';

-- Check index usage
SELECT 
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public';
```

## Emergency Procedures

### Disable All Sync Operations
```bash
# Stop all sync jobs immediately
export ENABLE_BACKGROUND_JOBS=false

# Restart application
pm2 restart finvista-backend
```

### Reset Sync State
```sql
-- Reset all sync metadata (use with caution)
UPDATE sync_metadata SET 
  sync_status = 'manual',
  last_sync_at = NULL,
  error_message = NULL
WHERE user_id = 'USER_ID';

-- Reset investment sync status
UPDATE mutual_funds SET sync_status = 'manual', last_sync_at = NULL WHERE user_id = 'USER_ID';
UPDATE stocks SET sync_status = 'manual', last_sync_at = NULL WHERE user_id = 'USER_ID';
UPDATE epf_accounts SET sync_status = 'manual', last_sync_at = NULL WHERE user_id = 'USER_ID';
```

### Backup and Restore
```bash
# Backup sync-related data
pg_dump -t sync_metadata -t sync_configurations -t encrypted_credentials finvista > sync_backup.sql

# Restore from backup
psql finvista < sync_backup.sql
```

## Getting Help

### Log Analysis
```bash
# Search for specific errors
grep -r "sync.*error" logs/ | tail -20

# Monitor real-time sync activity
tail -f logs/app.log | grep -i sync
```

### Contact Information
- Technical Issues: Create issue in project repository
- API Problems: Check respective API provider documentation
- Database Issues: Review PostgreSQL logs and performance metrics

### Useful Resources
- [AMFI Official Website](https://www.amfiindia.com)
- [EPFO Member Portal](https://passbook.epfindia.gov.in)
- [Yahoo Finance API Documentation](https://rapidapi.com/apidojo/api/yahoo-finance1)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Node-cron Documentation](https://www.npmjs.com/package/node-cron)