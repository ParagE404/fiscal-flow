# Implementation Plan

- [x] 1. Database Schema Extensions for Sync Metadata

  - Extend Prisma schema with SyncMetadata, SyncConfiguration, and EncryptedCredentials models
  - Add sync-related fields to existing MutualFund, EPFAccount, and Stock models (isin, lastSyncAt, syncStatus, manualOverride)
  - Create and run database migrations to add new tables and columns
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 6.1, 9.1_

- [x] 1.1 Create Sync Metadata Models

  - Add SyncMetadata model to track sync status, timestamps, and errors for each investment
  - Add SyncConfiguration model to store user preferences for sync frequency and data sources
  - Add EncryptedCredentials model for secure storage of user credentials for external services
  - _Requirements: 4.1, 6.1, 11.1, 12.1_

- [x] 1.2 Extend Investment Models with Sync Fields

  - Add ISIN, schemeCode, lastSyncAt, syncStatus, and manualOverride fields to MutualFund model
  - Add UAN, lastSyncAt, syncStatus, and manualOverride fields to EPFAccount model
  - Add exchange, ISIN, lastSyncAt, syncStatus, and manualOverride fields to Stock model
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 1.3 Create Database Indexes for Sync Operations

  - Add indexes on sync-related fields for efficient querying (syncStatus, lastSyncAt, ISIN, UAN)
  - Create partial indexes for enabled sync configurations and active sync operations
  - Add composite indexes for user-specific sync metadata queries
  - _Requirements: 10.4, 10.5_

- [x] 2. Core Sync Service Infrastructure

  - Create base interfaces and abstract classes for data providers and sync services
  - Implement credential management service with encryption/decryption capabilities
  - Create sync result models and error handling structures
  - _Requirements: 5.1, 5.2, 6.1, 6.2, 8.1, 8.2_

- [x] 2.1 Define Sync Service Interfaces

  - Create DataProvider interface with methods for authentication, data fetching, and validation
  - Create SyncService interface with sync, syncSingle, and configuration validation methods
  - Define SyncResult, SyncOptions, and SyncError types for consistent API responses
  - _Requirements: 5.1, 5.2, 8.1_

- [x] 2.2 Implement Credential Management Service

  - Create CredentialService class with AES-256-GCM encryption for secure credential storage
  - Implement storeCredentials and getCredentials methods with proper error handling
  - Add credential validation and key rotation support for enhanced security
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 2.3 Create Base Sync Service Class

  - Implement abstract BaseSyncService with common functionality for all sync types
  - Add methods for updating sync metadata, handling errors, and managing sync status
  - Create utility methods for data validation, transformation, and conflict resolution
  - _Requirements: 8.1, 8.2, 9.1, 9.2_

- [x] 3. Mutual Fund Sync Implementation

  - Create AMFI data provider for fetching daily NAV data from CSV feed
  - Implement MutualFundSyncService with NAV matching and value calculation logic
  - Add support for handling missing NAV data and scheme mergers
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 3.1 AMFI Data Provider Implementation

  - Create AMFIDataProvider class that fetches and parses NAV data from AMFI CSV feed
  - Implement CSV parsing logic to extract scheme code, ISIN, scheme name, NAV, and date
  - Add data validation to ensure NAV values are positive and dates are valid
  - _Requirements: 1.1, 1.4, 9.1, 9.2_

- [x] 3.2 Mutual Fund Sync Service

  - Create MutualFundSyncService that matches user funds with NAV data using ISIN codes
  - Implement current value calculation based on invested amount and latest NAV
  - Add CAGR calculation logic for performance tracking and returns display
  - _Requirements: 1.2, 1.3, 1.8, 9.3_

- [x] 3.3 Handle Missing NAV Data and Edge Cases

  - Implement fallback logic for missing NAV data during holidays and weekends
  - Add handling for scheme mergers and ISIN changes with proper logging
  - Create manual override functionality to prevent automatic updates when needed
  - _Requirements: 1.4, 1.8, 8.1, 8.2_

- [x] 4. EPF Sync Implementation

  - Create EPFO data provider for fetching balance and contribution data
  - Implement EPFSyncService with secure credential handling and data parsing
  - Add support for multiple UAN accounts and contribution aggregation
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 4.1 EPFO Data Provider Implementation

  - Create EPFODataProvider class for connecting to EPFO Member Passbook portal
  - Implement secure authentication using encrypted user credentials
  - Add data extraction logic for balance, contributions, and interest accrual information
  - _Requirements: 2.1, 2.2, 6.1, 6.2_

- [x] 4.2 EPF Sync Service

  - Create EPFSyncService that processes multiple EPF accounts per user
  - Implement contribution parsing for employee share, employer share, and pension fund
  - Add aggregation logic for total EPF balance across all accounts
  - _Requirements: 2.3, 2.4, 2.8_

