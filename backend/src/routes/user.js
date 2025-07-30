const express = require('express');
const { 
  getProfile, 
  updateProfile, 
  changePassword, 
  deleteAccount, 
  getSecurityInfo,
  exportUserData,
  getPreferences,
  updatePreferences,
  resetPreferences
} = require('../controllers/userController');
const { authenticateToken, requireEmailVerification } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Preferences routes
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);
router.post('/preferences/reset', resetPreferences);

// Security routes
router.get('/security', getSecurityInfo);
router.post('/change-password', changePassword);

// Data export for account deletion
router.get('/export-data', exportUserData);

// Account deletion (requires email verification)
router.delete('/account', requireEmailVerification, deleteAccount);

module.exports = router;