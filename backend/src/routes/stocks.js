const express = require('express')
const router = express.Router()
const stocksController = require('../controllers/stocksController')
const { validate, schemas } = require('../middleware/validation')
const { authenticateToken, requireEmailVerification } = require('../middleware/auth')

// All stocks routes require authentication and email verification
router.use(authenticateToken)
router.use(requireEmailVerification)

// GET /api/stocks - Get all stocks with summary
router.get('/', stocksController.getAllStocks)

// GET /api/stocks/:id - Get specific stock
router.get('/:id', 
  validate(schemas.common.idParam, 'params'),
  stocksController.getStockById
)

// POST /api/stocks - Create new stock
router.post('/',
  validate(schemas.stock.create),
  stocksController.createStock
)

// PUT /api/stocks/:id - Update stock
router.put('/:id',
  validate(schemas.common.idParam, 'params'),
  validate(schemas.stock.update),
  stocksController.updateStock
)

// DELETE /api/stocks/:id - Delete stock
router.delete('/:id',
  validate(schemas.common.idParam, 'params'),
  stocksController.deleteStock
)

module.exports = router