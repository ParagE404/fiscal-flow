const AMFIDataProvider = require('../providers/AMFIDataProvider');
const EPFODataProvider = require('../providers/EPFODataProvider');
const YahooFinanceProvider = require('../providers/YahooFinanceProvider');
const NSEDataProvider = require('../providers/NSEDataProvider');
const axios = require('axios');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('Data Providers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AMFIDataProvider', () => {
    let amfiProvider;

    beforeEach(() => {
      amfiProvider = new AMFIDataProvider();
    });

    describe('isAvailable', () => {
      test('should return true when AMFI service is available', async () => {
        mockedAxios.head.mockResolvedValue({ status: 200 });

        const result = await amfiProvider.isAvailable();

        expect(result).toBe(true);
        expect(mockedAxios.head).toHaveBeenCalledWith(
          expect.stringContaining('amfiindia.com'),
          { timeout: 5000 }
        );
      });

      test('should return false when AMFI service is unavailable', async () => {
        mockedAxios.head.mockRejectedValue(new Error('Network error'));

        const result = await amfiProvider.isAvailable();

        expect(result).toBe(false);
      });
    });

    describe('fetchData', () => {
      test('should fetch and parse NAV data successfully', async () => {
        const mockCSVData = `Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
119551;INF209K01157;INF209K01165;Aditya Birla Sun Life Frontline Equity Fund - Growth;123.45;01-Jan-2024
119552;INF209K01173;INF209K01181;Aditya Birla Sun Life Frontline Equity Fund - Dividend;98.76;01-Jan-2024`;

        mockedAxios.get.mockResolvedValue({ data: mockCSVData });

        const isins = ['INF209K01157', 'INF209K01173'];
        const result = await amfiProvider.fetchData(isins);

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          schemeCode: '119551',
          isin: 'INF209K01157',
          schemeName: 'Aditya Birla Sun Life Frontline Equity Fund - Growth',
          nav: 123.45,
          date: expect.any(Date)
        });
        expect(result[1]).toMatchObject({
          schemeCode: '119552',
          isin: 'INF209K01173',
          schemeName: 'Aditya Birla Sun Life Frontline Equity Fund - Dividend',
          nav: 98.76,
          date: expect.any(Date)
        });
      });

      test('should filter data by requested ISINs', async () => {
        const mockCSVData = `Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
119551;INF209K01157;INF209K01165;Fund 1;123.45;01-Jan-2024
119552;INF209K01173;INF209K01181;Fund 2;98.76;01-Jan-2024
119553;INF209K01199;INF209K01207;Fund 3;87.65;01-Jan-2024`;

        mockedAxios.get.mockResolvedValue({ data: mockCSVData });

        const isins = ['INF209K01157']; // Only request one ISIN
        const result = await amfiProvider.fetchData(isins);

        expect(result).toHaveLength(1);
        expect(result[0].isin).toBe('INF209K01157');
      });

      test('should handle malformed CSV data gracefully', async () => {
        const mockCSVData = `Invalid CSV data
Not;Enough;Columns
119551;INF209K01157;INF209K01165;Fund 1;123.45;01-Jan-2024`; // This line is valid

        mockedAxios.get.mockResolvedValue({ data: mockCSVData });

        const isins = ['INF209K01157'];
        const result = await amfiProvider.fetchData(isins);

        expect(result).toHaveLength(1); // Only the valid line should be parsed
        expect(result[0].isin).toBe('INF209K01157');
      });

      test('should handle network errors', async () => {
        mockedAxios.get.mockRejectedValue(new Error('Network timeout'));

        const isins = ['INF209K01157'];
        
        await expect(amfiProvider.fetchData(isins)).rejects.toThrow('Network timeout');
      });
    });

    describe('validateData', () => {
      test('should validate correct NAV data', () => {
        const validData = [
          {
            schemeCode: '119551',
            isin: 'INF209K01157',
            schemeName: 'Test Fund',
            nav: 123.45,
            date: new Date()
          }
        ];

        const result = amfiProvider.validateData(validData);

        expect(result).toBe(true);
      });

      test('should reject data with invalid NAV values', () => {
        const invalidData = [
          {
            schemeCode: '119551',
            isin: 'INF209K01157',
            schemeName: 'Test Fund',
            nav: -10, // Negative NAV
            date: new Date()
          }
        ];

        const result = amfiProvider.validateData(invalidData);

        expect(result).toBe(false);
      });

      test('should reject data with missing ISIN', () => {
        const invalidData = [
          {
            schemeCode: '119551',
            isin: '', // Empty ISIN
            schemeName: 'Test Fund',
            nav: 123.45,
            date: new Date()
          }
        ];

        const result = amfiProvider.validateData(invalidData);

        expect(result).toBe(false);
      });

      test('should reject data with invalid date', () => {
        const invalidData = [
          {
            schemeCode: '119551',
            isin: 'INF209K01157',
            schemeName: 'Test Fund',
            nav: 123.45,
            date: 'invalid-date'
          }
        ];

        const result = amfiProvider.validateData(invalidData);

        expect(result).toBe(false);
      });
    });

    describe('transformData', () => {
      test('should transform NAV data to standard format', () => {
        const navData = [
          {
            schemeCode: '119551',
            isin: 'INF209K01157',
            schemeName: 'Test Fund',
            nav: 123.45,
            date: new Date('2024-01-01')
          }
        ];

        const result = amfiProvider.transformData(navData);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          identifier: 'INF209K01157',
          value: 123.45,
          date: expect.any(Date),
          source: 'AMFI'
        });
      });
    });
  });

  describe('EPFODataProvider', () => {
    let epfoProvider;

    beforeEach(() => {
      epfoProvider = new EPFODataProvider();
    });

    describe('isAvailable', () => {
      test('should return true when EPFO portal is available', async () => {
        mockedAxios.head.mockResolvedValue({ status: 200 });

        const result = await epfoProvider.isAvailable();

        expect(result).toBe(true);
      });

      test('should return false when EPFO portal is unavailable', async () => {
        mockedAxios.head.mockRejectedValue(new Error('Service unavailable'));

        const result = await epfoProvider.isAvailable();

        expect(result).toBe(false);
      });
    });

    describe('authenticate', () => {
      test('should authenticate with valid credentials', async () => {
        const credentials = {
          uan: '123456789012',
          password: 'validpassword'
        };

        // Mock successful authentication response
        mockedAxios.post.mockResolvedValue({
          status: 200,
          data: { success: true, sessionId: 'session123' }
        });

        const result = await epfoProvider.authenticate(credentials);

        expect(result).toBe(true);
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('login'),
          expect.objectContaining({
            uan: credentials.uan,
            password: credentials.password
          }),
          expect.any(Object)
        );
      });

      test('should fail authentication with invalid credentials', async () => {
        const credentials = {
          uan: '123456789012',
          password: 'invalidpassword'
        };

        mockedAxios.post.mockResolvedValue({
          status: 401,
          data: { success: false, error: 'Invalid credentials' }
        });

        const result = await epfoProvider.authenticate(credentials);

        expect(result).toBe(false);
      });

      test('should handle authentication network errors', async () => {
        const credentials = {
          uan: '123456789012',
          password: 'validpassword'
        };

        mockedAxios.post.mockRejectedValue(new Error('Network error'));

        await expect(epfoProvider.authenticate(credentials)).rejects.toThrow('Network error');
      });
    });

    describe('fetchData', () => {
      test('should fetch EPF account data successfully', async () => {
        const uans = ['123456789012'];
        const mockEPFData = {
          accounts: [
            {
              uan: '123456789012',
              accountNumber: 'PF123',
              currentBalance: 500000,
              employeeShare: 250000,
              employerShare: 200000,
              pensionShare: 50000,
              employeeName: 'Test User',
              employerName: 'Test Company',
              lastUpdated: '2024-01-01'
            }
          ]
        };

        // Mock authentication
        mockedAxios.post.mockResolvedValueOnce({
          status: 200,
          data: { success: true, sessionId: 'session123' }
        });

        // Mock data fetch
        mockedAxios.get.mockResolvedValue({
          status: 200,
          data: mockEPFData
        });

        const result = await epfoProvider.fetchData(uans, {
          uan: '123456789012',
          password: 'password'
        });

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          uan: '123456789012',
          accountNumber: 'PF123',
          currentBalance: 500000,
          employeeShare: 250000,
          employerShare: 200000,
          pensionShare: 50000
        });
      });

      test('should handle authentication failure during data fetch', async () => {
        const uans = ['123456789012'];
        
        mockedAxios.post.mockResolvedValue({
          status: 401,
          data: { success: false }
        });

        await expect(epfoProvider.fetchData(uans, {
          uan: '123456789012',
          password: 'wrongpassword'
        })).rejects.toThrow('Authentication failed');
      });
    });

    describe('validateData', () => {
      test('should validate correct EPF data', () => {
        const validData = [
          {
            uan: '123456789012',
            currentBalance: 500000,
            employeeShare: 250000,
            employerShare: 200000,
            pensionShare: 50000
          }
        ];

        const result = epfoProvider.validateData(validData);

        expect(result).toBe(true);
      });

      test('should reject data with negative balances', () => {
        const invalidData = [
          {
            uan: '123456789012',
            currentBalance: -1000, // Negative balance
            employeeShare: 250000,
            employerShare: 200000
          }
        ];

        const result = epfoProvider.validateData(invalidData);

        expect(result).toBe(false);
      });

      test('should reject data with invalid UAN format', () => {
        const invalidData = [
          {
            uan: '12345', // Invalid UAN length
            currentBalance: 500000,
            employeeShare: 250000,
            employerShare: 200000
          }
        ];

        const result = epfoProvider.validateData(invalidData);

        expect(result).toBe(false);
      });
    });
  });

  describe('YahooFinanceProvider', () => {
    let yahooProvider;

    beforeEach(() => {
      yahooProvider = new YahooFinanceProvider();
    });

    describe('isAvailable', () => {
      test('should return true when Yahoo Finance API is available', async () => {
        mockedAxios.head.mockResolvedValue({ status: 200 });

        const result = await yahooProvider.isAvailable();

        expect(result).toBe(true);
      });

      test('should return false when Yahoo Finance API is unavailable', async () => {
        mockedAxios.head.mockRejectedValue(new Error('Service unavailable'));

        const result = await yahooProvider.isAvailable();

        expect(result).toBe(false);
      });
    });

    describe('fetchData', () => {
      test('should fetch stock price data successfully', async () => {
        const symbols = ['RELIANCE.NS', 'TCS.NS'];
        const mockPriceData = {
          quoteResponse: {
            result: [
              {
                symbol: 'RELIANCE.NS',
                regularMarketPrice: 2500.50,
                regularMarketPreviousClose: 2480.25,
                regularMarketChange: 20.25,
                regularMarketChangePercent: 0.816,
                regularMarketTime: 1704067800
              },
              {
                symbol: 'TCS.NS',
                regularMarketPrice: 3750.75,
                regularMarketPreviousClose: 3720.50,
                regularMarketChange: 30.25,
                regularMarketChangePercent: 0.813,
                regularMarketTime: 1704067800
              }
            ]
          }
        };

        mockedAxios.get.mockResolvedValue({
          status: 200,
          data: mockPriceData
        });

        const result = await yahooProvider.fetchData(symbols);

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          symbol: 'RELIANCE.NS',
          value: 2500.50,
          metadata: expect.objectContaining({
            previousClose: 2480.25,
            change: 20.25,
            changePercent: 0.816
          })
        });
      });

      test('should handle API rate limiting', async () => {
        const symbols = ['RELIANCE.NS'];

        mockedAxios.get.mockRejectedValue({
          response: {
            status: 429,
            headers: { 'retry-after': '60' }
          }
        });

        await expect(yahooProvider.fetchData(symbols)).rejects.toMatchObject({
          response: { status: 429 }
        });
      });

      test('should handle invalid symbols gracefully', async () => {
        const symbols = ['INVALID.NS'];
        const mockPriceData = {
          quoteResponse: {
            result: [],
            error: null
          }
        };

        mockedAxios.get.mockResolvedValue({
          status: 200,
          data: mockPriceData
        });

        const result = await yahooProvider.fetchData(symbols);

        expect(result).toHaveLength(0);
      });
    });

    describe('validateData', () => {
      test('should validate correct stock price data', () => {
        const validData = [
          {
            symbol: 'RELIANCE.NS',
            value: 2500.50,
            timestamp: new Date(),
            metadata: {
              previousClose: 2480.25,
              change: 20.25
            }
          }
        ];

        const result = yahooProvider.validateData(validData);

        expect(result).toBe(true);
      });

      test('should reject data with invalid prices', () => {
        const invalidData = [
          {
            symbol: 'RELIANCE.NS',
            value: -100, // Negative price
            timestamp: new Date()
          }
        ];

        const result = yahooProvider.validateData(invalidData);

        expect(result).toBe(false);
      });

      test('should reject data with missing symbol', () => {
        const invalidData = [
          {
            symbol: '', // Empty symbol
            value: 2500.50,
            timestamp: new Date()
          }
        ];

        const result = yahooProvider.validateData(invalidData);

        expect(result).toBe(false);
      });
    });
  });

  describe('NSEDataProvider', () => {
    let nseProvider;

    beforeEach(() => {
      nseProvider = new NSEDataProvider();
    });

    describe('isAvailable', () => {
      test('should return true when NSE API is available', async () => {
        mockedAxios.head.mockResolvedValue({ status: 200 });

        const result = await nseProvider.isAvailable();

        expect(result).toBe(true);
      });

      test('should return false when NSE API is unavailable', async () => {
        mockedAxios.head.mockRejectedValue(new Error('Service unavailable'));

        const result = await nseProvider.isAvailable();

        expect(result).toBe(false);
      });
    });

    describe('fetchData', () => {
      test('should fetch NSE stock data successfully', async () => {
        const symbols = ['RELIANCE', 'TCS'];
        const mockNSEData = [
          {
            symbol: 'RELIANCE',
            lastPrice: 2500.50,
            pChange: 0.82,
            previousClose: 2480.25,
            open: 2485.00,
            dayHigh: 2510.00,
            dayLow: 2475.00
          },
          {
            symbol: 'TCS',
            lastPrice: 3750.75,
            pChange: 0.81,
            previousClose: 3720.50,
            open: 3725.00,
            dayHigh: 3760.00,
            dayLow: 3715.00
          }
        ];

        mockedAxios.get.mockResolvedValue({
          status: 200,
          data: mockNSEData
        });

        const result = await nseProvider.fetchData(symbols);

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          symbol: 'RELIANCE',
          value: 2500.50,
          metadata: expect.objectContaining({
            previousClose: 2480.25,
            changePercent: 0.82,
            dayHigh: 2510.00,
            dayLow: 2475.00
          })
        });
      });

      test('should handle NSE API authentication', async () => {
        const symbols = ['RELIANCE'];
        
        // Mock authentication call
        mockedAxios.post.mockResolvedValueOnce({
          status: 200,
          data: { token: 'auth-token-123' }
        });

        // Mock data fetch
        mockedAxios.get.mockResolvedValue({
          status: 200,
          data: [
            {
              symbol: 'RELIANCE',
              lastPrice: 2500.50,
              pChange: 0.82,
              previousClose: 2480.25
            }
          ]
        });

        const result = await nseProvider.fetchData(symbols, {
          apiKey: 'test-api-key'
        });

        expect(result).toHaveLength(1);
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('auth'),
          expect.objectContaining({
            apiKey: 'test-api-key'
          }),
          expect.any(Object)
        );
      });
    });

    describe('validateData', () => {
      test('should validate correct NSE data', () => {
        const validData = [
          {
            symbol: 'RELIANCE',
            value: 2500.50,
            timestamp: new Date(),
            metadata: {
              previousClose: 2480.25,
              changePercent: 0.82
            }
          }
        ];

        const result = nseProvider.validateData(validData);

        expect(result).toBe(true);
      });

      test('should reject data with invalid NSE symbols', () => {
        const invalidData = [
          {
            symbol: 'INVALID_SYMBOL_TOO_LONG',
            value: 2500.50,
            timestamp: new Date()
          }
        ];

        const result = nseProvider.validateData(invalidData);

        expect(result).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle network timeouts consistently across providers', async () => {
      const providers = [
        new AMFIDataProvider(),
        new YahooFinanceProvider(),
        new NSEDataProvider()
      ];

      for (const provider of providers) {
        mockedAxios.get.mockRejectedValue(new Error('ETIMEDOUT'));
        
        await expect(provider.fetchData(['test'])).rejects.toThrow('ETIMEDOUT');
      }
    });

    test('should handle HTTP error responses consistently', async () => {
      const providers = [
        new AMFIDataProvider(),
        new YahooFinanceProvider(),
        new NSEDataProvider()
      ];

      for (const provider of providers) {
        mockedAxios.get.mockRejectedValue({
          response: {
            status: 500,
            statusText: 'Internal Server Error'
          }
        });
        
        await expect(provider.fetchData(['test'])).rejects.toMatchObject({
          response: { status: 500 }
        });
      }
    });
  });
});