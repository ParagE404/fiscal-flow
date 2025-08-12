# Sync Status UI Components

This directory contains the Frontend Sync Status UI Components for the Auto-Sync Integration feature. These components provide a comprehensive interface for displaying sync status, managing manual sync operations, and viewing sync history.

## Components Overview

### 1. Sync Status Display Components (`SyncStatusIndicator.jsx`)

**Requirements Fulfilled: 7.1, 7.2, 7.9**

#### `SyncStatusIndicator`
- Color-coded status indicators (green=synced, red=failed, blue=in progress)
- "Last Synced" timestamp with relative time formatting
- Manual sync button with loading states
- Tooltip with detailed status information
- Configurable size and appearance

#### `SyncStatusBadge`
- Compact badge version for different investment types
- Investment type icons (📈 for MF, 🏦 for EPF, 📊 for stocks)
- Status-based color coding
- Tooltip with sync details

#### `InvestmentTypeSyncStatus`
- Complete status display for specific investment types
- Combines type information with sync status
- Integrated manual sync controls

### 2. Manual Sync Controls (`ManualSyncControls.jsx`)

**Requirements Fulfilled: 7.5, 7.2, 7.3**

#### `SyncNowButton`
- Individual sync buttons for each investment type
- Loading spinners during sync operations
- Responsive design (full label on desktop, short on mobile)
- Disabled state handling

#### `SyncConfirmationDialog`
- Confirmation dialogs with estimated completion times
- Investment type-specific information
- Data source indicators
- Loading states during sync

#### `SyncProgressIndicator`
- Real-time progress indicators during sync operations
- Step-by-step progress tracking
- Investment type-specific progress steps
- Visual progress bars and status updates

#### `ManualSyncPanel`
- Complete manual sync control panel
- All investment types in one interface
- Progress tracking for active syncs
- Integrated confirmation dialogs

### 3. Sync History and Error Display (`SyncHistoryDisplay.jsx`)

**Requirements Fulfilled: 7.4, 7.8, 12.4, 12.5**

#### `SyncHistoryItem`
- Individual sync history entries
- Expandable error details and troubleshooting
- Status-based color coding
- Comprehensive sync information display

#### `SyncHistoryFilters`
- Search functionality across sync history
- Filter by status (success, failed, partial)
- Filter by investment type
- Date range filtering (today, week, month)

#### `SyncHistoryDisplay`
- Complete sync history interface
- Integrated filtering and search
- Status count summaries
- Refresh functionality
- Empty state handling

## Usage Examples

### Basic Status Indicator
```jsx
import { SyncStatusIndicator } from '@/components/sync'

<SyncStatusIndicator
  syncStatus="synced"
  syncType="mutual_funds"
  lastSyncAt={new Date()}
  onManualSync={() => handleSync('mutual_funds')}
/>
```

### Manual Sync Panel
```jsx
import { ManualSyncPanel } from '@/components/sync'

<ManualSyncPanel
  onSync={handleManualSync}
  syncStates={{
    mutual_funds: { status: 'synced', lastSyncAt: new Date() },
    epf: { status: 'failed', lastSyncAt: new Date() },
    stocks: { status: 'in_progress', progress: 65 }
  }}
/>
```

### Sync History
```jsx
import { SyncHistoryDisplay } from '@/components/sync'

<SyncHistoryDisplay
  syncHistory={syncHistoryData}
  onRefresh={handleRefreshHistory}
/>
```

### Complete Dashboard
```jsx
import { SyncDashboard } from '@/components/sync/SyncDashboard'

<SyncDashboard />
```

## Features

### Status Indicators
- ✅ Color-coded status (green, red, blue, orange, gray)
- ✅ Investment type icons and labels
- ✅ Relative timestamp formatting
- ✅ Tooltip with detailed information
- ✅ Responsive design

### Manual Sync Controls
- ✅ Confirmation dialogs with estimated times
- ✅ Loading states and progress indicators
- ✅ Real-time progress tracking
- ✅ Step-by-step sync progress
- ✅ Error handling and recovery

### Sync History
- ✅ Comprehensive history display
- ✅ Advanced filtering and search
- ✅ Expandable error details
- ✅ Troubleshooting guidance
- ✅ Status summaries and counts

### Error Handling
- ✅ User-friendly error messages
- ✅ Context-aware troubleshooting steps
- ✅ Technical details for debugging
- ✅ Error type-specific guidance

## Dependencies

- `date-fns` - Date formatting and relative time
- `@radix-ui/react-collapsible` - Expandable content
- `@radix-ui/react-dialog` - Modal dialogs
- `@radix-ui/react-tooltip` - Tooltips
- `@radix-ui/react-tabs` - Tab interface
- `lucide-react` - Icons
- `mobx-react-lite` - State management

## Testing

Tests are included in `__tests__/SyncStatusIndicator.test.jsx` covering:
- Status indicator rendering
- Badge display with icons
- Different sync states
- Component props handling

Run tests with:
```bash
npm test -- --run src/components/sync
```

## Integration

These components are designed to integrate with:
- Backend sync services (tasks 2-7)
- Sync settings UI (task 9)
- Investment form updates (task 10)
- The broader auto-sync integration system

The components expect sync data in the following format:
```typescript
interface SyncState {
  status: 'manual' | 'synced' | 'failed' | 'in_progress' | 'stale' | 'disabled'
  lastSyncAt?: Date
  progress?: number
  currentStep?: string
  currentStepIndex?: number
  totalSteps?: number
}

interface SyncHistoryRecord {
  timestamp: Date
  investmentType: 'mutual_funds' | 'epf' | 'stocks'
  status: 'success' | 'failed' | 'partial'
  recordsProcessed?: number
  recordsUpdated?: number
  duration?: number
  source?: string
  error?: {
    type: string
    message: string
    details?: any
  }
}
```