/**
 * HTTPS enforcement middleware
 * Ensures that sensitive endpoints are only accessible over HTTPS in production
 */

/**
 * Middleware to enforce HTTPS for sensitive endpoints
 * In production, this will reject HTTP requests to credential endpoints
 * In development, it logs a warning but allows the request
 */
const enforceHTTPS = (req, res, next) => {
  // Skip HTTPS enforcement in development and test environments
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      console.warn(`⚠️  WARNING: Credential endpoint accessed over HTTP in ${process.env.NODE_ENV} mode`);
      console.warn(`   URL: ${req.method} ${req.originalUrl}`);
      console.warn(`   In production, this request would be rejected`);
    }
    return next();
  }

  // In production, enforce HTTPS
  if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.status(426).json({
      error: 'HTTPS Required',
      message: 'This endpoint requires a secure HTTPS connection',
      code: 'HTTPS_REQUIRED'
    });
  }

  next();
};

/**
 * Middleware to add security headers for credential endpoints
 */
const addSecurityHeaders = (req, res, next) => {
  // Prevent caching of credential responses
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    // Prevent embedding in frames
    'X-Frame-Options': 'DENY',
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    // Enable XSS protection
    'X-XSS-Protection': '1; mode=block',
    // Strict transport security (only over HTTPS)
    ...(req.secure || req.get('x-forwarded-proto') === 'https' ? {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    } : {})
  });

  next();
};

/**
 * Combined middleware for credential endpoints
 * Enforces HTTPS and adds security headers
 */
const secureCredentialEndpoint = [enforceHTTPS, addSecurityHeaders];

module.exports = {
  enforceHTTPS,
  addSecurityHeaders,
  secureCredentialEndpoint
};