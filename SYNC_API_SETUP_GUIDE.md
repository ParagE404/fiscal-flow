# Auto-Sync Integration Setup Guide

## Overview

This guide provides comprehensive instructions for setting up the Auto-Sync Integration feature in FinVista. The system automatically synchronizes investment data from official sources including mutual fund NAV updates, EPF balance tracking, and stock price updates.

## Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database
- Redis (optional, for advanced job queuing)
- SSL certificate for production deployment

## Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Sync Feature Configuration
SYNC_ENABLED=true
SYNC_JOB_CONCURRENCY=5
SYNC_CACHE_TTL=300000

# Credential Encryption
CREDENTIAL_ENCRYPTION_KEY=your-32-character-encryption-key-here

# Job Scheduler Configuration
JOB_SCHEDULER_TIMEZONE=Asia/Kolkata
ENABLE_BACKGROUND_JOBS=true

# External API Configuration
YAHOO_FINANCE_API_KEY=your-yahoo-finance-api-key
NSE_API_KEY=your-nse-api-key-if-available
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-api-key

# Rate Limiting
SYNC_RATE_LIMIT_WINDOW=900000
SYNC_RATE_LIMIT_MAX_REQUESTS=100

# Monitoring and Logging
SYNC_LOG_LEVEL=info
ENABLE_SYNC_METRICS=true
METRICS_PORT=9090
```

## API Data Sources Setup

### 1. AMFI (Association of Mutual Funds in India)

**Purpose:** Daily NAV data for mutual funds

**Setup:**
- No API key required
- Uses public CSV feed: `https://www.amfiindia.com/spages/NAVAll.txt`
- Data updates daily after market close (around 6 PM IST)

**Configuration:**
```javascript
// No additional configuration needed
// Service automatically fetches from public endpoint
```

**Data Format:**
- CSV format with scheme code, ISIN, scheme name, NAV, and date
- Updates include all mutual fund schemes registered with AMFI

### 2. EPFO (Employees' Provident Fund Organisation)

**Purpose:** EPF balance and contribution data

**Setup:**
- Requires user's EPFO portal credentials
- Uses UAN (Universal Account Number) for identification
- Credentials are encrypted and stored securely

**User Configuration Required:**
1. Users must provide their EPFO portal login credentials
2. UAN number for account identification
3. Credentials are encrypted using AES-256-GCM before storage

**Security Notes:**
- Credentials are never logged or transmitted in plain text
- Uses secure HTTPS connections only
- Implements retry logic with exponential backoff
- Supports credential rotation and expiration handling

### 3. Yahoo Finance API

**Purpose:** Stock and ETF price data

**Setup:**
1. Sign up for Yahoo Finance API access
2. Obtain API key from RapidAPI or similar provider
3. Add API key to environment variables

**Configuration:**
```bash
YAHOO_FINANCE_API_KEY=your-api-key-here
YAHOO_FINANCE_BASE_URL=https://yahoo-finance15.p.rapidapi.com
```

**Rate Limits:**
- Free tier: 500 requests/month
- Paid tiers: Higher limits available
- Implements intelligent caching to minimize API calls

### 4. NSE India API (Alternative)

**Purpose:** Alternative source for Indian stock prices

**Setup:**
1. Register for NSE API access (if available)
2. Obtain API credentials
3. Configure fallback mechanism

**Configuration:**
```bash
NSE_API_KEY=your-nse-api-key
NSE_API_BASE_URL=https://www.nseindia.com/api
```

**Note:** NSE API availability may vary. Yahoo Finance is recommended as primary source.

### 5. Alpha Vantage (Backup)

**Purpose:** Backup stock price data source

**Setup:**
1. Register at alphavantage.co
2. Get free API key (500 requests/day)
3. Configure as fallback source

**Configuration:**
```bash
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key
ALPHA_VANTAGE_BASE_URL=https://www.alphavantage.co/query
```

## Database Setup

### 1. Run Migrations

