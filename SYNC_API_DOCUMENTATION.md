# Auto-Sync API Documentation

## Overview

The Auto-Sync API provides endpoints for managing automated data synchronization for investments including mutual funds, EPF accounts, and stocks. All endpoints require authentication and follow RESTful conventions.

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Authentication

All API endpoints require a valid JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

- Manual sync operations: 10 requests per 15 minutes per user
- Configuration updates: 20 requests per hour per user
- Status queries: 100 requests per hour per user

## Endpoints

### 1. Manual Sync Operations

#### Trigger Manual Sync

Initiates a manual sync operation for a specific investment type.

```http
POST /api/sync/{type}
```

**Parameters:**
- `type` (path): Investment type - `mutual_funds`, `epf`, or `stocks`

**Request Body:**
```json
{
  "force": false,
  "dryRun": false,
  "source": "amfi"
}
```

**Request Fields:**
- `force` (boolean, optional): Force sync even if recently synced. Default: `false`
- `dryRun` (boolean, optional): Perform validation without updating data. Default: `false`
- `source` (string, optional): Preferred data source. Defaults to user configuration

**Response:**
```json
{
  "success": true,
  "data": {
    "syncId": "sync_123456789",
    "recordsProcessed": 15,
    "recordsUpdated": 12,
    "duration": 2340,
    "source": "amfi",
    "errors": []
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "SYNC_FAILED",
    "message": "Failed to sync mutual funds",
    "details": {
      "recordsProcessed": 5,
      "recordsUpdated": 0,
      "errors": [
        {
          "type": "network_error",
          "message": "Connection timeout to AMFI server",
          "timestamp": "2024-01-15T10:30:00Z"
        }
      ]
    }
  }
}
```

**Example:**
```bash
curl -X POST "https://api.finvista.com/api/sync/mutual_funds" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

#### Get Sync Status

Retrieves current sync status and history for a specific investment type.

```http
GET /api/sync/{type}/status
```

**Parameters:**
- `type` (path): Investment type - `mutual_funds`, `epf`, or `stocks`
- `limit` (query, optional): Number of history records to return. Default: `10`, Max: `100`
- `offset` (query, optional): Pagination offset. Default: `0`

**Response:**
```json
{
  "success": true,
  "data": {
    "currentStatus": "synced",
    "lastSyncAt": "2024-01-15T18:00:00Z",
    "nextScheduledSync": "2024-01-16T18:00:00Z",
    "totalInvestments": 15,
    "syncedInvestments": 12,
    "failedInvestments": 0,
    "manualInvestments": 3,
    "history": [
      {
        "syncId": "sync_123456789",
        "startedAt": "2024-01-15T18:00:00Z",
        "completedAt": "2024-01-15T18:00:02Z",
        "status": "success",
        "recordsProcessed": 15,
        "recordsUpdated": 12,
        "source": "amfi",
        "errors": []
      }
    ]
  }
}
```

**Example:**
```bash
curl "https://api.finvista.com/api/sync/mutual_funds/status?limit=5" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 2. Sync Configuration Management

#### Get Sync Configuration

Retrieves user's sync configuration for all investment types.

```http
GET /api/sync/config
```

**Response:**
```json
{
  "success": true,
  "data": {
    "configurations": [
      {
        "investmentType": "mutual_funds",
        "isEnabled": true,
        "syncFrequency": "daily",
        "preferredSource": "amfi",
        "fallbackSource": "mfcentral",
        "customSchedule": null,
        "notifyOnSuccess": false,
        "notifyOnFailure": true,
        "lastUpdated": "2024-01-10T12:00:00Z"
      },
      {
        "investmentType": "epf",
        "isEnabled": true,
        "syncFrequency": "monthly",
        "preferredSource": "epfo",
        "fallbackSource": null,
        "customSchedule": "0 2 1 * *",
        "notifyOnSuccess": true,
        "notifyOnFailure": true,
        "lastUpdated": "2024-01-10T12:00:00Z"
      },
      {
        "investmentType": "stocks",
        "isEnabled": true,
        "syncFrequency": "hourly",
        "preferredSource": "yahoo_finance",
        "fallbackSource": "alpha_vantage",
        "customSchedule": null,
        "notifyOnSuccess": false,
        "notifyOnFailure": true,
        "lastUpdated": "2024-01-10T12:00:00Z"
      }
    ]
  }
}
```

#### Update Sync Configuration

Updates sync configuration for a specific investment type.

```http
PUT /api/sync/config/{type}
```

**Parameters:**
- `type` (path): Investment type - `mutual_funds`, `epf`, or `stocks`

**Request Body:**
```json
{
  "isEnabled": true,
  "syncFrequency": "daily",
  "preferredSource": "amfi",
  "fallbackSource": "mfcentral",
  "customSchedule": "0 18 * * *",
  "notifyOnSuccess": false,
  "notifyOnFailure": true
}
```

**Request Fields:**
- `isEnabled` (boolean): Enable/disable auto-sync for this investment type
- `syncFrequency` (string): Frequency - `hourly`, `daily`, `weekly`, `monthly`, or `custom`
- `preferredSource` (string): Primary data source
- `fallbackSource` (string, optional): Secondary data source for failover
- `customSchedule` (string, optional): Cron expression for custom frequency
- `notifyOnSuccess` (boolean): Send notifications on successful sync
- `notifyOnFailure` (boolean): Send notifications on sync failures

