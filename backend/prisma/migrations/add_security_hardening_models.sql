-- Add security hardening models for enhanced credential management and key rotation

-- Key Store table for secure key management
CREATE TABLE "key_store" (
    "id" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "rotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "key_store_pkey" PRIMARY KEY ("id")
);

-- Credential Backup table for storing old credentials during rotation
CREATE TABLE "credential_backups" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "backupId" TEXT NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credential_backups_pkey" PRIMARY KEY ("id")
);

-- Credential Rotation Log for tracking rotation events
CREATE TABLE "credential_rotation_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credential_rotation_logs_pkey" PRIMARY KEY ("id")
);

-- Scheduled Rotation table for managing automatic rotations
CREATE TABLE "scheduled_rotations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "scheduled_rotations_pkey" PRIMARY KEY ("id")
);

-- Notification Log for tracking security notifications
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "service" TEXT,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes for key_store
CREATE INDEX "key_store_keyId_idx" ON "key_store"("keyId");
CREATE INDEX "key_store_purpose_idx" ON "key_store"("purpose");
CREATE INDEX "key_store_isActive_idx" ON "key_store"("isActive");
CREATE INDEX "key_store_expiresAt_idx" ON "key_store"("expiresAt");

-- Create indexes for credential_backups
CREATE UNIQUE INDEX "credential_backups_backupId_key" ON "credential_backups"("backupId");
CREATE INDEX "credential_backups_userId_idx" ON "credential_backups"("userId");
CREATE INDEX "credential_backups_service_idx" ON "credential_backups"("service");
CREATE INDEX "credential_backups_expiresAt_idx" ON "credential_backups"("expiresAt");

-- Create indexes for credential_rotation_logs
CREATE INDEX "credential_rotation_logs_userId_idx" ON "credential_rotation_logs"("userId");
CREATE INDEX "credential_rotation_logs_service_idx" ON "credential_rotation_logs"("service");
CREATE INDEX "credential_rotation_logs_status_idx" ON "credential_rotation_logs"("status");
CREATE INDEX "credential_rotation_logs_timestamp_idx" ON "credential_rotation_logs"("timestamp");

-- Create indexes for scheduled_rotations
CREATE INDEX "scheduled_rotations_scheduledFor_idx" ON "scheduled_rotations"("scheduledFor");
CREATE INDEX "scheduled_rotations_status_idx" ON "scheduled_rotations"("status");
CREATE INDEX "scheduled_rotations_userId_service_idx" ON "scheduled_rotations"("userId", "service");

-- Create indexes for notification_logs
CREATE INDEX "notification_logs_userId_idx" ON "notification_logs"("userId");
CREATE INDEX "notification_logs_type_idx" ON "notification_logs"("type");
CREATE INDEX "notification_logs_sentAt_idx" ON "notification_logs"("sentAt");

-- Account Lock table for service-specific account locks
CREATE TABLE "account_locks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockUntil" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "account_locks_pkey" PRIMARY KEY ("id")
);

-- Rate Limit Log table for tracking rate limit violations
CREATE TABLE "rate_limit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "limitType" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_logs_pkey" PRIMARY KEY ("id")
);

-- Suspicious Activity table for security monitoring
CREATE TABLE "suspicious_activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "investigated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "suspicious_activities_pkey" PRIMARY KEY ("id")
);

-- IP Block table for blocking malicious IPs
CREATE TABLE "ip_blocks" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "blockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ip_blocks_pkey" PRIMARY KEY ("id")
);

-- User Lock table for temporary user account locks
CREATE TABLE "user_locks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_locks_pkey" PRIMARY KEY ("id")
);

-- Security Alert table for administrative alerts
CREATE TABLE "security_alerts" (
    "id" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "details" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "security_alerts_pkey" PRIMARY KEY ("id")
);

-- Sync Operation Log table for tracking sync operations
CREATE TABLE "sync_operation_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_operation_logs_pkey" PRIMARY KEY ("id")
);

-- User Consent table for GDPR compliance
CREATE TABLE "user_consents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- Data Deletion Log table for tracking data deletions
CREATE TABLE "data_deletion_logs" (
    "id" TEXT NOT NULL,
    "originalUserId" TEXT NOT NULL,
    "anonymizedId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "deletionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordsCounts" TEXT NOT NULL,

    CONSTRAINT "data_deletion_logs_pkey" PRIMARY KEY ("id")
);

-- Data Export Log table for tracking data exports
CREATE TABLE "data_export_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exportDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataSize" INTEGER,
    "format" TEXT NOT NULL DEFAULT 'json',
    "status" TEXT NOT NULL DEFAULT 'completed',
    "downloadUrl" TEXT,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "data_export_logs_pkey" PRIMARY KEY ("id")
);

