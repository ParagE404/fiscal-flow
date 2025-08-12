// Smart defaults and improved placeholder text patterns

export const smartDefaults = {
  // User profile defaults
  user: {
    country: 'India',
    currency: 'INR',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: 'en',
  },
  
  // Financial defaults
  financial: {
    currency: 'INR',
    investmentGoal: 'wealth-building',
    riskTolerance: 'moderate',
    investmentHorizon: '5-10-years',
  },
  
  // Form field defaults based on context
  getFieldDefaults: (fieldType, context = {}) => {
    const defaults = {
      email: {
        placeholder: context.isLogin ? 'Enter your email' : 'Enter your email address (e.g., john@example.com)',
        helperText: context.isLogin ? '' : "We'll use this for account notifications and password recovery",
      },
      password: {
        placeholder: context.isLogin ? 'Enter your password' : 'Create a strong password',
        helperText: context.isLogin ? '' : 'Use a mix of uppercase, lowercase, numbers, and symbols',
      },
      name: {
        placeholder: 'Enter your full name (e.g., John Doe)',
        helperText: 'This will be displayed on your profile',
      },
      phone: {
        placeholder: 'Enter your phone number (e.g., +91 98765 43210)',
        helperText: 'We may use this for account security notifications',
      },
      amount: {
        placeholder: 'Enter amount (e.g., ₹10,000)',
        helperText: 'Amount in Indian Rupees',
      },
      percentage: {
        placeholder: 'Enter percentage (e.g., 8.5%)',
        helperText: 'Annual percentage rate',
      },
      date: {
        placeholder: 'Select date',
        helperText: 'Choose a date from the calendar',
      },
      company: {
        placeholder: 'Enter company name (e.g., Reliance Industries)',
        helperText: 'Full company name or ticker symbol',
      },
      stockSymbol: {
        placeholder: 'Enter stock symbol (e.g., RELIANCE)',
        helperText: 'Stock ticker symbol from NSE/BSE',
      },
      mutualFund: {
        placeholder: 'Enter fund name (e.g., SBI Bluechip Fund)',
        helperText: 'Full mutual fund scheme name',
      },
    }
    
    return defaults[fieldType] || { placeholder: '', helperText: '' }
  }
}

export const placeholderPatterns = {
  // Contextual placeholders that adapt to user input
  adaptive: {
    email: (value = '') => {
      if (value.includes('@')) {
        const domain = value.split('@')[1]
        if (domain && !domain.includes('.')) {
          return `${value}.com`
        }
      }
      return 'Enter your email address'
    },
    
    phone: (value = '') => {
      if (value.startsWith('+91')) {
        return '+91 98765 43210'
      }
      return 'Enter your phone number'
    },
    
    amount: (currency = 'INR') => {
      const symbols = { INR: '₹', USD: '$', EUR: '€' }
      return `Enter amount (e.g., ${symbols[currency] || '₹'}10,000)`
    },
  },
  
  // Industry-specific placeholders
  financial: {
    stockPrice: 'Enter price per share (e.g., ₹2,500.50)',
    quantity: 'Enter number of shares (e.g., 100)',
    sipAmount: 'Enter SIP amount (e.g., ₹5,000)',
    fdAmount: 'Enter deposit amount (e.g., ₹1,00,000)',
    interestRate: 'Enter interest rate (e.g., 7.5%)',
    maturityDate: 'Select maturity date',
    investmentDate: 'Select investment date',
    dividendYield: 'Enter dividend yield (e.g., 2.5%)',
    expenseRatio: 'Enter expense ratio (e.g., 1.2%)',
    nav: 'Enter NAV (e.g., ₹45.67)',
  },
  
  // Progressive disclosure placeholders
  progressive: {
    search: {
      initial: 'Search...',
      focused: 'Type to search stocks, funds, or companies',
      withResults: 'Refine your search',
      noResults: 'Try different keywords',
    },
    
    password: {
      initial: 'Create a password',
      typing: 'Keep typing...',
      weak: 'Make it stronger',
      strong: 'Looking good!',
    },
  }
}

