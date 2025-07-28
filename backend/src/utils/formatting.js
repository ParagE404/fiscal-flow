// Indian currency and number formatting utilities

/**
 * Format number in Indian currency format (₹1,23,456)
 * @param {number} amount - Amount to format
 * @param {boolean} showSymbol - Whether to show ₹ symbol
 * @returns {string} Formatted currency string
 */
const formatIndianCurrency = (amount, showSymbol = true) => {
  if (amount === null || amount === undefined || isNaN(amount)) return showSymbol ? '₹0' : '0'
  
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
  
  if (showSymbol) {
    return formatter.format(amount)
  } else {
    return formatter.format(amount).replace('₹', '').trim()
  }
}

/**
 * Format number in Indian number system (lakhs/crores)
 * @param {number} amount - Amount to format
 * @param {boolean} showSymbol - Whether to show ₹ symbol
 * @returns {string} Formatted string with lakhs/crores
 */
const formatIndianLargeNumber = (amount, showSymbol = true) => {
  if (amount === null || amount === undefined || isNaN(amount)) return showSymbol ? '₹0' : '0'
  
  const symbol = showSymbol ? '₹' : ''
  
  if (amount >= 10000000) { // 1 crore
    return `${symbol}${(amount / 10000000).toFixed(2)} Cr`
  } else if (amount >= 100000) { // 1 lakh
    return `${symbol}${(amount / 100000).toFixed(2)} L`
  } else if (amount >= 1000) { // 1 thousand
    return `${symbol}${(amount / 1000).toFixed(1)} K`
  } else {
    return formatIndianCurrency(amount, showSymbol)
  }
}

/**
 * Format percentage with proper decimal places
 * @param {number} percentage - Percentage value
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted percentage string
 */
const formatPercentage = (percentage, decimals = 2) => {
  if (percentage === null || percentage === undefined || isNaN(percentage)) return '0.00%'
  return `${percentage.toFixed(decimals)}%`
}

/**
 * Format date in Indian format (DD/MM/YYYY)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
const formatIndianDate = (date) => {
  if (!date) return ''
  
  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) return ''
  
  const day = dateObj.getDate().toString().padStart(2, '0')
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
  const year = dateObj.getFullYear()
  
  return `${day}/${month}/${year}`
}

/**
 * Format date for display with month name
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string (e.g., "15 Jan 2024")
 */
const formatDisplayDate = (date) => {
  if (!date) return ''
  
  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) return ''
  
  const options = { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  }
  
  return dateObj.toLocaleDateString('en-IN', options)
}

/**
 * Format duration in human readable format
 * @param {number} days - Number of days
 * @returns {string} Human readable duration
 */
const formatDuration = (days) => {
  if (days <= 0) return 'Expired'
  
  if (days === 1) return '1 day'
  if (days < 30) return `${days} days`
  if (days < 365) {
    const months = Math.floor(days / 30)
    const remainingDays = days % 30
    if (remainingDays === 0) {
      return months === 1 ? '1 month' : `${months} months`
    } else {
      return `${months}m ${remainingDays}d`
    }
  } else {
    const years = Math.floor(days / 365)
    const remainingDays = days % 365
    const months = Math.floor(remainingDays / 30)
    
    let result = years === 1 ? '1 year' : `${years} years`
    if (months > 0) {
      result += months === 1 ? ' 1 month' : ` ${months} months`
    }
    return result
  }
}

/**
 * Format number with Indian comma separation
 * @param {number} number - Number to format
 * @returns {string} Formatted number string
 */
const formatIndianNumber = (number) => {
  if (number === null || number === undefined || isNaN(number)) return '0'
  
  return new Intl.NumberFormat('en-IN').format(number)
}

/**
 * Format P&L with color indication
 * @param {number} pnl - P&L amount
 * @param {boolean} showSymbol - Whether to show ₹ symbol
 * @returns {Object} Formatted P&L with color info
 */
const formatPnL = (pnl, showSymbol = true) => {
  const formatted = formatIndianCurrency(Math.abs(pnl), showSymbol)
  const sign = pnl >= 0 ? '+' : '-'
  const color = pnl >= 0 ? 'green' : 'red'
  
  return {
    value: `${sign}${formatted}`,
    color,
    isProfit: pnl >= 0
  }
}

/**
 * Format rating as stars
 * @param {number} rating - Rating value (1-5)
 * @returns {string} Star representation
 */
const formatRating = (rating) => {
  if (!rating || rating < 1 || rating > 5) return '☆☆☆☆☆'
  
  const fullStars = '★'.repeat(Math.floor(rating))
  const emptyStars = '☆'.repeat(5 - Math.floor(rating))
  
  return fullStars + emptyStars
}

/**
 * Sanitize string for CSV export
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeForCSV = (str) => {
  if (!str) return ''
  
  // Convert to string and escape quotes
  const sanitized = String(str).replace(/"/g, '""')
  
  // Wrap in quotes if contains comma, newline, or quote
  if (sanitized.includes(',') || sanitized.includes('\n') || sanitized.includes('"')) {
    return `"${sanitized}"`
  }
  
  return sanitized
}

module.exports = {
  formatIndianCurrency,
  formatIndianLargeNumber,
  formatPercentage,
  formatIndianDate,
  formatDisplayDate,
  formatDuration,
  formatIndianNumber,
  formatPnL,
  formatRating,
  sanitizeForCSV
}