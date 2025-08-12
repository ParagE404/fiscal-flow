const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
let prisma;
if (process.env.NODE_ENV === 'test') {
  prisma = null;
} else {
  prisma = new PrismaClient();
}

/**
 * Job Persistence Service for maintaining job state across system restarts
 * Handles job execution history, status tracking, and recovery
 */
class JobPersistence {
  constructor(prismaClient = null) {
    this.prisma = prismaClient || prisma || new PrismaClient();
  }

  /**
   * Save job execution record to database
   * @param {string} jobName - Job identifier
   * @param {Object} execution - Execution details
   */
  async saveJobExecution(jobName, execution) {
    try {
      await this.prisma.jobExecution.create({
        data: {
          jobName,
          status: execution.success ? 'completed' : 'failed',
          startTime: execution.startTime || new Date(),
          endTime: execution.endTime || new Date(),
          duration: execution.duration || 0,
          usersProcessed: execution.usersProcessed || 0,
          recordsUpdated: execution.recordsUpdated || 0,
          successCount: execution.successCount || 0,
          errorCount: execution.errorCount || 0,
          errorMessage: execution.error || null,
          metadata: execution.metadata ? JSON.stringify(execution.metadata) : null
        }
      });
    } catch (error) {
      console.error(`Failed to save job execution for ${jobName}:`, error);
    }
  }

  /**
   * Get job execution history from database
   * @param {string} jobName - Job identifier
   * @param {number} limit - Maximum records to return
   * @returns {Promise<Array>} Job execution history
   */
  async getJobExecutionHistory(jobName, limit = 50) {
    try {
      const executions = await this.prisma.jobExecution.findMany({
        where: { jobName },
        orderBy: { startTime: 'desc' },
        take: limit
      });

      return executions.map(execution => ({
        id: execution.id,
        jobName: execution.jobName,
        status: execution.status,
        startTime: execution.startTime,
        endTime: execution.endTime,
        duration: execution.duration,
        usersProcessed: execution.usersProcessed,
        recordsUpdated: execution.recordsUpdated,
        successCount: execution.successCount,
        errorCount: execution.errorCount,
        errorMessage: execution.errorMessage,
        metadata: execution.metadata ? JSON.parse(execution.metadata) : null
      }));
    } catch (error) {
      console.error(`Failed to get job execution history for ${jobName}:`, error);
      return [];
    }
  }

  /**
   * Get job statistics for monitoring
   * @param {string} jobName - Job identifier
   * @param {number} days - Number of days to analyze
   * @returns {Promise<Object>} Job statistics
   */
  async getJobStatistics(jobName, days = 30) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const executions = await this.prisma.jobExecution.findMany({
        where: {
          jobName,
          startTime: {
            gte: since
          }
        },
        orderBy: { startTime: 'desc' }
      });

      const totalExecutions = executions.length;
      const successfulExecutions = executions.filter(e => e.status === 'completed').length;
      const failedExecutions = executions.filter(e => e.status === 'failed').length;
      const totalUsersProcessed = executions.reduce((sum, e) => sum + (e.usersProcessed || 0), 0);
      const totalRecordsUpdated = executions.reduce((sum, e) => sum + (e.recordsUpdated || 0), 0);
      const averageDuration = executions.length > 0 
        ? executions.reduce((sum, e) => sum + (e.duration || 0), 0) / executions.length 
        : 0;

      const lastExecution = executions.length > 0 ? executions[0] : null;
      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

