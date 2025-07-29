const express = require('express')
const router = express.Router()
const dashboardController = require('../controllers/dashboardController')
const { authenticateToken, requireEmailVerification } = require('../middleware/auth')

// All dashboard routes require authentication and email verification
router.use(authenticateToken)
router.use(requireEmailVerification)

// GET /api/dashboard - Get portfolio overview with summary, asset allocation, and top performers
router.get('/', dashboardController.getDashboardOverview)

// GET /api/dashboard/summary - Get portfolio summary only
router.get('/summary', dashboardController.getPortfolioSummary)

// GET /api/dashboard/asset-allocation - Get asset allocation only
router.get('/asset-allocation', dashboardController.getAssetAllocation)

// GET /api/dashboard/top-performers - Get top performers only
router.get('/top-performers', dashboardController.getTopPerformers)

module.exports = router