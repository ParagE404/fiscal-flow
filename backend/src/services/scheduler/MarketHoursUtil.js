/**
 * Market Hours Utility for Indian Stock Markets
 * Handles market timing, holidays, and trading sessions
 */
class MarketHoursUtil {
  constructor() {
    // Indian market timings (IST)
    this.marketStart = { hour: 9, minute: 15 }; // 9:15 AM
    this.marketEnd = { hour: 15, minute: 30 };  // 3:30 PM
    this.preMarketStart = { hour: 9, minute: 0 }; // 9:00 AM
    this.postMarketEnd = { hour: 16, minute: 0 }; // 4:00 PM
    
    // Market holidays for 2024-2025 (basic list - should be updated annually)
    this.marketHolidays2024 = [
      '2024-01-26', // Republic Day
      '2024-03-08', // Holi
      '2024-03-29', // Good Friday
      '2024-04-11', // Eid ul Fitr
      '2024-04-17', // Ram Navami
      '2024-05-01', // Maharashtra Day
      '2024-06-17', // Eid ul Adha
      '2024-08-15', // Independence Day
      '2024-08-26', // Janmashtami
      '2024-10-02', // Gandhi Jayanti
      '2024-10-31', // Diwali Laxmi Pujan
      '2024-11-01', // Diwali Balipratipada
      '2024-11-15', // Guru Nanak Jayanti
      '2024-12-25', // Christmas
    ];
    
    this.marketHolidays2025 = [
      '2025-01-26', // Republic Day
      '2025-03-14', // Holi
      '2025-03-31', // Eid ul Fitr
      '2025-04-06', // Ram Navami
      '2025-04-18', // Good Friday
      '2025-05-01', // Maharashtra Day
      '2025-06-07', // Eid ul Adha
      '2025-08-15', // Independence Day
      '2025-08-16', // Janmashtami
      '2025-10-02', // Gandhi Jayanti
      '2025-10-20', // Diwali Laxmi Pujan
      '2025-10-21', // Diwali Balipratipada
      '2025-11-05', // Guru Nanak Jayanti
      '2025-12-25', // Christmas
    ];
  }

  /**
   * Check if current time is within market hours
   * @returns {boolean} True if market is open
   */
  isMarketOpen() {
    return this.isMarketOpenAt(new Date());
  }

  /**
   * Check if market is open at a specific time
   * @param {Date} date - Date/time to check
   * @returns {boolean} True if market is open
   */
  isMarketOpenAt(date) {
    const istTime = this.toIST(date);
    
    // Check if it's a weekday
    if (!this.isWeekday(istTime)) {
      return false;
    }
    
    // Check if it's a market holiday
    if (this.isMarketHoliday(istTime)) {
      return false;
    }
    
    // Check if within market hours
    return this.isWithinMarketHours(istTime);
  }

  /**
   * Check if current time is within pre-market hours
   * @returns {boolean} True if in pre-market
   */
  isPreMarketHours() {
    const istTime = this.toIST(new Date());
    
    if (!this.isWeekday(istTime) || this.isMarketHoliday(istTime)) {
      return false;
    }
    
    const timeInMinutes = istTime.getHours() * 60 + istTime.getMinutes();
    const preMarketStart = this.preMarketStart.hour * 60 + this.preMarketStart.minute;
    const marketStart = this.marketStart.hour * 60 + this.marketStart.minute;
    
    return timeInMinutes >= preMarketStart && timeInMinutes < marketStart;
  }

  /**
   * Check if current time is within post-market hours
   * @returns {boolean} True if in post-market
   */
  isPostMarketHours() {
    const istTime = this.toIST(new Date());
    
    if (!this.isWeekday(istTime) || this.isMarketHoliday(istTime)) {
      return false;
    }
    
    const timeInMinutes = istTime.getHours() * 60 + istTime.getMinutes();
    const marketEnd = this.marketEnd.hour * 60 + this.marketEnd.minute;
    const postMarketEnd = this.postMarketEnd.hour * 60 + this.postMarketEnd.minute;
    
    return timeInMinutes > marketEnd && timeInMinutes <= postMarketEnd;
  }

  /**
   * Get next market open time
   * @returns {Date} Next market open time
   */
  getNextMarketOpen() {
    const now = this.toIST(new Date());
    let nextOpen = new Date(now);
    
    // If market is currently open, return next day's open
    if (this.isMarketOpenAt(now)) {
      nextOpen.setDate(nextOpen.getDate() + 1);
    }
    
    // Find next weekday that's not a holiday
    while (!this.isWeekday(nextOpen) || this.isMarketHoliday(nextOpen)) {
      nextOpen.setDate(nextOpen.getDate() + 1);
    }
    
    // Set to market open time
    nextOpen.setHours(this.marketStart.hour, this.marketStart.minute, 0, 0);
    
    return nextOpen;
  }