- [x] 4.3 EPF Error Handling and Fallbacks

  - Implement retry logic with exponential backoff for EPFO portal connectivity issues
  - Add manual override capability when automatic sync fails repeatedly
  - Create notification system for sync failures and credential expiration
  - _Requirements: 2.5, 2.6, 8.1, 8.3_

- [x] 5. Stock Price Sync Implementation

  - Create Yahoo Finance and NSE data providers for stock price fetching
  - Implement StockSyncService with price caching and rate limit handling
  - Add market hours detection and P&L calculation logic
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 5.1 Stock Price Data Providers

  - Create YahooFinanceProvider class for fetching NSE/BSE stock prices
  - Create NSEDataProvider as alternative data source with proper API integration
  - Implement symbol formatting for different exchanges (NSE, BSE) and stock types
  - _Requirements: 3.1, 3.2, 5.5, 5.9_

- [x] 5.2 Stock Sync Service with Caching

  - Create StockSyncService with intelligent price caching to respect API rate limits
  - Implement market hours detection for Indian stock exchanges (9:15 AM - 3:30 PM IST)
  - Add cache invalidation logic based on market hours and data freshness requirements
  - _Requirements: 3.3, 3.4, 10.1, 10.6_

- [x] 5.3 P&L Calculation and Price Updates

  - Implement automatic P&L calculation when stock prices are updated
  - Add current value calculation: (current price × quantity) for portfolio tracking
  - Create P&L percentage calculation: ((current value - invested amount) / invested amount) × 100
  - _Requirements: 3.3, 3.8, 9.3_

- [x] 6. Background Job Scheduler Implementation

  - Set up node-cron based job scheduler with Indian timezone support
  - Create scheduled jobs for daily MF sync, monthly EPF sync, and hourly stock sync
  - Implement job queue management and prevent overlapping executions
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 6.1 Job Scheduler Core Setup

  - Create JobScheduler class using node-cron with Asia/Kolkata timezone configuration
  - Implement job registration system for different sync types with customizable schedules
  - Add job status tracking and execution logging for monitoring and debugging
  - _Requirements: 4.1, 4.7, 4.8, 12.1, 12.2_

- [x] 6.2 Scheduled Sync Jobs Configuration

  - Create daily mutual fund sync job scheduled at 6 PM IST (after market close)
  - Create monthly EPF sync job scheduled on 1st of each month at 2 AM IST
  - Create hourly stock sync job that runs only during market hours (9 AM - 3:30 PM IST)
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 6.3 Job Queue Management and Error Handling

  - Implement job locking mechanism to prevent overlapping executions of same sync type
  - Add retry logic with exponential backoff for failed job executions
  - Create job persistence to resume scheduled jobs after system restarts
  - _Requirements: 4.5, 4.6, 4.7, 8.1, 8.3_

- [x] 7. API Endpoints for Sync Management

  - Create REST API endpoints for manual sync triggers and sync status queries
  - Implement sync configuration endpoints for user preferences management
  - Add credential management endpoints with proper security and validation
  - _Requirements: 7.1, 7.5, 7.8, 11.1, 11.2, 11.7_

- [x] 7.1 Manual Sync API Endpoints

  - Create POST /api/sync/:type endpoint for triggering manual sync operations
  - Create GET /api/sync/:type/status endpoint for retrieving sync status and history
  - Add proper authentication and rate limiting to prevent abuse of manual sync features
  - _Requirements: 7.5, 7.8, 12.3_

- [x] 7.2 Sync Configuration API Endpoints

  - Create GET /api/sync/config endpoint for retrieving user sync preferences
  - Create PUT /api/sync/config endpoint for updating sync settings and schedules
  - Add validation for sync frequency, data source preferences, and notification settings
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 7.3 Credential Management API Endpoints

  - Create POST /api/sync/credentials/:service endpoint for storing encrypted credentials
  - Create DELETE /api/sync/credentials/:service endpoint for removing stored credentials
  - Add credential validation and secure transmission using HTTPS only
  - _Requirements: 6.1, 6.7, 11.7_

- [x] 8. Frontend Sync Status UI Components

  - Create SyncStatusIndicator component to display sync status and timestamps
  - Implement manual sync buttons with loading states and progress indicators
  - Add sync history display with error details and troubleshooting guidance
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.9_

- [x] 8.1 Sync Status Display Components

  - Create SyncStatusIndicator component with color-coded status (green=synced, red=failed, blue=in progress)
  - Add "Last Synced" timestamp display with relative time formatting (e.g., "2 hours ago")
  - Implement sync status badges for different investment types with appropriate icons
  - _Requirements: 7.1, 7.2, 7.9_

