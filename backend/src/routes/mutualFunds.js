const express = require('express')
const router = express.Router()
const mutualFundsController = require('../controllers/mutualFundsController')
const { validate, schemas } = require('../middleware/validation')
const { authenticateToken, requireEmailVerification } = require('../middleware/auth')

// All mutual funds routes require authentication and email verification
router.use(authenticateToken)
router.use(requireEmailVerification)

// GET /api/mutual-funds - Get all mutual funds with summary
router.get('/', mutualFundsController.getAllMutualFunds)

// GET /api/mutual-funds/:id - Get specific mutual fund
router.get('/:id', 
  validate(schemas.common.idParam, 'params'),
  mutualFundsController.getMutualFundById
)

// POST /api/mutual-funds - Create new mutual fund
router.post('/',
  validate(schemas.mutualFund.create),
  mutualFundsController.createMutualFund
)

// PUT /api/mutual-funds/:id - Update mutual fund
router.put('/:id',
  validate(schemas.common.idParam, 'params'),
  validate(schemas.mutualFund.update),
  mutualFundsController.updateMutualFund
)

// DELETE /api/mutual-funds/:id - Delete mutual fund
router.delete('/:id',
  validate(schemas.common.idParam, 'params'),
  mutualFundsController.deleteMutualFund
)

module.exports = router