const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Audit event types
const AUDIT_EVENTS = {
  // Authentication events
  USER_REGISTERED: 'USER_REGISTERED',
  USER_LOGIN_SUCCESS: 'USER_LOGIN_SUCCESS',
  USER_LOGIN_FAILED: 'USER_LOGIN_FAILED',
  USER_LOGOUT: 'USER_LOGOUT',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED',
  
  // Email events
  EMAIL_VERIFICATION_SENT: 'EMAIL_VERIFICATION_SENT',
  EMAIL_VERIFIED: 'EMAIL_VERIFIED',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
  
  // Profile events
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  EMAIL_CHANGED: 'EMAIL_CHANGED',
  
  // Security events
  SUSPICIOUS_LOGIN_ATTEMPT: 'SUSPICIOUS_LOGIN_ATTEMPT',
  MULTIPLE_FAILED_LOGINS: 'MULTIPLE_FAILED_LOGINS',
  ACCOUNT_DELETION_REQUESTED: 'ACCOUNT_DELETION_REQUESTED',
  ACCOUNT_DELETED: 'ACCOUNT_DELETED',
  
  // Data events
  DATA_EXPORT_REQUESTED: 'DATA_EXPORT_REQUESTED',
  BULK_DATA_OPERATION: 'BULK_DATA_OPERATION'
};

/**
 * Log an audit event
 * @param {string} event - Event type from AUDIT_EVENTS
 * @param {string} userId - User ID (optional for some events)
 * @param {object} metadata - Additional event metadata
 * @param {object} request - Express request object (optional)
 */
const logAuditEvent = async (event, userId = null, metadata = {}, request = null) => {
  try {
    const auditData = {
      event,
      userId,
      metadata: JSON.stringify(metadata),
      timestamp: new Date(),
      ipAddress: request ? getClientIP(request) : null,
      userAgent: request ? request.get('User-Agent') : null
    };

    // For now, just log to console since we don't have an audit table
    // In production, you would save this to a dedicated audit log table
    console.log('🔍 AUDIT LOG:', JSON.stringify(auditData, null, 2));

    // You could also write to a file or external logging service
    // await writeToAuditFile(auditData);
    // await sendToLoggingService(auditData);

    return true;
  } catch (error) {
    console.error('Failed to log audit event:', error);
    return false;
  }
};

/**
 * Get client IP address from request
 * @param {object} req - Express request object
 * @returns {string} - Client IP address
 */
const getClientIP = (req) => {
  return req.ip || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         'unknown';
};

/**
 * Log authentication events
 */
const logAuthEvent = {
  registration: (userId, email, req) => 
    logAuditEvent(AUDIT_EVENTS.USER_REGISTERED, userId, { email }, req),
    
  loginSuccess: (userId, email, req) => 
    logAuditEvent(AUDIT_EVENTS.USER_LOGIN_SUCCESS, userId, { email }, req),
    
  loginFailed: (email, reason, req) => 
    logAuditEvent(AUDIT_EVENTS.USER_LOGIN_FAILED, null, { email, reason }, req),
    
  logout: (userId, req) => 
    logAuditEvent(AUDIT_EVENTS.USER_LOGOUT, userId, {}, req),
    
  accountLocked: (userId, email, attempts, req) => 
    logAuditEvent(AUDIT_EVENTS.ACCOUNT_LOCKED, userId, { email, attempts }, req),
    
  suspiciousActivity: (userId, email, reason, req) => 
    logAuditEvent(AUDIT_EVENTS.SUSPICIOUS_LOGIN_ATTEMPT, userId, { email, reason }, req)
};

/**
 * Log email events
 */
const logEmailEvent = {
  verificationSent: (userId, email, req) => 
    logAuditEvent(AUDIT_EVENTS.EMAIL_VERIFICATION_SENT, userId, { email }, req),
    
  emailVerified: (userId, email, req) => 
    logAuditEvent(AUDIT_EVENTS.EMAIL_VERIFIED, userId, { email }, req),
    
  passwordResetRequested: (userId, email, req) => 
    logAuditEvent(AUDIT_EVENTS.PASSWORD_RESET_REQUESTED, userId, { email }, req),
    
  passwordResetCompleted: (userId, email, req) => 
    logAuditEvent(AUDIT_EVENTS.PASSWORD_RESET_COMPLETED, userId, { email }, req)
};

/**
 * Log profile events
 */
const logProfileEvent = {
  profileUpdated: (userId, changes, req) => 
    logAuditEvent(AUDIT_EVENTS.PROFILE_UPDATED, userId, { changes }, req),
    
  passwordChanged: (userId, req) => 
    logAuditEvent(AUDIT_EVENTS.PASSWORD_CHANGED, userId, {}, req),
    
  emailChanged: (userId, oldEmail, newEmail, req) => 
    logAuditEvent(AUDIT_EVENTS.EMAIL_CHANGED, userId, { oldEmail, newEmail }, req)
};

/**
 * Log security events
 */
const logSecurityEvent = {
  multipleFailedLogins: (email, attempts, req) => 
    logAuditEvent(AUDIT_EVENTS.MULTIPLE_FAILED_LOGINS, null, { email, attempts }, req),
    
  accountDeletionRequested: (userId, email, req) => 
    logAuditEvent(AUDIT_EVENTS.ACCOUNT_DELETION_REQUESTED, userId, { email }, req),
    
  accountDeleted: (userId, email, req) => 
    logAuditEvent(AUDIT_EVENTS.ACCOUNT_DELETED, userId, { email }, req)
};

/**
 * Log data events
 */
const logDataEvent = {
  dataExportRequested: (userId, exportType, req) => 
    logAuditEvent(AUDIT_EVENTS.DATA_EXPORT_REQUESTED, userId, { exportType }, req),
    
  bulkOperation: (userId, operation, count, req) => 
    logAuditEvent(AUDIT_EVENTS.BULK_DATA_OPERATION, userId, { operation, count }, req)
};

/**
 * Middleware to log all API requests (optional)
 */
const auditMiddleware = (req, res, next) => {
  // Log sensitive endpoints only
  const sensitiveEndpoints = ['/api/auth/', '/api/user/'];
  const isSensitive = sensitiveEndpoints.some(endpoint => req.path.startsWith(endpoint));
  
  if (isSensitive) {
    const startTime = Date.now();
    
    // Log request
    console.log(`🔍 API REQUEST: ${req.method} ${req.path} from ${getClientIP(req)}`);
    
    // Override res.json to log response
    const originalJson = res.json;
    res.json = function(data) {
      const duration = Date.now() - startTime;
      console.log(`🔍 API RESPONSE: ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
      return originalJson.call(this, data);
    };
  }
  
  next();
};

module.exports = {
  AUDIT_EVENTS,
  logAuditEvent,
  logAuthEvent,
  logEmailEvent,
  logProfileEvent,
  logSecurityEvent,
  logDataEvent,
  auditMiddleware,
  getClientIP
};