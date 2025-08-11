/**
 * Sync Worker - Dedicated process for handling background sync jobs
 * This worker runs independently from the main API server
 */

const { PrismaClient } = require('@prisma/client');
const { JobScheduler } = require('../services/scheduler/JobScheduler');
const { createLogger } = require('../utils/logger');
const { MetricsCollector } = require('../services/monitoring/MetricsCollector');

// Initialize services
const prisma = new PrismaClient();
const logger = createLogger('sync-worker');
const metricsCollector = new MetricsCollector();

class SyncWorker {
  constructor() {
    this.jobScheduler = null;
    this.isShuttingDown = false;
    this.healthStatus = {
      status: 'starting',
      lastHealthCheck: new Date(),
      activeJobs: 0,
      totalJobsProcessed: 0,
      errors: []
    };
  }

  async start() {
    try {
      logger.info('Starting Sync Worker...');

      // Verify database connection
      await this.verifyDatabaseConnection();

      // Initialize job scheduler
      this.jobScheduler = new JobScheduler({
        concurrency: parseInt(process.env.SYNC_JOB_CONCURRENCY) || 5,
        timezone: process.env.JOB_SCHEDULER_TIMEZONE || 'Asia/Kolkata'
      });

      // Start metrics collection
      if (process.env.ENABLE_SYNC_METRICS === 'true') {
        await this.startMetricsServer();
      }

      // Start job scheduler
      await this.jobScheduler.start();

      // Set up health monitoring
      this.setupHealthMonitoring();

      // Set up graceful shutdown
      this.setupGracefulShutdown();

      this.healthStatus.status = 'healthy';
      logger.info('Sync Worker started successfully');

    } catch (error) {
      logger.error('Failed to start Sync Worker:', error);
      this.healthStatus.status = 'unhealthy';
      this.healthStatus.errors.push({
        message: error.message,
        timestamp: new Date()
      });
      process.exit(1);
    }
  }

  async verifyDatabaseConnection() {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      logger.info('Database connection verified');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw new Error('Database connection failed');
    }
  }

  async startMetricsServer() {
    const express = require('express');
    const app = express();
    const port = process.env.METRICS_PORT || 9090;

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json(this.healthStatus);
    });

    // Metrics endpoint
    app.get('/metrics', async (req, res) => {
      try {
        const metrics = await metricsCollector.getMetrics();
        res.set('Content-Type', 'text/plain');
        res.send(metrics);
      } catch (error) {
        logger.error('Failed to collect metrics:', error);
        res.status(500).json({ error: 'Failed to collect metrics' });
      }
    });

    // Job status endpoint
    app.get('/jobs', async (req, res) => {
      try {
        const jobStatus = await this.jobScheduler.getJobStatus();
        res.json(jobStatus);
      } catch (error) {
        logger.error('Failed to get job status:', error);
        res.status(500).json({ error: 'Failed to get job status' });
      }
    });

    app.listen(port, () => {
      logger.info(`Metrics server listening on port ${port}`);
    });
  }

  setupHealthMonitoring() {
    // Update health status every 30 seconds
    setInterval(() => {
      this.updateHealthStatus();
    }, 30000);

    // Log health status every 5 minutes
    setInterval(() => {
      logger.info('Health Status:', this.healthStatus);
    }, 300000);
  }

  async updateHealthStatus() {
    try {
      this.healthStatus.lastHealthCheck = new Date();
      
      // Check database connection
      await prisma.$queryRaw`SELECT 1`;
      
      // Get job scheduler status
      if (this.jobScheduler) {
        const jobStats = await this.jobScheduler.getStats();
        this.healthStatus.activeJobs = jobStats.activeJobs;
        this.healthStatus.totalJobsProcessed = jobStats.totalJobsProcessed;
      }

      // Clear old errors (keep only last 10)
      if (this.healthStatus.errors.length > 10) {
        this.healthStatus.errors = this.healthStatus.errors.slice(-10);
      }

      // Update status based on recent errors
      const recentErrors = this.healthStatus.errors.filter(
        error => Date.now() - error.timestamp.getTime() < 300000 // 5 minutes
      );

      if (recentErrors.length > 5) {
        this.healthStatus.status = 'degraded';
      } else if (recentErrors.length === 0 && this.healthStatus.status !== 'healthy') {
        this.healthStatus.status = 'healthy';
      }

    } catch (error) {
      logger.error('Health check failed:', error);
      this.healthStatus.status = 'unhealthy';
      this.healthStatus.errors.push({
        message: error.message,
        timestamp: new Date()
      });
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      if (this.isShuttingDown) return;
      
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      this.isShuttingDown = true;
      this.healthStatus.status = 'shutting_down';

      try {
        // Stop accepting new jobs
        if (this.jobScheduler) {
          await this.jobScheduler.stop();
          logger.info('Job scheduler stopped');
        }

        // Wait for active jobs to complete (max 30 seconds)
        const maxWaitTime = 30000;
        const startTime = Date.now();
        
        while (this.healthStatus.activeJobs > 0 && (Date.now() - startTime) < maxWaitTime) {
          logger.info(`Waiting for ${this.healthStatus.activeJobs} active jobs to complete...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          await this.updateHealthStatus();
        }

        // Close database connection
        await prisma.$disconnect();
        logger.info('Database connection closed');

        logger.info('Graceful shutdown completed');
        process.exit(0);

      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the worker
const worker = new SyncWorker();
worker.start().catch((error) => {
  logger.error('Failed to start worker:', error);
  process.exit(1);
});