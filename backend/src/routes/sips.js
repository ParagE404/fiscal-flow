const express = require('express')
const router = express.Router()
const sipsController = require('../controllers/sipsController')
const { validate, schemas } = require('../middleware/validation')
const { authenticateToken, requireEmailVerification } = require('../middleware/auth')

// All SIPs routes require authentication and email verification
router.use(authenticateToken)
router.use(requireEmailVerification)

// GET /api/sips - Get all SIPs with summary
router.get('/', sipsController.getAllSIPs)

// GET /api/sips/:id - Get specific SIP
router.get('/:id', 
  validate(schemas.common.idParam, 'params'),
  sipsController.getSIPById
)

// POST /api/sips - Create new SIP
router.post('/',
  validate(schemas.sip.create),
  sipsController.createSIP
)

// PUT /api/sips/:id - Update SIP
router.put('/:id',
  validate(schemas.common.idParam, 'params'),
  validate(schemas.sip.update),
  sipsController.updateSIP
)

// DELETE /api/sips/:id - Delete SIP
router.delete('/:id',
  validate(schemas.common.idParam, 'params'),
  sipsController.deleteSIP
)

// PUT /api/sips/:id/status - Update SIP status
router.put('/:id/status',
  validate(schemas.common.idParam, 'params'),
  validate(schemas.sip.statusUpdate),
  sipsController.updateSIPStatus
)

module.exports = router