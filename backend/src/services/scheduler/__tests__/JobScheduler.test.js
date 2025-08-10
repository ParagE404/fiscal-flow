const JobScheduler = require('../JobScheduler');
const JobQueueManager = require('../JobQueueManager');
const MarketHoursUtil = require('../MarketHoursUtil');

// Mock dependencies
jest.mock('../JobPersistence');
jest.mock('../../sync/MutualFundSyncService');
jest.mock('../../sync/EPFSyncService');
jest.mock('../../sync/StockSyncService');

describe('JobScheduler', () => {
  let scheduler;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([])
      },
      jobConfiguration: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({})
      },
      jobExecution: {
        create: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 0 })
      }
    };

    scheduler = new JobScheduler(mockPrisma);
  });

  afterEach(() => {
    if (scheduler.isStarted) {
      scheduler.stop();
    }
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(scheduler.isStarted).toBe(false);
      expect(scheduler.jobs.size).toBe(0);
      expect(scheduler.syncServices.size).toBe(3);
      expect(scheduler.queueManager).toBeInstanceOf(JobQueueManager);
      expect(scheduler.marketHours).toBeInstanceOf(MarketHoursUtil);
    });

    it('should register default jobs', () => {
      scheduler.registerDefaultJobs();
      
      expect(scheduler.jobs.size).toBe(4); // MF daily, EPF monthly, Stocks hourly, Stocks EOD
      expect(scheduler.jobs.has('mutual_funds_daily')).toBe(true);
      expect(scheduler.jobs.has('epf_monthly')).toBe(true);
      expect(scheduler.jobs.has('stocks_hourly')).toBe(true);
      expect(scheduler.jobs.has('stocks_eod')).toBe(true);
    });
  });

  describe('job management', () => {
    beforeEach(() => {
      scheduler.registerDefaultJobs();
    });

    it('should enable and disable jobs', () => {
      const jobName = 'mutual_funds_daily';
      
      // Initially enabled
      expect(scheduler.jobStatus.get(jobName).enabled).toBe(true);
      
      // Disable job
      scheduler.setJobEnabled(jobName, false);
      expect(scheduler.jobStatus.get(jobName).enabled).toBe(false);
      
      // Enable job
      scheduler.setJobEnabled(jobName, true);
      expect(scheduler.jobStatus.get(jobName).enabled).toBe(true);
    });

    it('should get job priority correctly', () => {
      expect(scheduler.getJobPriority('stocks')).toBe('high');
      expect(scheduler.getJobPriority('mutual_funds')).toBe('normal');
      expect(scheduler.getJobPriority('epf')).toBe('low');
      expect(scheduler.getJobPriority('unknown')).toBe('normal');
    });

    it('should get job timeout correctly', () => {
      expect(scheduler.getJobTimeout('stocks')).toBe(5 * 60 * 1000);
      expect(scheduler.getJobTimeout('mutual_funds')).toBe(10 * 60 * 1000);
      expect(scheduler.getJobTimeout('epf')).toBe(15 * 60 * 1000);
      expect(scheduler.getJobTimeout('unknown')).toBe(10 * 60 * 1000);
    });
  });

  describe('market hours integration', () => {
    it('should check market status', () => {
      const marketStatus = scheduler.getMarketStatus();
      
      expect(marketStatus).toHaveProperty('status');
      expect(marketStatus).toHaveProperty('message');
      expect(marketStatus).toHaveProperty('isOpen');
      expect(marketStatus).toHaveProperty('currentTime');
    });

    it('should use market hours for conditional jobs', () => {
      const isMarketHours = scheduler.isMarketHours();
      expect(typeof isMarketHours).toBe('boolean');
    });
  });

  describe('statistics and monitoring', () => {
    beforeEach(() => {
      scheduler.registerDefaultJobs();
    });

    it('should provide scheduler statistics', () => {
      const stats = scheduler.getSchedulerStats();
      
      expect(stats).toHaveProperty('scheduler');
      expect(stats).toHaveProperty('queue');
      expect(stats).toHaveProperty('market');
      expect(stats).toHaveProperty('jobs');
      
      expect(stats.scheduler.totalJobs).toBe(4);
      expect(stats.scheduler.enabledJobs).toBe(4);
    });

    it('should provide queue statistics', () => {
      const queueStats = scheduler.getQueueStats();
      
      expect(queueStats).toHaveProperty('queued');
      expect(queueStats).toHaveProperty('running');
      expect(queueStats).toHaveProperty('capacity');
      expect(queueStats).toHaveProperty('recentExecutions');
    });
  });

  describe('error handling', () => {
    it('should handle job registration errors', () => {
      scheduler.registerDefaultJobs();
      
      // Try to register duplicate job
      expect(() => {
        scheduler.registerJob('mutual_funds_daily', {
          schedule: '0 18 * * *',
          syncType: 'mutual_funds',
          description: 'Duplicate job'
        });
      }).toThrow('Job mutual_funds_daily is already registered');
    });

    it('should handle invalid sync type', () => {
      expect(() => {
        scheduler.registerJob('invalid_job', {
          schedule: '0 18 * * *',
          syncType: 'invalid_type',
          description: 'Invalid job'
        });
      }).toThrow('Sync service not found for type: invalid_type');
    });
  });
});