**Response:**
```json
{
  "success": true,
  "data": {
    "investmentType": "mutual_funds",
    "isEnabled": true,
    "syncFrequency": "daily",
    "preferredSource": "amfi",
    "fallbackSource": "mfcentral",
    "customSchedule": "0 18 * * *",
    "notifyOnSuccess": false,
    "notifyOnFailure": true,
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Credential Management

#### Store Service Credentials

Securely stores encrypted credentials for external services.

```http
POST /api/sync/credentials/{service}
```

**Parameters:**
- `service` (path): Service name - `epfo`, `yahoo_finance`, `nse`, etc.

**Request Body (for EPFO):**
```json
{
  "username": "your-epfo-username",
  "password": "your-epfo-password",
  "uan": "123456789012"
}
```

**Request Body (for API services):**
```json
{
  "apiKey": "your-api-key",
  "apiSecret": "your-api-secret"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "service": "epfo",
    "status": "stored",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Delete Service Credentials

Removes stored credentials for a service.

```http
DELETE /api/sync/credentials/{service}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "service": "epfo",
    "status": "deleted"
  }
}
```

#### Test Service Credentials

Validates stored credentials without performing a full sync.

```http
POST /api/sync/credentials/{service}/test
```

**Response:**
```json
{
  "success": true,
  "data": {
    "service": "epfo",
    "status": "valid",
    "lastTested": "2024-01-15T10:30:00Z",
    "details": {
      "connectionStatus": "success",
      "authenticationStatus": "success",
      "dataAccessStatus": "success"
    }
  }
}
```

### 4. Sync Analytics and Monitoring

#### Get Sync Statistics

Retrieves sync performance statistics and metrics.

```http
GET /api/sync/stats
```

**Query Parameters:**
- `period` (optional): Time period - `day`, `week`, `month`. Default: `week`
- `type` (optional): Investment type filter

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "week",
    "totalSyncs": 42,
    "successfulSyncs": 38,
    "failedSyncs": 4,
    "averageDuration": 1850,
    "totalRecordsProcessed": 630,
    "totalRecordsUpdated": 580,
    "byType": {
      "mutual_funds": {
        "syncs": 21,
        "successRate": 95.2,
        "averageDuration": 2100
      },
      "epf": {
        "syncs": 3,
        "successRate": 100.0,
        "averageDuration": 4500
      },
      "stocks": {
        "syncs": 18,
        "successRate": 83.3,
        "averageDuration": 1200
      }
    },
    "errors": [
      {
        "type": "network_timeout",
        "count": 3,
        "lastOccurrence": "2024-01-14T15:30:00Z"
      }
    ]
  }
}
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `SYNC_IN_PROGRESS` | Sync operation already running | 409 |
| `SYNC_DISABLED` | Sync is disabled for this investment type | 400 |
| `INVALID_CREDENTIALS` | Service credentials are invalid or missing | 401 |
| `RATE_LIMIT_EXCEEDED` | Too many sync requests | 429 |
| `SERVICE_UNAVAILABLE` | External service is unavailable | 503 |
| `DATA_VALIDATION_FAILED` | Received data failed validation | 422 |
| `INSUFFICIENT_DATA` | Not enough data to perform sync | 400 |
| `CONFIGURATION_ERROR` | Invalid sync configuration | 400 |

## Webhooks

### Sync Completion Webhook

When enabled, the system sends POST requests to your configured webhook URL when sync operations complete.

**Webhook Payload:**
```json
{
  "event": "sync.completed",
  "timestamp": "2024-01-15T18:00:02Z",
  "data": {
    "userId": "user_123456",
    "syncType": "mutual_funds",
    "syncId": "sync_123456789",
    "status": "success",
    "recordsProcessed": 15,
    "recordsUpdated": 12,
    "duration": 2340,
    "errors": []
  }
}
```

**Webhook Configuration:**
```http
PUT /api/sync/webhooks
```

```json
{
  "url": "https://your-app.com/webhooks/sync",
  "events": ["sync.completed", "sync.failed"],
  "secret": "your-webhook-secret"
}
```

## SDK Examples

### JavaScript/Node.js

```javascript
const FinVistaSync = require('@finvista/sync-sdk');

const client = new FinVistaSync({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.finvista.com'
});

// Trigger manual sync
const result = await client.sync.trigger('mutual_funds', {
  force: true
});

// Get sync status
const status = await client.sync.getStatus('mutual_funds');

// Update configuration
await client.sync.updateConfig('mutual_funds', {
  isEnabled: true,
  syncFrequency: 'daily'
});
```

### Python

```python
from finvista_sync import SyncClient

client = SyncClient(
    api_key='your-api-key',
    base_url='https://api.finvista.com'
)

# Trigger manual sync
result = client.sync.trigger('mutual_funds', force=True)

# Get sync status
status = client.sync.get_status('mutual_funds')

# Update configuration
client.sync.update_config('mutual_funds', {
    'isEnabled': True,
    'syncFrequency': 'daily'
})
```

## Testing

### Test Environment

Use the following base URL for testing:
```
https://api-staging.finvista.com
```

### Mock Data

Test endpoints return mock data that simulates real sync operations without making actual API calls to external services.

### Rate Limits

Test environment has relaxed rate limits:
- Manual sync: 100 requests per hour
- Configuration: 200 requests per hour
- Status queries: 1000 requests per hour

## Support

For API support and questions:
- Documentation: https://docs.finvista.com/sync-api
- Support Email: api-support@finvista.com
- GitHub Issues: https://github.com/finvista/sync-integration/issues