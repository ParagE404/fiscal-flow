-- CreateTable
CREATE TABLE "job_configurations" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "condition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_executions" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "usersProcessed" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "auditType" TEXT NOT NULL,
    "investmentType" TEXT,
    "investmentId" TEXT,
    "source" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "credential_rotation_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credential_rotation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "service" TEXT,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_locks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockUntil" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "account_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "ip_blocks" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "blockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ip_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_locks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "data_deletion_logs" (
    "id" TEXT NOT NULL,
    "originalUserId" TEXT NOT NULL,
    "anonymizedId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "deletionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordsCounts" TEXT NOT NULL,

    CONSTRAINT "data_deletion_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_retention_logs" (
    "id" TEXT NOT NULL,
    "cleanupDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordsCleaned" TEXT NOT NULL,
    "totalRecordsCleaned" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "data_retention_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "data_archival_logs" (
    "id" TEXT NOT NULL,
    "archivalDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalRecordsArchived" INTEGER NOT NULL DEFAULT 0,
    "archiveFiles" TEXT NOT NULL,
    "errors" TEXT,

    CONSTRAINT "data_archival_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_configurations_jobName_key" ON "job_configurations"("jobName");

-- CreateIndex
CREATE INDEX "job_configurations_jobName_idx" ON "job_configurations"("jobName");

-- CreateIndex
CREATE INDEX "job_configurations_syncType_idx" ON "job_configurations"("syncType");

-- CreateIndex
CREATE INDEX "job_configurations_enabled_idx" ON "job_configurations"("enabled");

-- CreateIndex
CREATE INDEX "job_executions_jobName_idx" ON "job_executions"("jobName");

-- CreateIndex
CREATE INDEX "job_executions_status_idx" ON "job_executions"("status");

-- CreateIndex
CREATE INDEX "job_executions_startTime_idx" ON "job_executions"("startTime");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_auditType_idx" ON "audit_logs"("auditType");

-- CreateIndex
CREATE INDEX "audit_logs_investmentType_idx" ON "audit_logs"("investmentType");

-- CreateIndex
CREATE INDEX "audit_logs_investmentId_idx" ON "audit_logs"("investmentId");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_userId_investmentType_investmentId_idx" ON "audit_logs"("userId", "investmentType", "investmentId");

-- CreateIndex
CREATE INDEX "key_store_keyId_idx" ON "key_store"("keyId");

-- CreateIndex
CREATE INDEX "key_store_purpose_idx" ON "key_store"("purpose");

-- CreateIndex
CREATE INDEX "key_store_isActive_idx" ON "key_store"("isActive");

-- CreateIndex
CREATE INDEX "key_store_expiresAt_idx" ON "key_store"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "credential_backups_backupId_key" ON "credential_backups"("backupId");

-- CreateIndex
CREATE INDEX "credential_backups_userId_idx" ON "credential_backups"("userId");

-- CreateIndex
CREATE INDEX "credential_backups_service_idx" ON "credential_backups"("service");

-- CreateIndex
CREATE INDEX "credential_backups_expiresAt_idx" ON "credential_backups"("expiresAt");

-- CreateIndex
CREATE INDEX "credential_rotation_logs_userId_idx" ON "credential_rotation_logs"("userId");

-- CreateIndex
CREATE INDEX "credential_rotation_logs_service_idx" ON "credential_rotation_logs"("service");

-- CreateIndex
CREATE INDEX "credential_rotation_logs_status_idx" ON "credential_rotation_logs"("status");

-- CreateIndex
CREATE INDEX "credential_rotation_logs_timestamp_idx" ON "credential_rotation_logs"("timestamp");

-- CreateIndex
CREATE INDEX "scheduled_rotations_scheduledFor_idx" ON "scheduled_rotations"("scheduledFor");

-- CreateIndex
CREATE INDEX "scheduled_rotations_status_idx" ON "scheduled_rotations"("status");

-- CreateIndex
CREATE INDEX "scheduled_rotations_userId_service_idx" ON "scheduled_rotations"("userId", "service");

-- CreateIndex
CREATE INDEX "notification_logs_userId_idx" ON "notification_logs"("userId");

-- CreateIndex
CREATE INDEX "notification_logs_type_idx" ON "notification_logs"("type");

-- CreateIndex
CREATE INDEX "notification_logs_sentAt_idx" ON "notification_logs"("sentAt");

-- CreateIndex
CREATE INDEX "account_locks_userId_idx" ON "account_locks"("userId");

-- CreateIndex
CREATE INDEX "account_locks_lockUntil_idx" ON "account_locks"("lockUntil");

-- CreateIndex
CREATE UNIQUE INDEX "account_locks_userId_service_key" ON "account_locks"("userId", "service");

-- CreateIndex
CREATE INDEX "rate_limit_logs_userId_idx" ON "rate_limit_logs"("userId");

-- CreateIndex
CREATE INDEX "rate_limit_logs_ipAddress_idx" ON "rate_limit_logs"("ipAddress");

-- CreateIndex
CREATE INDEX "rate_limit_logs_limitType_idx" ON "rate_limit_logs"("limitType");

-- CreateIndex
CREATE INDEX "rate_limit_logs_timestamp_idx" ON "rate_limit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "suspicious_activities_userId_idx" ON "suspicious_activities"("userId");

-- CreateIndex
CREATE INDEX "suspicious_activities_ipAddress_idx" ON "suspicious_activities"("ipAddress");

-- CreateIndex
CREATE INDEX "suspicious_activities_activityType_idx" ON "suspicious_activities"("activityType");

-- CreateIndex
CREATE INDEX "suspicious_activities_severity_idx" ON "suspicious_activities"("severity");

-- CreateIndex
CREATE INDEX "suspicious_activities_timestamp_idx" ON "suspicious_activities"("timestamp");

-- CreateIndex
CREATE INDEX "ip_blocks_ipAddress_idx" ON "ip_blocks"("ipAddress");

-- CreateIndex
CREATE INDEX "ip_blocks_expiresAt_idx" ON "ip_blocks"("expiresAt");

-- CreateIndex
CREATE INDEX "ip_blocks_isActive_idx" ON "ip_blocks"("isActive");

-- CreateIndex
CREATE INDEX "user_locks_userId_idx" ON "user_locks"("userId");

-- CreateIndex
CREATE INDEX "user_locks_expiresAt_idx" ON "user_locks"("expiresAt");

-- CreateIndex
CREATE INDEX "user_locks_isActive_idx" ON "user_locks"("isActive");

-- CreateIndex
CREATE INDEX "security_alerts_alertType_idx" ON "security_alerts"("alertType");

-- CreateIndex
CREATE INDEX "security_alerts_severity_idx" ON "security_alerts"("severity");

-- CreateIndex
CREATE INDEX "security_alerts_timestamp_idx" ON "security_alerts"("timestamp");

-- CreateIndex
CREATE INDEX "security_alerts_acknowledged_idx" ON "security_alerts"("acknowledged");

-- CreateIndex
CREATE INDEX "sync_operation_logs_userId_idx" ON "sync_operation_logs"("userId");

-- CreateIndex
CREATE INDEX "sync_operation_logs_ipAddress_idx" ON "sync_operation_logs"("ipAddress");

-- CreateIndex
CREATE INDEX "sync_operation_logs_syncType_idx" ON "sync_operation_logs"("syncType");

-- CreateIndex
CREATE INDEX "sync_operation_logs_success_idx" ON "sync_operation_logs"("success");

-- CreateIndex
CREATE INDEX "sync_operation_logs_timestamp_idx" ON "sync_operation_logs"("timestamp");

-- CreateIndex
CREATE INDEX "user_consents_userId_idx" ON "user_consents"("userId");

-- CreateIndex
CREATE INDEX "user_consents_consentType_idx" ON "user_consents"("consentType");

-- CreateIndex
CREATE INDEX "user_consents_timestamp_idx" ON "user_consents"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "data_deletion_logs_anonymizedId_key" ON "data_deletion_logs"("anonymizedId");

-- CreateIndex
CREATE INDEX "data_deletion_logs_originalUserId_idx" ON "data_deletion_logs"("originalUserId");

-- CreateIndex
CREATE INDEX "data_deletion_logs_deletionDate_idx" ON "data_deletion_logs"("deletionDate");

-- CreateIndex
CREATE INDEX "data_retention_logs_cleanupDate_idx" ON "data_retention_logs"("cleanupDate");

-- CreateIndex
CREATE INDEX "data_export_logs_userId_idx" ON "data_export_logs"("userId");

-- CreateIndex
CREATE INDEX "data_export_logs_exportDate_idx" ON "data_export_logs"("exportDate");

-- CreateIndex
CREATE INDEX "data_export_logs_status_idx" ON "data_export_logs"("status");

-- CreateIndex
CREATE INDEX "data_archival_logs_archivalDate_idx" ON "data_archival_logs"("archivalDate");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
