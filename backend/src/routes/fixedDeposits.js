const express = require('express')
const router = express.Router()
const fixedDepositsController = require('../controllers/fixedDepositsController')
const { validate, schemas } = require('../middleware/validation')

// GET /api/fixed-deposits - Get all fixed deposits with summary
router.get('/', fixedDepositsController.getAllFixedDeposits)

// GET /api/fixed-deposits/:id - Get specific fixed deposit
router.get('/:id', 
  validate(schemas.common.idParam, 'params'),
  fixedDepositsController.getFixedDepositById
)

// POST /api/fixed-deposits - Create new fixed deposit
router.post('/',
  validate(schemas.fixedDeposit.create),
  fixedDepositsController.createFixedDeposit
)

// PUT /api/fixed-deposits/:id - Update fixed deposit
router.put('/:id',
  validate(schemas.common.idParam, 'params'),
  validate(schemas.fixedDeposit.update),
  fixedDepositsController.updateFixedDeposit
)

// DELETE /api/fixed-deposits/:id - Delete fixed deposit
router.delete('/:id',
  validate(schemas.common.idParam, 'params'),
  fixedDepositsController.deleteFixedDeposit
)

module.exports = router