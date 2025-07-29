const express = require('express');
const { register, login, logout, getCurrentUser, sendEmailVerification, verifyEmail, requestPasswordReset, resetPassword } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter, emailVerificationLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Public routes (with rate limiting)
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

// Email verification routes
router.post('/send-verification', emailVerificationLimiter, authenticateToken, sendEmailVerification);
router.get('/verify-email/:token', verifyEmail);

// Password reset routes
router.post('/request-password-reset', passwordResetLimiter, requestPasswordReset);
router.post('/reset-password', authLimiter, resetPassword);

// Protected routes
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, getCurrentUser);

module.exports = router;