      return {
        jobName,
        period: `${days} days`,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        successRate: Math.round(successRate * 100) / 100,
        totalUsersProcessed,
        totalRecordsUpdated,
        averageDuration: Math.round(averageDuration),
        lastExecution: lastExecution ? {
          status: lastExecution.status,
          startTime: lastExecution.startTime,
          duration: lastExecution.duration,
          usersProcessed: lastExecution.usersProcessed,
          recordsUpdated: lastExecution.recordsUpdated
        } : null
      };
    } catch (error) {
      console.error(`Failed to get job statistics for ${jobName}:`, error);
      return null;
    }
  }

  /**
   * Save job configuration to database
   * @param {string} jobName - Job identifier
   * @param {Object} config - Job configuration
   */
  async saveJobConfiguration(jobName, config) {
    try {
      await this.prisma.jobConfiguration.upsert({
        where: { jobName },
        update: {
          syncType: config.syncType,
          schedule: config.schedule,
          timezone: config.timezone,
          enabled: config.enabled,
          description: config.description,
          condition: config.condition,
          updatedAt: new Date()
        },
        create: {
          jobName,
          syncType: config.syncType,
          schedule: config.schedule,
          timezone: config.timezone,
          enabled: config.enabled,
          description: config.description,
          condition: config.condition
        }
      });
    } catch (error) {
      console.error(`Failed to save job configuration for ${jobName}:`, error);
    }
  }

  /**
   * Load job configurations from database
   * @returns {Promise<Array>} Array of job configurations
   */
  async loadJobConfigurations() {
    try {
      const configs = await this.prisma.jobConfiguration.findMany({
        orderBy: { jobName: 'asc' }
      });

      return configs.map(config => ({
        jobName: config.jobName,
        syncType: config.syncType,
        schedule: config.schedule,
        timezone: config.timezone,
        enabled: config.enabled,
        description: config.description,
        condition: config.condition,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      }));
    } catch (error) {
      console.error('Failed to load job configurations:', error);
      return [];
    }
  }

  /**
   * Update job enabled status
   * @param {string} jobName - Job identifier
   * @param {boolean} enabled - Enabled status
   */
  async updateJobEnabled(jobName, enabled) {
    try {
      await this.prisma.jobConfiguration.update({
        where: { jobName },
        data: { 
          enabled,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error(`Failed to update job enabled status for ${jobName}:`, error);
    }
  }

  /**
   * Clean up old job execution records
   * @param {number} daysToKeep - Number of days of history to keep
   */
  async cleanupOldExecutions(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await this.prisma.jobExecution.deleteMany({
        where: {
          startTime: {
            lt: cutoffDate
          }
        }
      });

      console.log(`Cleaned up ${result.count} old job execution records`);
      return result.count;
    } catch (error) {
      console.error('Failed to cleanup old job executions:', error);
      return 0;
    }
  }

  /**
   * Get currently running jobs (jobs that started but haven't finished)
   * @returns {Promise<Array>} Array of running job executions
   */
  async getRunningJobs() {
    try {
      const runningJobs = await this.prisma.jobExecution.findMany({
        where: {
          status: 'running',
          startTime: {
            // Consider jobs running for more than 2 hours as potentially stuck
            gte: new Date(Date.now() - 2 * 60 * 60 * 1000)
          }
        },
        orderBy: { startTime: 'desc' }
      });

      return runningJobs;
    } catch (error) {
      console.error('Failed to get running jobs:', error);
      return [];
    }
  }

  /**
   * Mark stuck jobs as failed (cleanup for jobs that didn't complete properly)
   * @param {number} hoursThreshold - Hours after which a running job is considered stuck
   */
  async markStuckJobsAsFailed(hoursThreshold = 2) {
    try {
      const cutoffTime = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

      const result = await this.prisma.jobExecution.updateMany({
        where: {
          status: 'running',
          startTime: {
            lt: cutoffTime
          }
        },
        data: {
          status: 'failed',
          endTime: new Date(),
          errorMessage: `Job marked as failed due to timeout (>${hoursThreshold}h)`
        }
      });

      if (result.count > 0) {
        console.log(`Marked ${result.count} stuck jobs as failed`);
      }

      return result.count;
    } catch (error) {
      console.error('Failed to mark stuck jobs as failed:', error);
      return 0;
    }
  }
}

module.exports = JobPersistence;