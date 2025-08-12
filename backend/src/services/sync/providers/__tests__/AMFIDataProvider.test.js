const AMFIDataProvider = require('../AMFIDataProvider');
const axios = require('axios');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('AMFIDataProvider', () => {
  let provider;

  beforeEach(() => {
    provider = new AMFIDataProvider();
    jest.clearAllMocks();
  });

  describe('Basic Properties', () => {
    test('should have correct name', () => {
      expect(provider.name).toBe('AMFI');
    });

    test('should have correct rate limits', () => {
      const limits = provider.getRateLimits();
      expect(limits.requestsPerMinute).toBe(10);
      expect(limits.requestsPerHour).toBe(100);
      expect(limits.requestsPerDay).toBe(1000);
    });
  });

  describe('isAvailable', () => {
    test('should return true when AMFI service is available', async () => {
      mockedAxios.head.mockResolvedValue({ status: 200 });

      const result = await provider.isAvailable();

      expect(result).toBe(true);
      expect(mockedAxios.head).toHaveBeenCalledWith(
        provider.NAV_URL,
        expect.objectContaining({
          timeout: 5000,
          headers: expect.objectContaining({
            'User-Agent': 'FinVista-Sync/1.0'
          })
        })
      );
    });

    test('should return false when AMFI service is unavailable', async () => {
      mockedAxios.head.mockRejectedValue(new Error('Network error'));

      const result = await provider.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('parseDate', () => {
    test('should parse valid AMFI date format', () => {
      const date = provider.parseDate('08-Jan-2024');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0); // January is 0
      expect(date.getDate()).toBe(8);
    });

    test('should return null for invalid date formats', () => {
      expect(provider.parseDate('invalid-date')).toBeNull();
      expect(provider.parseDate('32-Jan-2024')).toBeNull();
      expect(provider.parseDate('08-InvalidMonth-2024')).toBeNull();
      expect(provider.parseDate('')).toBeNull();
      expect(provider.parseDate(null)).toBeNull();
    });

    test('should handle all month abbreviations', () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      months.forEach((month, index) => {
        const date = provider.parseDate(`15-${month}-2024`);
        expect(date).toBeInstanceOf(Date);
        expect(date.getMonth()).toBe(index);
      });
    });
  });

  describe('parseNAVData', () => {
    test('should parse valid AMFI CSV data', () => {
      const csvData = `Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
123456;INF123456789;INF123456790;Test Mutual Fund;25.50;08-Jan-2024
789012;INF789012345;N.A.;Another Fund;15.75;08-Jan-2024`;

      const result = provider.parseNAVData(csvData);

      expect(result).toHaveLength(3); // 2 records for first fund (2 ISINs), 1 for second
      
      const firstRecord = result[0];
      expect(firstRecord.schemeCode).toBe('123456');
      expect(firstRecord.isin).toBe('INF123456789');
      expect(firstRecord.schemeName).toBe('Test Mutual Fund');
      expect(firstRecord.nav).toBe(25.50);
      expect(firstRecord.date).toBeInstanceOf(Date);
      expect(firstRecord.source).toBe('AMFI');
    });

    test('should skip invalid lines', () => {
      const csvData = `Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
123456;INF123456789;INF123456790;Test Fund;invalid_nav;08-Jan-2024
789012;INF789012345;N.A.;Another Fund;15.75;invalid-date
345678;INF345678901;N.A.;Valid Fund;30.25;08-Jan-2024`;

      const result = provider.parseNAVData(csvData);

      expect(result).toHaveLength(1); // Only the valid record
      expect(result[0].schemeCode).toBe('345678');
      expect(result[0].nav).toBe(30.25);
    });

    test('should handle empty or malformed CSV', () => {
      expect(provider.parseNAVData('')).toEqual([]);
      expect(provider.parseNAVData('invalid csv data')).toEqual([]);
      expect(provider.parseNAVData('header only\n')).toEqual([]);
    });
  });

  describe('validateData', () => {
    test('should validate correct NAV data', () => {
      const validData = [
        {
          isin: 'INF123456789',
          schemeCode: '123456',
          schemeName: 'Test Fund',
          nav: 25.50,
          date: new Date(),
          source: 'AMFI'
        }
      ];

      expect(provider.validateData(validData)).toBe(true);
    });

    test('should reject invalid data', () => {
      // Missing required fields
      expect(provider.validateData([{ nav: 25.50 }])).toBe(false);
      
      // Invalid NAV values
      expect(provider.validateData([{
        isin: 'INF123456789',
        schemeCode: '123456',
        schemeName: 'Test Fund',
        nav: -5,
        date: new Date()
      }])).toBe(false);

      expect(provider.validateData([{
        isin: 'INF123456789',
        schemeCode: '123456',
        schemeName: 'Test Fund',
        nav: 'invalid',
        date: new Date()
      }])).toBe(false);

      // Invalid date
      expect(provider.validateData([{
        isin: 'INF123456789',
        schemeCode: '123456',
        schemeName: 'Test Fund',
        nav: 25.50,
        date: 'invalid date'
      }])).toBe(false);

      // Non-array input
      expect(provider.validateData('not an array')).toBe(false);
    });
  });

  describe('transformData', () => {
    test('should transform NAV data to standard format', () => {
      const rawData = [
        {
          schemeCode: '123456',
          isin: 'INF123456789',
          schemeName: 'Test Mutual Fund',
          nav: 25.50,
          date: new Date('2024-01-08'),
          source: 'AMFI'
        }
      ];

      const result = provider.transformData(rawData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        identifier: 'INF123456789',
        alternateIdentifier: '123456',
        name: 'Test Mutual Fund',
        value: 25.50,
        date: new Date('2024-01-08'),
        source: 'AMFI',
        metadata: {
          schemeCode: '123456',
          isin: 'INF123456789',
          schemeName: 'Test Mutual Fund'
        }
      });
    });
  });

  describe('fetchData', () => {
    test('should fetch and filter NAV data for given ISINs', async () => {
      const mockCSVData = `Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
123456;INF123456789;INF123456790;Test Fund 1;25.50;08-Jan-2024
789012;INF789012345;N.A.;Test Fund 2;15.75;08-Jan-2024
345678;INF345678901;N.A.;Test Fund 3;30.25;08-Jan-2024`;

      mockedAxios.get.mockResolvedValue({ data: mockCSVData });

      const result = await provider.fetchData(['INF123456789', 'INF345678901']);

      expect(result).toHaveLength(2);
      expect(result[0].identifier).toBe('INF123456789');
      expect(result[1].identifier).toBe('INF345678901');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        provider.NAV_URL,
        expect.objectContaining({
          timeout: 30000,
          responseType: 'text'
        })
      );
    });

    test('should handle fetch errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network timeout'));

      await expect(provider.fetchData(['INF123456789']))
        .rejects.toThrow('AMFI data fetch failed: Network timeout');
    });

    test('should use cache when available', async () => {
      const mockCSVData = `Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
123456;INF123456789;INF123456790;Test Fund;25.50;08-Jan-2024`;

      // First call - should fetch from API
      mockedAxios.get.mockResolvedValue({ data: mockCSVData });
      await provider.fetchData(['INF123456789']);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await provider.fetchData(['INF123456789']);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Still only 1 call
    });
  });

  describe('Cache Management', () => {
    test('should cache and retrieve data', () => {
      const testData = [{ test: 'data' }];
      provider.setCache('test_key', testData);
      
      const retrieved = provider.getFromCache('test_key');
      expect(retrieved).toEqual(testData);
    });

    test('should return null for expired cache', (done) => {
      const testData = [{ test: 'data' }];
      provider.cacheExpiry = 10; // 10ms expiry for testing
      
      provider.setCache('test_key', testData);
      
      setTimeout(() => {
        const retrieved = provider.getFromCache('test_key');
        expect(retrieved).toBeNull();
        done();
      }, 20);
    });

    test('should clear cache', () => {
      provider.setCache('test_key', [{ test: 'data' }]);
      expect(provider.getFromCache('test_key')).toBeTruthy();
      
      provider.clearCache();
      expect(provider.getFromCache('test_key')).toBeNull();
    });
  });
});