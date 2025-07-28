const express = require('express')
const router = express.Router()
const epfController = require('../controllers/epfController')
const { validate, schemas } = require('../middleware/validation')

// GET /api/epf - Get all EPF accounts with summary
router.get('/', epfController.getAllEPFAccounts)

// GET /api/epf/:id - Get specific EPF account
router.get('/:id', 
  validate(schemas.common.idParam, 'params'),
  epfController.getEPFAccountById
)

// POST /api/epf - Create new EPF account
router.post('/',
  validate(schemas.epfAccount.create),
  epfController.createEPFAccount
)

// PUT /api/epf/:id - Update EPF account
router.put('/:id',
  validate(schemas.common.idParam, 'params'),
  validate(schemas.epfAccount.update),
  epfController.updateEPFAccount
)

// DELETE /api/epf/:id - Delete EPF account
router.delete('/:id',
  validate(schemas.common.idParam, 'params'),
  epfController.deleteEPFAccount
)

module.exports = router