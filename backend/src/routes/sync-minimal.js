const express = require('express');
const { authenticateToken, requireEmailVerification } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all sync routes
router.use(authenticateToken);
router.use(requireEmailVerification);

// Minimal sync endpoints that return hardcoded data
router.get('/config', async (req, res) => {
  console.log('Minimal sync config endpoint called');
  res.json({
    success: true,
    data: [
      {
        investmentType: 'mutual_funds',
        isEnabled: false,
        syncFrequency: 'daily',
        preferredSource: 'amfi'
      }
    ]
  });
});

router.get('/status', async (req, res) => {
  console.log('Minimal sync status endpoint called');
  res.json({
    success: true,
    data: [
      {
        investmentType: 'mutual_funds',
        syncStatus: 'manual'
      }
    ]
  });
});

router.get('/credentials/status', async (req, res) => {
  console.log('Minimal sync credentials status endpoint called');
  res.json({
    success: true,
    data: {
      epfo: false,
      yahoo_finance: false
    }
  });
});

module.exports = router;