- [x] 8.2 Manual Sync Controls

  - Create "Sync Now" buttons for each investment type with loading spinners
  - Add confirmation dialogs for manual sync operations with estimated completion time
  - Implement sync progress indicators and real-time status updates during sync operations
  - _Requirements: 7.5, 7.2, 7.3_

- [x] 8.3 Sync History and Error Display

  - Create sync history component showing past sync attempts with timestamps and results
  - Add error message display with user-friendly explanations and troubleshooting steps
  - Implement sync log filtering and search functionality for debugging purposes
  - _Requirements: 7.4, 7.8, 12.4, 12.5_

- [x] 9. Sync Settings and Configuration UI

  - Create sync settings page for enabling/disabling auto-sync per investment type
  - Implement credential management forms with secure input handling
  - Add sync frequency customization and notification preference controls
  - _Requirements: 7.6, 11.1, 11.3, 11.8_

- [x] 9.1 Sync Settings Page Implementation

  - Create sync settings page with toggle switches for each investment type (MF, EPF, Stocks)
  - Add sync frequency selection (daily, hourly, monthly) with custom schedule options
  - Implement data source preference selection with fallback source configuration
  - _Requirements: 7.6, 11.1, 11.2, 11.5_

- [x] 9.2 Credential Management Forms

  - Create secure credential input forms for EPFO login details with proper validation
  - Add API key management interface for stock price data sources (Yahoo Finance, NSE)
  - Implement credential update and deletion functionality with confirmation dialogs
  - _Requirements: 6.7, 11.7, 6.8_

- [x] 9.3 Notification and Alert Settings

  - Create notification preference controls for sync success/failure alerts
  - Add email notification settings for sync errors and credential expiration warnings
  - Implement sync threshold configuration for data validation alerts and anomaly detection
  - _Requirements: 11.3, 11.6, 8.9_

- [x] 10. Investment Form Updates for Sync Integration

  - Update mutual fund forms to include ISIN code input for auto-sync capability
  - Update EPF forms to include UAN field for automatic balance synchronization
  - Update stock forms to include exchange selection and symbol validation
  - _Requirements: 1.7, 2.9, 3.5_

- [x] 10.1 Mutual Fund Form Enhancements

  - Add ISIN code input field to Add Fund modal with validation and format checking
  - Add scheme code field as alternative identifier for NAV matching
  - Implement auto-sync toggle per fund with manual override capability
  - _Requirements: 1.7, 1.8_

- [x] 10.2 EPF Form Enhancements

  - Add UAN (Universal Account Number) field to EPF account forms with validation
  - Add sync configuration toggle for each EPF account with credential requirement check
  - Implement employer-specific sync settings for multiple EPF accounts
  - _Requirements: 2.9, 2.4_

- [x] 10.3 Stock Form Enhancements

  - Add exchange selection dropdown (NSE, BSE) to stock entry forms
  - Add ISIN field for additional stock identification and validation
  - Implement symbol validation against exchange listings with auto-completion
  - _Requirements: 3.5, 3.7_

- [x] 11. Data Validation and Integrity Checks

  - Implement data validation rules for synced values (reasonable price changes, business rules)
  - Create anomaly detection for unusual NAV changes and stock price movements
  - Add data integrity checks and audit trails for all sync operations
  - _Requirements: 9.1, 9.2, 9.3, 9.6, 9.7_

- [x] 11.1 Sync Data Validation Rules

  - Create validation rules for NAV changes (flag changes > 10% in single day)
  - Add stock price validation against market hours and trading status
  - Implement EPF contribution validation against salary limits and regulatory rules
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 11.2 Anomaly Detection and Alerts

  - Create anomaly detection system for unusual price movements and data inconsistencies
  - Add automatic flagging of suspicious data with admin notification system
  - Implement data quarantine mechanism for failed validation checks
  - _Requirements: 9.7, 8.9_

- [x] 11.3 Audit Trail and Data History

  - Create comprehensive audit logging for all sync operations with timestamps and user context
  - Add data change history tracking for investment values and sync metadata
  - Implement audit trail export functionality for compliance and debugging purposes
  - _Requirements: 9.6, 12.1, 12.10_

- [x] 12. Error Handling and Recovery Systems

  - Implement comprehensive error handling with retry logic and exponential backoff
  - Create fallback mechanisms for primary data source failures
  - Add error recovery strategies and manual intervention workflows
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 12.1 Retry Logic and Backoff Strategies

  - Create withRetry utility function with configurable retry attempts and delay strategies
  - Implement exponential backoff for network timeouts and temporary service failures
  - Add circuit breaker pattern for persistent API failures to prevent system overload
  - _Requirements: 8.1, 8.3, 8.7_

- [x] 12.2 Fallback Data Source Management

  - Implement automatic fallback to secondary data sources when primary sources fail
  - Create data source health monitoring and automatic switching logic
  - Add manual data source selection override for troubleshooting purposes
  - _Requirements: 5.5, 8.5_

