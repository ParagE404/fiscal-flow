const express = require('express')
const router = express.Router()
const exportController = require('../controllers/exportController')
const { authenticateToken, requireEmailVerification } = require('../middleware/auth')

// All export routes require authentication and email verification
router.use(authenticateToken)
router.use(requireEmailVerification)

// Complete portfolio export
router.get('/all', exportController.exportCompletePortfolio)

// Category-wise exports
router.get('/mutual-funds', exportController.exportMutualFunds)
router.get('/sips', exportController.exportSIPs)
router.get('/fixed-deposits', exportController.exportFixedDeposits)
router.get('/epf', exportController.exportEPF)
router.get('/stocks', exportController.exportStocks)

module.exports = router