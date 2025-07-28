const { PrismaClientKnownRequestError, PrismaClientValidationError } = require('@prisma/client/runtime/library')
const { ZodError } = require('zod')

const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  })

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input data',
      details: err.errors.map(error => ({
        field: error.path.join('.'),
        message: error.message,
        code: error.code
      })),
      timestamp: new Date().toISOString()
    })
  }

  // Prisma known request errors
  if (err instanceof PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({
          error: 'Conflict',
          message: 'A record with this data already exists',
          field: err.meta?.target,
          timestamp: new Date().toISOString()
        })
      
      case 'P2025':
        return res.status(404).json({
          error: 'Not Found',
          message: 'The requested record was not found',
          timestamp: new Date().toISOString()
        })
      
      case 'P2003':
        return res.status(400).json({
          error: 'Foreign Key Constraint',
          message: 'Invalid reference to related record',
          timestamp: new Date().toISOString()
        })
      
      default:
        return res.status(400).json({
          error: 'Database Error',
          message: 'A database error occurred',
          code: err.code,
          timestamp: new Date().toISOString()
        })
    }
  }

  // Prisma validation errors
  if (err instanceof PrismaClientValidationError) {
    return res.status(400).json({
      error: 'Database Validation Error',
      message: 'Invalid data provided to database',
      timestamp: new Date().toISOString()
    })
  }

  // JWT errors (for future authentication)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Invalid token',
      timestamp: new Date().toISOString()
    })
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Token expired',
      timestamp: new Date().toISOString()
    })
  }

  // Custom application errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.name || 'Application Error',
      message: err.message,
      timestamp: new Date().toISOString()
    })
  }

  // Default server error
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : err.message,
    timestamp: new Date().toISOString()
  })
}

module.exports = errorHandler