- [x] 12.3 Error Recovery and Manual Intervention

  - Create error recovery service with context-aware recovery strategies
  - Implement manual intervention workflows for authentication failures and data conflicts
  - Add error escalation system for persistent failures requiring user attention
  - _Requirements: 8.2, 8.6, 8.9, 8.10_

- [ ] 13. Performance Optimization and Caching

  - Implement intelligent caching strategies for API responses and computed values
  - Add database query optimization for sync operations and metadata queries
  - Create batch processing for large datasets and concurrent user sync operations
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 13.1 API Response Caching System

  - Create SyncCache class with TTL-based caching for API responses
  - Implement cache invalidation strategies based on data freshness and market hours
  - Add cache warming for frequently accessed data and predictive caching
  - _Requirements: 10.5, 10.6_

- [ ] 13.2 Database Query Optimization

  - Optimize sync metadata queries with proper indexing and query planning
  - Implement connection pooling for concurrent sync operations
  - Add query batching for bulk updates and efficient data processing
  - _Requirements: 10.3, 10.4, 10.8_

- [ ] 13.3 Batch Processing and Concurrency

  - Implement batch processing for large user bases and multiple investment updates
  - Add queue management for concurrent sync operations with priority handling
  - Create memory-efficient streaming for large dataset processing
  - _Requirements: 10.1, 10.2, 10.7, 10.9_

- [ ] 14. Security Hardening and Compliance

  - Implement additional security measures for credential storage and API communication
  - Add rate limiting and abuse prevention for sync operations
  - Create compliance features for audit trails and data protection
  - _Requirements: 6.6, 6.8, 6.9, 6.10_

- [ ] 14.1 Enhanced Security Measures

  - Add API request signing and verification for external service communications
  - Implement credential rotation policies and expiration handling
  - Create secure key management system with environment-based key storage
  - _Requirements: 6.4, 6.5, 6.6_

- [ ] 14.2 Rate Limiting and Abuse Prevention

  - Implement user-specific rate limiting for manual sync operations
  - Add IP-based rate limiting for API endpoints with configurable thresholds
  - Create suspicious activity detection and automatic account protection
  - _Requirements: 6.6, 8.4_

- [ ] 14.3 Compliance and Data Protection

  - Add GDPR-compliant data handling with user consent management
  - Implement data retention policies for sync logs and historical data
  - Create data export functionality for user data portability requirements
  - _Requirements: 6.9, 6.10, 11.9_

- [ ] 15. Testing and Quality Assurance

  - Create comprehensive unit tests for all sync services and data providers
  - Implement integration tests for end-to-end sync workflows
  - Add performance tests for concurrent operations and large datasets
  - _Requirements: All testing requirements_

- [ ] 15.1 Unit Testing for Sync Services

  - Create unit tests for MutualFundSyncService with mocked data providers
  - Add unit tests for EPFSyncService and StockSyncService with error scenarios
  - Implement tests for credential management and encryption/decryption functionality
  - _Requirements: 5.8, 8.1, 8.2_

- [ ] 15.2 Integration Testing for Sync Workflows

  - Create integration tests for complete sync workflows from API call to database update
  - Add tests for job scheduler functionality and cron job execution
  - Implement tests for error handling and recovery scenarios with real API mocking
  - _Requirements: 4.7, 8.1, 8.6_

- [ ] 15.3 Performance and Load Testing

  - Create performance tests for concurrent sync operations and database load
  - Add load tests for API endpoints under high user traffic scenarios
  - Implement memory and resource usage tests for background job processing
  - _Requirements: 10.8, 10.9_

- [ ] 16. Documentation and Deployment

  - Create comprehensive documentation for API setup, credentials, and troubleshooting
  - Update deployment scripts and environment configuration for sync functionality
  - Add monitoring and alerting setup for production sync operations
  - _Requirements: 12.8, 12.9_

- [ ] 16.1 API Documentation and Setup Guides

  - Create detailed documentation for setting up external API credentials (AMFI, EPFO, Yahoo Finance)
  - Add troubleshooting guide for common sync issues and error resolution
  - Implement API endpoint documentation with request/response examples
  - _Requirements: User documentation requirements_

- [ ] 16.2 Deployment Configuration

  - Update Docker configuration and environment variables for sync functionality
  - Add production deployment scripts with proper secret management
  - Create database migration scripts for production schema updates
  - _Requirements: Deployment requirements_

- [ ] 16.3 Monitoring and Alerting Setup

  - Implement application monitoring for sync job health and performance metrics
  - Add alerting for sync failures, API downtime, and system resource usage
  - Create dashboard for sync operation monitoring and system health visualization
  - _Requirements: 12.8, 12.9_