describe('MarketHoursUtil', () => {
  let marketHours;

  beforeEach(() => {
    marketHours = new MarketHoursUtil();
  });

  describe('market hours detection', () => {
    it('should detect weekdays correctly', () => {
      const monday = new Date('2024-01-01T10:00:00+05:30'); // Monday in IST
      const sunday = new Date('2024-01-07T10:00:00+05:30'); // Sunday in IST
      
      expect(marketHours.isWeekday(monday)).toBe(true);
      expect(marketHours.isWeekday(sunday)).toBe(false);
    });

    it('should detect market holidays', () => {
      const republicDay = new Date('2024-01-26T10:00:00+05:30');
      const normalDay = new Date('2024-01-25T10:00:00+05:30');
      
      expect(marketHours.isMarketHoliday(republicDay)).toBe(true);
      expect(marketHours.isMarketHoliday(normalDay)).toBe(false);
    });

    it('should provide market status', () => {
      const status = marketHours.getMarketStatus();
      
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('message');
      expect(status).toHaveProperty('isOpen');
      expect(status).toHaveProperty('currentTime');
      expect(status).toHaveProperty('nextOpen');
    });
  });

  describe('optimal sync times', () => {
    it('should provide optimal sync schedules', () => {
      const optimalTimes = marketHours.getOptimalSyncTimes();
      
      expect(optimalTimes).toHaveProperty('mutualFunds');
      expect(optimalTimes).toHaveProperty('epf');
      expect(optimalTimes).toHaveProperty('stocks');
      expect(optimalTimes).toHaveProperty('stocksEndOfDay');
      
      expect(optimalTimes.mutualFunds.schedule).toBe('0 18 * * *');
      expect(optimalTimes.epf.schedule).toBe('0 2 1 * *');
    });
  });
});

describe('JobQueueManager', () => {
  let queueManager;

  beforeEach(() => {
    queueManager = new JobQueueManager({
      maxConcurrentJobs: 2,
      maxQueueSize: 10
    });
  });

  afterEach(() => {
    if (queueManager.isProcessing) {
      queueManager.stop();
    }
  });

  describe('job queuing', () => {
    it('should enqueue jobs successfully', () => {
      const jobId = queueManager.enqueue({
        name: 'test_job',
        operation: async () => 'success',
        priority: 'normal'
      });
      
      expect(typeof jobId).toBe('string');
      expect(queueManager.getTotalQueueSize()).toBe(1);
    });

    it('should respect queue size limits', () => {
      // Fill the queue
      for (let i = 0; i < 10; i++) {
        queueManager.enqueue({
          name: `test_job_${i}`,
          operation: async () => 'success'
        });
      }
      
      // Try to add one more
      expect(() => {
        queueManager.enqueue({
          name: 'overflow_job',
          operation: async () => 'success'
        });
      }).toThrow('Queue is full');
    });

    it('should prioritize jobs correctly', () => {
      queueManager.enqueue({
        name: 'low_priority',
        operation: async () => 'success',
        priority: 'low'
      });
      
      queueManager.enqueue({
        name: 'high_priority',
        operation: async () => 'success',
        priority: 'high'
      });
      
      const nextJob = queueManager.getNextJob();
      expect(nextJob.name).toBe('high_priority');
    });
  });

  describe('statistics', () => {
    it('should provide queue statistics', () => {
      queueManager.enqueue({
        name: 'test_job',
        operation: async () => 'success'
      });
      
      const stats = queueManager.getQueueStats();
      
      expect(stats).toHaveProperty('queued');
      expect(stats).toHaveProperty('running');
      expect(stats).toHaveProperty('capacity');
      expect(stats.queued.total).toBe(1);
    });
  });
});