  /**
   * Get next market close time
   * @returns {Date} Next market close time
   */
  getNextMarketClose() {
    const now = this.toIST(new Date());
    let nextClose = new Date(now);
    
    // If market is closed, find next open day
    if (!this.isMarketOpenAt(now)) {
      nextClose = this.getNextMarketOpen();
    }
    
    // Set to market close time
    nextClose.setHours(this.marketEnd.hour, this.marketEnd.minute, 0, 0);
    
    return nextClose;
  }

  /**
   * Convert date to IST
   * @param {Date} date - Date to convert
   * @returns {Date} Date in IST
   */
  toIST(date) {
    return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  }

  /**
   * Check if date is a weekday
   * @param {Date} date - Date to check
   * @returns {boolean} True if weekday
   */
  isWeekday(date) {
    const dayOfWeek = date.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
  }

  /**
   * Check if date is within market hours
   * @param {Date} date - Date to check (should be in IST)
   * @returns {boolean} True if within market hours
   */
  isWithinMarketHours(date) {
    const timeInMinutes = date.getHours() * 60 + date.getMinutes();
    const marketStart = this.marketStart.hour * 60 + this.marketStart.minute;
    const marketEnd = this.marketEnd.hour * 60 + this.marketEnd.minute;
    
    return timeInMinutes >= marketStart && timeInMinutes <= marketEnd;
  }

  /**
   * Check if date is a market holiday
   * @param {Date} date - Date to check
   * @returns {boolean} True if market holiday
   */
  isMarketHoliday(date) {
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    const year = date.getFullYear();
    
    let holidays = [];
    if (year === 2024) {
      holidays = this.marketHolidays2024;
    } else if (year === 2025) {
      holidays = this.marketHolidays2025;
    }
    // Add more years as needed
    
    return holidays.includes(dateString);
  }

  /**
   * Get market status information
   * @returns {Object} Market status details
   */
  getMarketStatus() {
    const now = new Date();
    const istTime = this.toIST(now);
    
    const isOpen = this.isMarketOpenAt(istTime);
    const isWeekday = this.isWeekday(istTime);
    const isHoliday = this.isMarketHoliday(istTime);
    const isPreMarket = this.isPreMarketHours();
    const isPostMarket = this.isPostMarketHours();
    
    let status = 'closed';
    let message = 'Market is closed';
    
    if (isOpen) {
      status = 'open';
      message = 'Market is open';
    } else if (isPreMarket) {
      status = 'pre-market';
      message = 'Pre-market session';
    } else if (isPostMarket) {
      status = 'post-market';
      message = 'Post-market session';
    } else if (!isWeekday) {
      status = 'weekend';
      message = 'Market closed - Weekend';
    } else if (isHoliday) {
      status = 'holiday';
      message = 'Market closed - Holiday';
    }
    
    return {
      status,
      message,
      isOpen,
      isWeekday,
      isHoliday,
      isPreMarket,
      isPostMarket,
      currentTime: istTime,
      nextOpen: this.getNextMarketOpen(),
      nextClose: isOpen ? this.getNextMarketClose() : null
    };
  }

  /**
   * Get optimal sync times for different investment types
   * @returns {Object} Recommended sync schedules
   */
  getOptimalSyncTimes() {
    return {
      mutualFunds: {
        schedule: '0 18 * * *', // 6:00 PM IST daily (after market close)
        description: 'Daily NAV sync after market close',
        timezone: 'Asia/Kolkata'
      },
      epf: {
        schedule: '0 2 1 * *', // 2:00 AM IST on 1st of every month
        description: 'Monthly EPF balance sync',
        timezone: 'Asia/Kolkata'
      },
      stocks: {
        schedule: '0 * * * *', // Every hour
        description: 'Hourly stock price sync during market hours',
        timezone: 'Asia/Kolkata',
        condition: () => this.isMarketOpen()
      },
      stocksEndOfDay: {
        schedule: '0 16 * * 1-5', // 4:00 PM IST on weekdays
        description: 'End-of-day stock price sync',
        timezone: 'Asia/Kolkata',
        condition: () => this.isWeekday(this.toIST(new Date())) && !this.isMarketHoliday(this.toIST(new Date()))
      }
    };
  }
}

module.exports = MarketHoursUtil;