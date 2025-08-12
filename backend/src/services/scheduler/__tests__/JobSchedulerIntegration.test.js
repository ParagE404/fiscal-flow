const JobScheduler = require('../JobScheduler');
const JobQueueManager = require('../JobQueueManager');
const JobPersistence = require('../JobPersistence');
const { PrismaClient } = require('@prisma/client');
const cron = require('node-cron');

// Mock cron
jest.mock('node-cron');

// Mock Prisma
const mockPrisma = {
  user: {
    findMany: jest.fn()
  },
  syncConfiguration: {
    findMany: jest.fn()
  },
  scheduledJob: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  jobExecution: {
    create: jest.fn(),
    update: jest.fn()
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
}));

// Mock sync services
const mockSyncServices = {
  mutual_funds: {
    sync: jest.fn()
  },
  epf: {
    sync: jest.fn()
  },
  stocks: {
    sync: jest.fn()
  }
};

describe('Job Scheduler Integration Tests', () => {
  let jobScheduler;
  let jobQueueManager;
  let jobPersistence;

  beforeAll(() => {
    // Set timezone for tests
    process.env.TZ = 'Asia/Kolkata';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create instances
    jobScheduler = new JobScheduler();
    jobQueueManager = new JobQueueManager();
    jobPersistence = new JobPersistence();
    
    // Inject mock sync services
    jobScheduler.syncServices = mockSyncServices;
    
    // Mock cron.schedule to return a controllable job
    const mockJob = {
      start: jest.fn(),
      stop: jest.fn(),
      destroy: jest.fn()
    };
    cron.schedule.mockReturnValue(mockJob);
  });

  describe('Job Scheduling and Execution', () => {
    test('should schedule all sync jobs with correct cron expressions', () => {
      jobScheduler.start();

      // Verify cron jobs were scheduled
      expect(cron.schedule).toHaveBeenCalledTimes(3);
      
      // Check mutual fund job (daily at 6 PM IST)
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 18 * * *',
        expect.any(Function),
        expect.objectContaining({
          scheduled: false,
          timezone: 'Asia/Kolkata'
        })
      );

      // Check EPF job (monthly on 1st at 2 AM IST)
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 2 1 * *',
        expect.any(Function),
        expect.objectContaining({
          scheduled: false,
          timezone: 'Asia/Kolkata'
        })
      );

      // Check stock job (hourly)
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 * * * *',
        expect.any(Function),
        expect.objectContaining({
          scheduled: false,
          timezone: 'Asia/Kolkata'
        })
      );
    });

    test('should execute mutual fund sync job for all eligible users', async () => {
      const mockUsers = [
        { id: 'user1', email: 'user1@test.com' },
        { id: 'user2', email: 'user2@test.com' }
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.syncConfiguration.findMany.mockResolvedValue([
        { userId: 'user1', investmentType: 'mutual_funds', isEnabled: true },
        { userId: 'user2', investmentType: 'mutual_funds', isEnabled: true }
      ]);

      mockSyncServices.mutual_funds.sync
        .mockResolvedValueOnce({ success: true, recordsUpdated: 5 })
        .mockResolvedValueOnce({ success: true, recordsUpdated: 3 });

      await jobScheduler.runSyncForAllUsers('mutual_funds');

      // Verify sync was called for each user
      expect(mockSyncServices.mutual_funds.sync).toHaveBeenCalledTimes(2);
      expect(mockSyncServices.mutual_funds.sync).toHaveBeenCalledWith('user1');
      expect(mockSyncServices.mutual_funds.sync).toHaveBeenCalledWith('user2');
    });

    test('should handle individual user sync failures without stopping batch', async () => {
      const mockUsers = [
        { id: 'user1', email: 'user1@test.com' },
        { id: 'user2', email: 'user2@test.com' },
        { id: 'user3', email: 'user3@test.com' }
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.syncConfiguration.findMany.mockResolvedValue([
        { userId: 'user1', investmentType: 'stocks', isEnabled: true },
        { userId: 'user2', investmentType: 'stocks', isEnabled: true },
        { userId: 'user3', investmentType: 'stocks', isEnabled: true }
      ]);

      mockSyncServices.stocks.sync
        .mockResolvedValueOnce({ success: true, recordsUpdated: 2 })
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({ success: true, recordsUpdated: 1 });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await jobScheduler.runSyncForAllUsers('stocks');

      // All users should have been attempted
      expect(mockSyncServices.stocks.sync).toHaveBeenCalledTimes(3);
      
      // Error should have been logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sync failed for user user2'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('should respect market hours for stock sync jobs', async () => {
      // Mock market hours check
      jest.spyOn(jobScheduler, 'isMarketHours').mockReturnValue(false);

      const mockUsers = [{ id: 'user1', email: 'user1@test.com' }];
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      await jobScheduler.runSyncForAllUsers('stocks');

      // Stock sync should not run outside market hours
      expect(mockSyncServices.stocks.sync).not.toHaveBeenCalled();
    });

    test('should run stock sync during market hours', async () => {
      // Mock market hours check
      jest.spyOn(jobScheduler, 'isMarketHours').mockReturnValue(true);

      const mockUsers = [{ id: 'user1', email: 'user1@test.com' }];
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.syncConfiguration.findMany.mockResolvedValue([
        { userId: 'user1', investmentType: 'stocks', isEnabled: true }
      ]);

      mockSyncServices.stocks.sync.mockResolvedValue({ success: true, recordsUpdated: 1 });

      await jobScheduler.runSyncForAllUsers('stocks');

      // Stock sync should run during market hours
      expect(mockSyncServices.stocks.sync).toHaveBeenCalledWith('user1');
    });
  });

  describe('Job Queue Management', () => {
    test('should prevent overlapping job executions', async () => {
      const jobId = 'mutual_funds_sync';
      
      // Mock job already running
      jest.spyOn(jobQueueManager, 'isJobRunning').mockReturnValue(true);
      jest.spyOn(jobQueueManager, 'acquireLock').mockResolvedValue(false);

      const result = await jobScheduler.executeJob(jobId, async () => {
        return { success: true };
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already running');
    });

    test('should acquire and release job locks properly', async () => {
      const jobId = 'epf_sync';
      
      jest.spyOn(jobQueueManager, 'isJobRunning').mockReturnValue(false);
      jest.spyOn(jobQueueManager, 'acquireLock').mockResolvedValue(true);
      jest.spyOn(jobQueueManager, 'releaseLock').mockResolvedValue(true);

      let jobExecuted = false;
      const result = await jobScheduler.executeJob(jobId, async () => {
        jobExecuted = true;
        return { success: true, recordsUpdated: 10 };
      });

      expect(result.success).toBe(true);
      expect(jobExecuted).toBe(true);
      expect(jobQueueManager.acquireLock).toHaveBeenCalledWith(jobId);
      expect(jobQueueManager.releaseLock).toHaveBeenCalledWith(jobId);
    });

    test('should handle job execution timeouts', async () => {
      const jobId = 'timeout_test';
      
      jest.spyOn(jobQueueManager, 'isJobRunning').mockReturnValue(false);
      jest.spyOn(jobQueueManager, 'acquireLock').mockResolvedValue(true);
      jest.spyOn(jobQueueManager, 'releaseLock').mockResolvedValue(true);

      // Mock a job that takes too long
      const longRunningJob = () => new Promise(resolve => {
        setTimeout(() => resolve({ success: true }), 10000); // 10 seconds
      });

      const result = await jobScheduler.executeJob(jobId, longRunningJob, {
        timeout: 1000 // 1 second timeout
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('Job Persistence and Recovery', () => {
    test('should persist job execution details', async () => {
      const jobId = 'test_job';
      const executionId = 'exec_123';
      
      mockPrisma.jobExecution.create.mockResolvedValue({ id: executionId });
      mockPrisma.jobExecution.update.mockResolvedValue({});

      jest.spyOn(jobQueueManager, 'isJobRunning').mockReturnValue(false);
      jest.spyOn(jobQueueManager, 'acquireLock').mockResolvedValue(true);
      jest.spyOn(jobQueueManager, 'releaseLock').mockResolvedValue(true);

      await jobScheduler.executeJob(jobId, async () => {
        return { success: true, recordsUpdated: 5 };
      });

      // Verify job execution was persisted
      expect(mockPrisma.jobExecution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jobType: jobId,
          status: 'running',
          startedAt: expect.any(Date)
        })
      });

      expect(mockPrisma.jobExecution.update).toHaveBeenCalledWith({
        where: { id: executionId },
        data: expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(Date),
          result: expect.any(Object)
        })
      });
    });

    test('should recover from system restart', async () => {
      const mockScheduledJobs = [
        {
          id: 'job1',
          jobType: 'mutual_funds',
          scheduledFor: new Date(Date.now() - 60000), // 1 minute ago
          status: 'pending'
        },
        {
          id: 'job2',
          jobType: 'stocks',
          scheduledFor: new Date(Date.now() + 60000), // 1 minute from now
          status: 'pending'
        }
      ];

      mockPrisma.scheduledJob.findMany.mockResolvedValue(mockScheduledJobs);
      mockPrisma.scheduledJob.update.mockResolvedValue({});

      const mockUsers = [{ id: 'user1', email: 'user1@test.com' }];
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.syncConfiguration.findMany.mockResolvedValue([
        { userId: 'user1', investmentType: 'mutual_funds', isEnabled: true }
      ]);

      mockSyncServices.mutual_funds.sync.mockResolvedValue({ success: true });

      await jobScheduler.recoverPendingJobs();

      // Should execute overdue job immediately
      expect(mockSyncServices.mutual_funds.sync).toHaveBeenCalled();
      
      // Should update job status
      expect(mockPrisma.scheduledJob.update).toHaveBeenCalledWith({
        where: { id: 'job1' },
        data: expect.objectContaining({
          status: 'completed'
        })
      });
    });

    test('should handle job execution failures with proper logging', async () => {
      const jobId = 'failing_job';
      const executionId = 'exec_456';
      
      mockPrisma.jobExecution.create.mockResolvedValue({ id: executionId });
      mockPrisma.jobExecution.update.mockResolvedValue({});

      jest.spyOn(jobQueueManager, 'isJobRunning').mockReturnValue(false);
      jest.spyOn(jobQueueManager, 'acquireLock').mockResolvedValue(true);
      jest.spyOn(jobQueueManager, 'releaseLock').mockResolvedValue(true);

      const failingJob = async () => {
        throw new Error('Job execution failed');
      };

      const result = await jobScheduler.executeJob(jobId, failingJob);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Job execution failed');

      // Verify failure was persisted
      expect(mockPrisma.jobExecution.update).toHaveBeenCalledWith({
        where: { id: executionId },
        data: expect.objectContaining({
          status: 'failed',
          error: 'Job execution failed',
          completedAt: expect.any(Date)
        })
      });
    });
  });

  describe('Manual Job Triggering', () => {
    test('should allow manual sync triggering', async () => {
      const userId = 'user123';
      const syncType = 'mutual_funds';

      mockSyncServices.mutual_funds.sync.mockResolvedValue({
        success: true,
        recordsUpdated: 3,
        duration: 2500
      });

      const result = await jobScheduler.manualSync(userId, syncType);

      expect(result.success).toBe(true);
      expect(result.recordsUpdated).toBe(3);
      expect(mockSyncServices.mutual_funds.sync).toHaveBeenCalledWith(userId, { force: true });
    });

    test('should handle manual sync for invalid sync type', async () => {
      const userId = 'user123';
      const syncType = 'invalid_type';

      await expect(jobScheduler.manualSync(userId, syncType))
        .rejects.toThrow('Sync service not found for type: invalid_type');
    });

    test('should rate limit manual sync requests', async () => {
      const userId = 'user123';
      const syncType = 'stocks';

      // Mock rate limiting
      jest.spyOn(jobScheduler, 'isRateLimited').mockReturnValue(true);

      await expect(jobScheduler.manualSync(userId, syncType))
        .rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Job Monitoring and Health Checks', () => {
    test('should provide job status and statistics', async () => {
      const mockJobExecutions = [
        {
          jobType: 'mutual_funds',
          status: 'completed',
          startedAt: new Date(Date.now() - 300000), // 5 minutes ago
          completedAt: new Date(Date.now() - 240000), // 4 minutes ago
          result: { recordsUpdated: 10 }
        },
        {
          jobType: 'stocks',
          status: 'failed',
          startedAt: new Date(Date.now() - 180000), // 3 minutes ago
          completedAt: new Date(Date.now() - 120000), // 2 minutes ago
          error: 'Network timeout'
        }
      ];

      mockPrisma.jobExecution.findMany.mockResolvedValue(mockJobExecutions);

      const stats = await jobScheduler.getJobStatistics();

      expect(stats).toMatchObject({
        totalJobs: 2,
        completedJobs: 1,
        failedJobs: 1,
        averageExecutionTime: expect.any(Number),
        lastExecutions: expect.any(Array)
      });
    });

    test('should detect stuck jobs', async () => {
      const mockStuckJob = {
        id: 'stuck_job',
        jobType: 'epf',
        status: 'running',
        startedAt: new Date(Date.now() - 3600000), // 1 hour ago
        completedAt: null
      };

      mockPrisma.jobExecution.findMany.mockResolvedValue([mockStuckJob]);

      const stuckJobs = await jobScheduler.detectStuckJobs();

      expect(stuckJobs).toHaveLength(1);
      expect(stuckJobs[0].id).toBe('stuck_job');
    });

    test('should cleanup old job execution records', async () => {
      mockPrisma.jobExecution.deleteMany.mockResolvedValue({ count: 50 });

      const cleanupResult = await jobScheduler.cleanupOldExecutions(30); // 30 days

      expect(cleanupResult.deletedCount).toBe(50);
      expect(mockPrisma.jobExecution.deleteMany).toHaveBeenCalledWith({
        where: {
          completedAt: {
            lt: expect.any(Date)
          }
        }
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle database connection failures gracefully', async () => {
      mockPrisma.user.findMany.mockRejectedValue(new Error('Database connection failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await jobScheduler.runSyncForAllUsers('mutual_funds');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to run sync for type mutual_funds'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('should implement exponential backoff for failed jobs', async () => {
      const jobId = 'retry_job';
      
      jest.spyOn(jobQueueManager, 'isJobRunning').mockReturnValue(false);
      jest.spyOn(jobQueueManager, 'acquireLock').mockResolvedValue(true);
      jest.spyOn(jobQueueManager, 'releaseLock').mockResolvedValue(true);

      let attemptCount = 0;
      const retryJob = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true };
      };

      const result = await jobScheduler.executeJobWithRetry(jobId, retryJob, {
        maxRetries: 3,
        baseDelay: 100
      });

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
    });

    test('should handle job cancellation gracefully', async () => {
      const jobId = 'cancellable_job';
      
      jest.spyOn(jobQueueManager, 'isJobRunning').mockReturnValue(false);
      jest.spyOn(jobQueueManager, 'acquireLock').mockResolvedValue(true);
      jest.spyOn(jobQueueManager, 'releaseLock').mockResolvedValue(true);

      let jobCancelled = false;
      const cancellableJob = async (signal) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            resolve({ success: true });
          }, 5000);

          signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            jobCancelled = true;
            reject(new Error('Job cancelled'));
          });
        });
      };

      // Start job and cancel it after 100ms
      const jobPromise = jobScheduler.executeJob(jobId, cancellableJob);
      
      setTimeout(() => {
        jobScheduler.cancelJob(jobId);
      }, 100);

      const result = await jobPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('cancelled');
      expect(jobCancelled).toBe(true);
    });
  });
});