-- Data Archival Log table for tracking archival operations
CREATE TABLE "data_archival_logs" (
    "id" TEXT NOT NULL,
    "archivalDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalRecordsArchived" INTEGER NOT NULL DEFAULT 0,
    "archiveFiles" TEXT NOT NULL,
    "errors" TEXT,

    CONSTRAINT "data_archival_logs_pkey" PRIMARY KEY ("id")
);

-- Create additional indexes for account_locks
CREATE UNIQUE INDEX "account_locks_userId_service_key" ON "account_locks"("userId", "service");
CREATE INDEX "account_locks_userId_idx" ON "account_locks"("userId");
CREATE INDEX "account_locks_lockUntil_idx" ON "account_locks"("lockUntil");

-- Create indexes for rate_limit_logs
CREATE INDEX "rate_limit_logs_userId_idx" ON "rate_limit_logs"("userId");
CREATE INDEX "rate_limit_logs_ipAddress_idx" ON "rate_limit_logs"("ipAddress");
CREATE INDEX "rate_limit_logs_limitType_idx" ON "rate_limit_logs"("limitType");
CREATE INDEX "rate_limit_logs_timestamp_idx" ON "rate_limit_logs"("timestamp");

-- Create indexes for suspicious_activities
CREATE INDEX "suspicious_activities_userId_idx" ON "suspicious_activities"("userId");
CREATE INDEX "suspicious_activities_ipAddress_idx" ON "suspicious_activities"("ipAddress");
CREATE INDEX "suspicious_activities_activityType_idx" ON "suspicious_activities"("activityType");
CREATE INDEX "suspicious_activities_severity_idx" ON "suspicious_activities"("severity");
CREATE INDEX "suspicious_activities_timestamp_idx" ON "suspicious_activities"("timestamp");

-- Create indexes for ip_blocks
CREATE INDEX "ip_blocks_ipAddress_idx" ON "ip_blocks"("ipAddress");
CREATE INDEX "ip_blocks_expiresAt_idx" ON "ip_blocks"("expiresAt");
CREATE INDEX "ip_blocks_isActive_idx" ON "ip_blocks"("isActive");

-- Create indexes for user_locks
CREATE INDEX "user_locks_userId_idx" ON "user_locks"("userId");
CREATE INDEX "user_locks_expiresAt_idx" ON "user_locks"("expiresAt");
CREATE INDEX "user_locks_isActive_idx" ON "user_locks"("isActive");

-- Create indexes for security_alerts
CREATE INDEX "security_alerts_alertType_idx" ON "security_alerts"("alertType");
CREATE INDEX "security_alerts_severity_idx" ON "security_alerts"("severity");
CREATE INDEX "security_alerts_timestamp_idx" ON "security_alerts"("timestamp");
CREATE INDEX "security_alerts_acknowledged_idx" ON "security_alerts"("acknowledged");

-- Create indexes for sync_operation_logs
CREATE INDEX "sync_operation_logs_userId_idx" ON "sync_operation_logs"("userId");
CREATE INDEX "sync_operation_logs_ipAddress_idx" ON "sync_operation_logs"("ipAddress");
CREATE INDEX "sync_operation_logs_syncType_idx" ON "sync_operation_logs"("syncType");
CREATE INDEX "sync_operation_logs_success_idx" ON "sync_operation_logs"("success");
CREATE INDEX "sync_operation_logs_timestamp_idx" ON "sync_operation_logs"("timestamp");

-- Create indexes for user_consents
CREATE INDEX "user_consents_userId_idx" ON "user_consents"("userId");
CREATE INDEX "user_consents_consentType_idx" ON "user_consents"("consentType");
CREATE INDEX "user_consents_timestamp_idx" ON "user_consents"("timestamp");

-- Create indexes for data_deletion_logs
CREATE UNIQUE INDEX "data_deletion_logs_anonymizedId_key" ON "data_deletion_logs"("anonymizedId");
CREATE INDEX "data_deletion_logs_originalUserId_idx" ON "data_deletion_logs"("originalUserId");
CREATE INDEX "data_deletion_logs_deletionDate_idx" ON "data_deletion_logs"("deletionDate");

-- Create indexes for data_export_logs
CREATE INDEX "data_export_logs_userId_idx" ON "data_export_logs"("userId");
CREATE INDEX "data_export_logs_exportDate_idx" ON "data_export_logs"("exportDate");
CREATE INDEX "data_export_logs_status_idx" ON "data_export_logs"("status");

-- Create indexes for data_archival_logs
CREATE INDEX "data_archival_logs_archivalDate_idx" ON "data_archival_logs"("archivalDate");