export const helpText = {
  // Contextual help text that provides value
  security: {
    password: 'A strong password protects your financial data. Use at least 8 characters with a mix of letters, numbers, and symbols.',
    twoFactor: 'Two-factor authentication adds an extra layer of security to your account.',
    emailVerification: 'We verify your email to ensure account security and enable password recovery.',
  },
  
  financial: {
    riskTolerance: 'Your risk tolerance helps us suggest suitable investment options. You can change this anytime.',
    investmentGoal: 'Setting clear goals helps track your progress and make better investment decisions.',
    diversification: 'Spreading investments across different assets helps reduce risk.',
    compounding: 'Starting early and investing regularly can significantly boost your returns through compounding.',
  },
  
  privacy: {
    dataUsage: 'We use your data only to provide better financial insights and never share it with third parties.',
    cookies: 'Cookies help us remember your preferences and provide a personalized experience.',
    notifications: 'Choose which notifications you want to receive to stay informed about your investments.',
  },
  
  // Dynamic help based on user actions
  contextual: {
    firstTimeUser: 'New to investing? Our guided tour will help you get started.',
    returningUser: 'Welcome back! Check out your latest portfolio performance.',
    errorRecovery: 'Having trouble? Try refreshing the page or contact our support team.',
  }
}

export const validationMessages = {
  // User-friendly validation messages
  friendly: {
    required: (field) => `Please enter your ${field.toLowerCase()}`,
    email: 'Please enter a valid email address (e.g., john@example.com)',
    password: {
      tooShort: 'Password should be at least 8 characters long',
      noUppercase: 'Add at least one uppercase letter (A-Z)',
      noLowercase: 'Add at least one lowercase letter (a-z)',
      noNumber: 'Include at least one number (0-9)',
      noSymbol: 'Consider adding a symbol (!@#$%^&*) for extra security',
    },
    phone: 'Please enter a valid phone number (e.g., +91 98765 43210)',
    amount: 'Please enter a valid amount (e.g., ₹10,000)',
    percentage: 'Please enter a valid percentage (e.g., 8.5)',
    date: 'Please select a valid date',
    mismatch: (field1, field2) => `${field1} and ${field2} don't match`,
  },
  
  // Progressive validation messages
  progressive: {
    email: {
      typing: 'Keep typing...',
      invalid: 'This doesn\'t look like a valid email',
      valid: 'Email looks good!',
      taken: 'This email is already registered',
    },
    
    password: {
      typing: 'Password strength: ',
      weak: 'Weak - add more characters and variety',
      medium: 'Medium - almost there!',
      strong: 'Strong - great password!',
    },
  }
}

// Utility functions for smart form behavior
export const formUtils = {
  // Auto-format input values
  formatters: {
    phone: (value) => {
      // Format Indian phone numbers
      const cleaned = value.replace(/\D/g, '')
      if (cleaned.startsWith('91')) {
        return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`
      }
      return value
    },
    
    amount: (value) => {
      // Format currency amounts
      const number = parseFloat(value.replace(/[^\d.]/g, ''))
      if (!isNaN(number)) {
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 0,
        }).format(number)
      }
      return value
    },
    
    percentage: (value) => {
      const number = parseFloat(value.replace(/[^\d.]/g, ''))
      if (!isNaN(number)) {
        return `${number}%`
      }
      return value
    },
  },
  
  // Smart field suggestions
  suggestions: {
    email: (value) => {
      const commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com']
      if (value.includes('@') && !value.includes('.')) {
        return commonDomains.map(domain => `${value}.${domain}`)
      }
      return []
    },
    
    company: (value) => {
      // This would typically connect to an API
      const commonCompanies = [
        'Reliance Industries', 'Tata Consultancy Services', 'HDFC Bank',
        'Infosys', 'ICICI Bank', 'State Bank of India'
      ]
      return commonCompanies.filter(company => 
        company.toLowerCase().includes(value.toLowerCase())
      )
    },
  },
  
  // Field dependencies and smart defaults
  dependencies: {
    // When investment type changes, update related fields
    investmentType: {
      'mutual-fund': {
        amountLabel: 'SIP Amount',
        amountPlaceholder: 'Enter monthly SIP amount (e.g., ₹5,000)',
        frequencyDefault: 'monthly',
      },
      'stock': {
        amountLabel: 'Investment Amount',
        amountPlaceholder: 'Enter total investment (e.g., ₹50,000)',
        frequencyDefault: 'one-time',
      },
      'fixed-deposit': {
        amountLabel: 'Deposit Amount',
        amountPlaceholder: 'Enter FD amount (e.g., ₹1,00,000)',
        frequencyDefault: 'one-time',
      },
    },
  },
}