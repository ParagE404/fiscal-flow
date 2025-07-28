require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { PrismaClient } = require('@prisma/client')

// Import middleware
const errorHandler = require('./middleware/errorHandler')
const validationMiddleware = require('./middleware/validation')

// Import routes (will be created in next tasks)
const dashboardRoutes = require('./routes/dashboard')
const mutualFundsRoutes = require('./routes/mutualFunds')
const fixedDepositsRoutes = require('./routes/fixedDeposits')
const epfRoutes = require('./routes/epf')
const stocksRoutes = require('./routes/stocks')
const sipsRoutes = require('./routes/sips')
const exportRoutes = require('./routes/export')

const app = express()
const prisma = new PrismaClient()

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}

// Middleware
app.use(cors(corsOptions))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// API routes (will be uncommented as routes are created)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/mutual-funds', mutualFundsRoutes)
app.use('/api/fixed-deposits', fixedDepositsRoutes)
app.use('/api/epf', epfRoutes)
app.use('/api/stocks', stocksRoutes)
app.use('/api/sips', sipsRoutes)
app.use('/api/export', exportRoutes)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  })
})

// Global error handler (must be last)
app.use(errorHandler)

const PORT = process.env.PORT || 3001

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🌐 CORS enabled for: ${corsOptions.origin}`)
})