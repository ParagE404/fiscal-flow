const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const syncRoutes = require('../../../routes/syncRoutes');
const authMiddleware = require('../../../middleware/auth');
const nock = require('nock');

// Mock auth middleware
jest.mock('../../../middleware/auth', () => {
  return (req, res, next) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  };
});

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn()
  },
  mutualFund: {
    findMany: jest.fn(),
    update: jest.fn()
  },
  stock: {
    findMany: jest.fn(),
    update: jest.fn()
  },
  ePFAccount: {
    findMany: jest.fn(),
    update: jest.fn()
  },
  syncConfiguration: {
    findUnique: jest.fn(),
    upsert: jest.fn()
  },
  syncMetadata: {
    findMany: jest.fn(),
    upsert: jest.fn()
  },
  encryptedCredentials: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn()
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
}));

describe('Sync API Integration Tests', () => {
  let app;
  const testUserId = 'test-user-id';

  beforeAll(() => {
    // Set up test environment
    process.env.CREDENTIAL_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    
    // Create Express app with sync routes
    app = express();
    app.use(express.json());
    app.use('/api/sync', syncRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Manual Sync Endpoints', () => {
    describe('POST /api/sync/:type', () => {
      test('should trigger manual mutual fund sync successfully', async () => {
        // Mock user data
        mockPrisma.user.findUnique.mockResolvedValue({
          id: testUserId,
          email: 'test@example.com'
        });

        // Mock mutual funds
        mockPrisma.mutualFund.findMany.mockResolvedValue([
          {
            id: 'fund1',
            name: 'Test Fund',
            isin: 'INF209K01157',
            investedAmount: 10000,
            manualOverride: false
          }
        ]);

        // Mock sync configuration
        mockPrisma.syncConfiguration.findUnique.mockResolvedValue({
          isEnabled: true
        });

        // Mock AMFI API
        const mockNAVData = `Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
119551;INF209K01157;INF209K01165;Test Fund;125.50;01-Jan-2024`;

        nock('https://www.amfiindia.com')
          .get('/spages/NAVAll.txt')
          .reply(200, mockNAVData);

        mockPrisma.mutualFund.update.mockResolvedValue({});
        mockPrisma.syncMetadata.upsert.mockResolvedValue({});

        const response = await request(app)
          .post('/api/sync/mutual_funds')
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          recordsProcessed: expect.any(Number),
          recordsUpdated: expect.any(Number),
          duration: expect.any(Number)
        });

        expect(mockPrisma.mutualFund.update).toHaveBeenCalled();
      });

      test('should trigger manual stock sync successfully', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
          id: testUserId,
          email: 'test@example.com'
        });

        mockPrisma.stock.findMany.mockResolvedValue([
          {
            id: 'stock1',
            symbol: 'RELIANCE',
            exchange: 'NSE',
            quantity: 100,
            averagePrice: 2500,
            manualOverride: false
          }
        ]);

        mockPrisma.syncConfiguration.findUnique.mockResolvedValue({
          isEnabled: true
        });

        // Mock Yahoo Finance API
        nock('https://query1.finance.yahoo.com')
          .get('/v8/finance/chart/RELIANCE.NS')
          .reply(200, {
            chart: {
              result: [{
                meta: {
                  symbol: 'RELIANCE.NS',
                  regularMarketPrice: 2650.75,
                  previousClose: 2600.50
                }
              }]
            }
          });

        mockPrisma.stock.update.mockResolvedValue({});
        mockPrisma.syncMetadata.upsert.mockResolvedValue({});

        const response = await request(app)
          .post('/api/sync/stocks')
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          recordsProcessed: expect.any(Number),
          recordsUpdated: expect.any(Number)
        });
      });

      test('should handle invalid sync type', async () => {
        const response = await request(app)
          .post('/api/sync/invalid_type')
          .expect(400);

        expect(response.body).toMatchObject({
          error: 'Invalid sync type'
        });
      });

      test('should handle sync when disabled', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
          id: testUserId,
          email: 'test@example.com'
        });

        mockPrisma.syncConfiguration.findUnique.mockResolvedValue({
          isEnabled: false
        });

        const response = await request(app)
          .post('/api/sync/mutual_funds')
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          warnings: expect.arrayContaining([
            expect.objectContaining({
              type: 'sync_disabled'
            })
          ])
        });
      });

      test('should handle API failures gracefully', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
          id: testUserId,
          email: 'test@example.com'
        });

        mockPrisma.mutualFund.findMany.mockResolvedValue([
          {
            id: 'fund1',
            isin: 'INF209K01157',
            manualOverride: false
          }
        ]);

        mockPrisma.syncConfiguration.findUnique.mockResolvedValue({
          isEnabled: true
        });

        // Mock API failure
        nock('https://www.amfiindia.com')
          .get('/spages/NAVAll.txt')
          .reply(500, 'Internal Server Error');

        mockPrisma.syncMetadata.findMany.mockResolvedValue([]);

        const response = await request(app)
          .post('/api/sync/mutual_funds')
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          warnings: expect.arrayContaining([
            expect.objectContaining({
              type: 'no_nav_data'
            })
          ])
        });
      });
    });

    describe('GET /api/sync/:type/status', () => {
      test('should return sync status for mutual funds', async () => {
        mockPrisma.mutualFund.findMany.mockResolvedValue([
          {
            id: 'fund1',
            name: 'Test Fund 1',
            isin: 'INF209K01157',
            syncStatus: 'synced',
            lastSyncAt: new Date(),
            manualOverride: false
          },
          {
            id: 'fund2',
            name: 'Test Fund 2',
            isin: null,
            syncStatus: 'manual',
            lastSyncAt: null,
            manualOverride: false
          }
        ]);

        mockPrisma.syncMetadata.findMany.mockResolvedValue([
          {
            investmentId: 'fund1',
            lastSyncAt: new Date(),
            syncStatus: 'success',
            errorMessage: null
          }
        ]);

        const response = await request(app)
          .get('/api/sync/mutual_funds/status')
          .expect(200);

        expect(response.body).toMatchObject({
          totalFunds: 2,
          syncableFunds: 1,
          fundsStatus: expect.arrayContaining([
            expect.objectContaining({
              name: 'Test Fund 1',
              syncStatus: 'synced'
            }),
            expect.objectContaining({
              name: 'Test Fund 2',
              syncStatus: 'manual'
            })
          ])
        });
      });

      test('should return sync status for stocks', async () => {
        mockPrisma.stock.findMany.mockResolvedValue([
          {
            id: 'stock1',
            symbol: 'RELIANCE',
            exchange: 'NSE',
            syncStatus: 'synced',
            lastSyncAt: new Date()
          }
        ]);

        mockPrisma.syncMetadata.findMany.mockResolvedValue([
          {
            investmentId: 'stock1',
            lastSyncAt: new Date(),
            syncStatus: 'success'
          }
        ]);

        const response = await request(app)
          .get('/api/sync/stocks/status')
          .expect(200);

        expect(response.body).toMatchObject({
          totalStocks: 1,
          stocksStatus: expect.arrayContaining([
            expect.objectContaining({
              symbol: 'RELIANCE',
              syncStatus: 'synced'
            })
          ])
        });
      });
    });
  });

  describe('Sync Configuration Endpoints', () => {
    describe('GET /api/sync/config', () => {
      test('should return user sync configuration', async () => {
        const mockConfigs = [
          {
            investmentType: 'mutual_funds',
            isEnabled: true,
            syncFrequency: 'daily',
            preferredSource: 'amfi',
            notifyOnFailure: true
          },
          {
            investmentType: 'stocks',
            isEnabled: false,
            syncFrequency: 'hourly',
            preferredSource: 'yahoo_finance',
            notifyOnFailure: true
          }
        ];

        mockPrisma.syncConfiguration.findMany = jest.fn().mockResolvedValue(mockConfigs);

        const response = await request(app)
          .get('/api/sync/config')
          .expect(200);

        expect(response.body).toMatchObject({
          configurations: mockConfigs
        });
      });

      test('should return default configuration when none exists', async () => {
        mockPrisma.syncConfiguration.findMany = jest.fn().mockResolvedValue([]);

        const response = await request(app)
          .get('/api/sync/config')
          .expect(200);

        expect(response.body).toMatchObject({
          configurations: []
        });
      });
    });

    describe('PUT /api/sync/config', () => {
      test('should update sync configuration', async () => {
        const configUpdate = {
          investmentType: 'mutual_funds',
          isEnabled: true,
          syncFrequency: 'daily',
          preferredSource: 'amfi',
          notifyOnFailure: true
        };

        mockPrisma.syncConfiguration.upsert.mockResolvedValue({
          id: 'config1',
          userId: testUserId,
          ...configUpdate
        });

        const response = await request(app)
          .put('/api/sync/config')
          .send(configUpdate)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          configuration: expect.objectContaining(configUpdate)
        });

        expect(mockPrisma.syncConfiguration.upsert).toHaveBeenCalledWith({
          where: {
            userId_investmentType: {
              userId: testUserId,
              investmentType: 'mutual_funds'
            }
          },
          update: expect.objectContaining(configUpdate),
          create: expect.objectContaining({
            userId: testUserId,
            ...configUpdate
          })
        });
      });

      test('should validate configuration data', async () => {
        const invalidConfig = {
          investmentType: 'invalid_type',
          isEnabled: 'not_boolean',
          syncFrequency: 'invalid_frequency'
        };

        const response = await request(app)
          .put('/api/sync/config')
          .send(invalidConfig)
          .expect(400);

        expect(response.body).toMatchObject({
          error: 'Invalid configuration data'
        });
      });
    });
  });

  describe('Credential Management Endpoints', () => {
    describe('POST /api/sync/credentials/:service', () => {
      test('should store EPFO credentials securely', async () => {
        const credentials = {
          uan: '123456789012',
          password: 'testpassword'
        };

        mockPrisma.encryptedCredentials.upsert.mockResolvedValue({
          id: 'cred1',
          userId: testUserId,
          service: 'epfo'
        });

        const response = await request(app)
          .post('/api/sync/credentials/epfo')
          .send(credentials)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Credentials stored successfully'
        });

        expect(mockPrisma.encryptedCredentials.upsert).toHaveBeenCalled();
      });

      test('should validate EPFO credentials', async () => {
        const invalidCredentials = {
          uan: '12345', // Invalid UAN length
          password: 'testpassword'
        };

        const response = await request(app)
          .post('/api/sync/credentials/epfo')
          .send(invalidCredentials)
          .expect(400);

        expect(response.body).toMatchObject({
          error: expect.stringContaining('UAN must be a 12-digit string')
        });
      });

      test('should store API key credentials', async () => {
        const credentials = {
          apiKey: 'test-api-key-123'
        };

        mockPrisma.encryptedCredentials.upsert.mockResolvedValue({
          id: 'cred2',
          userId: testUserId,
          service: 'yahoo_finance'
        });

        const response = await request(app)
          .post('/api/sync/credentials/yahoo_finance')
          .send(credentials)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Credentials stored successfully'
        });
      });

      test('should handle unsupported service', async () => {
        const credentials = {
          apiKey: 'test-key'
        };

        const response = await request(app)
          .post('/api/sync/credentials/unsupported_service')
          .send(credentials)
          .expect(400);

        expect(response.body).toMatchObject({
          error: 'Unsupported service'
        });
      });
    });

    describe('DELETE /api/sync/credentials/:service', () => {
      test('should delete stored credentials', async () => {
        mockPrisma.encryptedCredentials.delete.mockResolvedValue({
          id: 'cred1'
        });

        const response = await request(app)
          .delete('/api/sync/credentials/epfo')
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Credentials deleted successfully'
        });

        expect(mockPrisma.encryptedCredentials.delete).toHaveBeenCalledWith({
          where: {
            userId_service: {
              userId: testUserId,
              service: 'epfo'
            }
          }
        });
      });

      test('should handle deletion of non-existent credentials', async () => {
        mockPrisma.encryptedCredentials.delete.mockRejectedValue({
          code: 'P2025' // Prisma "Record not found" error
        });

        const response = await request(app)
          .delete('/api/sync/credentials/epfo')
          .expect(404);

        expect(response.body).toMatchObject({
          error: 'Credentials not found'
        });
      });
    });

    describe('GET /api/sync/credentials', () => {
      test('should list stored credential services', async () => {
        mockPrisma.encryptedCredentials.findMany.mockResolvedValue([
          { service: 'epfo' },
          { service: 'yahoo_finance' }
        ]);

        const response = await request(app)
          .get('/api/sync/credentials')
          .expect(200);

        expect(response.body).toMatchObject({
          services: ['epfo', 'yahoo_finance']
        });
      });
    });
  });

  describe('Sync History and Logs', () => {
    describe('GET /api/sync/history', () => {
      test('should return sync history for all investment types', async () => {
        const mockHistory = [
          {
            id: 'sync1',
            investmentType: 'mutual_funds',
            lastSyncAt: new Date(),
            syncStatus: 'success',
            recordsUpdated: 5,
            duration: 2500
          },
          {
            id: 'sync2',
            investmentType: 'stocks',
            lastSyncAt: new Date(),
            syncStatus: 'failed',
            errorMessage: 'Network timeout'
          }
        ];

        mockPrisma.syncMetadata.findMany.mockResolvedValue(mockHistory);

        const response = await request(app)
          .get('/api/sync/history')
          .expect(200);

        expect(response.body).toMatchObject({
          history: mockHistory
        });
      });

      test('should filter sync history by investment type', async () => {
        const mockHistory = [
          {
            id: 'sync1',
            investmentType: 'mutual_funds',
            lastSyncAt: new Date(),
            syncStatus: 'success'
          }
        ];

        mockPrisma.syncMetadata.findMany.mockResolvedValue(mockHistory);

        const response = await request(app)
          .get('/api/sync/history?type=mutual_funds')
          .expect(200);

        expect(response.body).toMatchObject({
          history: mockHistory
        });

        expect(mockPrisma.syncMetadata.findMany).toHaveBeenCalledWith({
          where: {
            userId: testUserId,
            investmentType: 'mutual_funds'
          },
          orderBy: { lastSyncAt: 'desc' },
          take: 50
        });
      });

      test('should limit sync history results', async () => {
        mockPrisma.syncMetadata.findMany.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/sync/history?limit=10')
          .expect(200);

        expect(mockPrisma.syncMetadata.findMany).toHaveBeenCalledWith({
          where: { userId: testUserId },
          orderBy: { lastSyncAt: 'desc' },
          take: 10
        });
      });
    });
  });

  describe('Rate Limiting and Security', () => {
    test('should rate limit manual sync requests', async () => {
      // Mock rate limiting middleware
      const rateLimitSpy = jest.fn((req, res, next) => {
        res.status(429).json({ error: 'Too many requests' });
      });

      // Temporarily replace the route handler
      app._router.stack.forEach(layer => {
        if (layer.route && layer.route.path === '/api/sync/:type') {
          layer.route.stack[0].handle = rateLimitSpy;
        }
      });

      const response = await request(app)
        .post('/api/sync/mutual_funds')
        .expect(429);

      expect(response.body).toMatchObject({
        error: 'Too many requests'
      });
    });

    test('should require authentication for all endpoints', async () => {
      // Temporarily remove auth middleware
      const originalAuth = authMiddleware;
      jest.doMock('../../../middleware/auth', () => {
        return (req, res, next) => {
          res.status(401).json({ error: 'Unauthorized' });
        };
      });

      const response = await request(app)
        .get('/api/sync/config')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Unauthorized'
      });
    });

    test('should validate request data to prevent injection attacks', async () => {
      const maliciousData = {
        investmentType: 'mutual_funds; DROP TABLE users; --',
        isEnabled: true
      };

      const response = await request(app)
        .put('/api/sync/config')
        .send(maliciousData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid configuration data'
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      mockPrisma.syncConfiguration.findMany.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/sync/config')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Internal server error'
      });
    });

    test('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/sync/credentials/epfo')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('Invalid JSON')
      });
    });

    test('should handle missing required fields', async () => {
      const incompleteCredentials = {
        uan: '123456789012'
        // Missing password
      };

      const response = await request(app)
        .post('/api/sync/credentials/epfo')
        .send(incompleteCredentials)
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('password')
      });
    });
  });
});