```bash
# Navigate to backend directory
cd backend

# Run Prisma migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### 2. Verify Schema

Ensure the following tables are created:
- `sync_metadata`
- `sync_configurations`
- `encrypted_credentials`
- Updated investment tables with sync fields

### 3. Create Indexes

```sql
-- Performance indexes for sync operations
CREATE INDEX CONCURRENTLY idx_sync_metadata_user_type ON sync_metadata(user_id, investment_type);
CREATE INDEX CONCURRENTLY idx_sync_configurations_enabled ON sync_configurations(user_id, investment_type) WHERE is_enabled = true;
CREATE INDEX CONCURRENTLY idx_mutual_funds_isin ON mutual_funds(isin) WHERE isin IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_stocks_symbol_exchange ON stocks(symbol, exchange);
CREATE INDEX CONCURRENTLY idx_epf_accounts_uan ON epf_accounts(uan) WHERE uan IS NOT NULL;
```

## Service Configuration

### 1. Job Scheduler Setup

The system uses node-cron for job scheduling with the following default schedule:

```javascript
// Mutual Fund NAV sync - Daily at 6 PM IST
'0 18 * * *'

// EPF balance sync - Monthly on 1st at 2 AM IST  
'0 2 1 * *'

// Stock price sync - Hourly during market hours (9 AM - 3:30 PM IST)
'0 * * * *' // with market hours check
```

### 2. Cache Configuration

```javascript
// Cache settings for API responses
const cacheConfig = {
  stockPrices: {
    ttl: 300000, // 5 minutes during market hours
    maxSize: 1000
  },
  navData: {
    ttl: 86400000, // 24 hours
    maxSize: 5000
  },
  epfData: {
    ttl: 2592000000, // 30 days
    maxSize: 100
  }
};
```

## Testing the Setup

### 1. Verify API Connections

```bash
# Test AMFI data feed
curl "https://www.amfiindia.com/spages/NAVAll.txt" | head -10

# Test Yahoo Finance API (replace with your key)
curl -H "X-RapidAPI-Key: YOUR_KEY" \
     "https://yahoo-finance15.p.rapidapi.com/api/yahoo/qu/quote/RELIANCE.NS"
```

### 2. Run Sync Tests

```bash
# Run unit tests
npm test -- --testPathPattern=sync

# Run integration tests
npm run test:integration -- --testPathPattern=sync

# Test manual sync endpoint
curl -X POST http://localhost:3000/api/sync/mutual_funds \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Verify Database Updates

```sql
-- Check sync metadata
SELECT * FROM sync_metadata WHERE user_id = 'test-user-id';

-- Check updated investment values
SELECT symbol, current_value, last_sync_at, sync_status FROM stocks 
WHERE user_id = 'test-user-id' AND sync_status = 'synced';
```

## Production Deployment Checklist

### Security
- [ ] HTTPS enabled for all external API calls
- [ ] Credential encryption key is 32+ characters and securely stored
- [ ] Environment variables are not committed to version control
- [ ] Database credentials are properly secured
- [ ] API keys have appropriate rate limits configured

### Performance
- [ ] Database indexes are created for sync operations
- [ ] Cache configuration is optimized for your user base
- [ ] Job concurrency is set appropriately for your server resources
- [ ] Monitoring is enabled for sync job performance

### Reliability
- [ ] Backup data sources are configured
- [ ] Error handling and retry logic is tested
- [ ] Job persistence is enabled for system restarts
- [ ] Logging is configured for troubleshooting

### Monitoring
- [ ] Sync job success/failure metrics are tracked
- [ ] API response time monitoring is enabled
- [ ] Database performance monitoring is configured
- [ ] Alerting is set up for sync failures

## Next Steps

1. Configure your environment variables
2. Run database migrations
3. Test API connections
4. Enable sync for test users
5. Monitor sync job execution
6. Gradually roll out to all users

For troubleshooting common issues, see the [Troubleshooting Guide](SYNC_TROUBLESHOOTING_GUIDE.md).