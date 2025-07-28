# Design Document

## Overview

FiscalFlow is a full-stack personal finance dashboard built with React + Vite frontend and Node.js + Express backend. The application follows a modern, component-based architecture with MobX for state management, Shadcn/ui for components, and PostgreSQL with Prisma ORM for data persistence. The design emphasizes clean UI, responsive layout, and seamless user experience for tracking investments across multiple asset classes.

## Architecture

### System Architecture

```mermaid
graph TB
    subgraph "Frontend (React + Vite)"
        A[React Components] --> B[MobX Stores]
        B --> C[API Client]
        A --> D[Shadcn/ui Components]
        A --> E[Recharts Visualizations]
    end
    
    subgraph "Backend (Node.js + Express)"
        F[Express Routes] --> G[Controllers]
        G --> H[Prisma Client]
        H --> I[PostgreSQL Database]
        F --> J[Middleware]
        J --> K[Zod Validation]
    end
    
    C --> F
    
    subgraph "External"
        L[CSV Export]
        M[Future: Live Price APIs]
    end
    
    G --> L
    G -.-> M
```

### Technology Stack

**Frontend:**
- Framework: React (JavaScript) + Vite
- UI Library: Shadcn/ui + Tailwind CSS
- State Management: MobX
- Charts: Recharts
- Icons: Lucide React
- HTTP Client: Axios/Fetch

**Backend:**
- Server: Node.js + Express.js
- Database: PostgreSQL
- ORM: Prisma
- Validation: Zod
- CORS: Enabled for frontend communication

## Components and Interfaces

### Frontend Component Structure

```
src/
├── components/
│   ├── ui/                    # Shadcn components
│   │   ├── card.jsx
│   │   ├── button.jsx
│   │   ├── input.jsx
│   │   ├── dialog.jsx
│   │   └── ...
│   ├── common/               # Reusable components
│   │   ├── Layout.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Header.jsx
│   │   ├── SummaryCard.jsx
│   │   └── LoadingSpinner.jsx
│   ├── dashboard/            # Dashboard components
│   │   ├── DashboardPage.jsx
│   │   ├── PortfolioSummary.jsx
│   │   ├── AssetAllocation.jsx
│   │   └── TopPerformers.jsx
│   ├── mutual-funds/         # Mutual funds components
│   │   ├── MutualFundsPage.jsx
│   │   ├── FundsList.jsx
│   │   ├── SIPsList.jsx
│   │   ├── AddFundModal.jsx
│   │   └── AddSIPModal.jsx
│   ├── fixed-deposits/       # Fixed deposits components
│   │   ├── FixedDepositsPage.jsx
│   │   ├── FDCard.jsx
│   │   ├── FDList.jsx
│   │   └── AddFDModal.jsx
│   ├── epf/                  # EPF components
│   │   ├── EPFPage.jsx
│   │   ├── EPFAccountCard.jsx
│   │   ├── EPFList.jsx
│   │   └── AddEPFModal.jsx
│   ├── stocks/               # Stocks components
│   │   ├── StocksPage.jsx
│   │   ├── StocksList.jsx
│   │   └── AddStockModal.jsx
│   └── settings/             # Settings components
│       ├── SettingsPage.jsx
│       ├── ExportSection.jsx
│       └── PreferencesSection.jsx
```

### Backend API Structure

```
src/
├── routes/
│   ├── dashboard.js          # Portfolio overview endpoints
│   ├── mutualFunds.js        # Mutual funds CRUD
│   ├── fixedDeposits.js      # Fixed deposits CRUD
│   ├── epf.js                # EPF accounts CRUD
│   ├── stocks.js             # Stocks CRUD
│   ├── sips.js               # SIPs CRUD
│   └── export.js             # Data export endpoints
├── controllers/
│   ├── dashboardController.js
│   ├── mutualFundsController.js
│   ├── fixedDepositsController.js
│   ├── epfController.js
│   ├── stocksController.js
│   ├── sipsController.js
│   └── exportController.js
├── middleware/
│   ├── validation.js         # Zod validation middleware
│   ├── errorHandler.js       # Global error handling
│   └── cors.js               # CORS configuration
└── utils/
    ├── calculations.js       # Financial calculations
    ├── formatting.js         # Indian currency/number formatting
    └── csvExport.js          # CSV generation utilities
```

## Data Models

### Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String @id @default(cuid())
  email       String @unique
  name        String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  mutualFunds   MutualFund[]
  fixedDeposits FixedDeposit[]
  epfAccounts   EPFAccount[]
  stocks        Stock[]
  sips          SIP[]
  
  @@map("users")
}

model MutualFund {
  id             String   @id @default(cuid())
  userId         String
  name           String
  category       String   // Large Cap, Mid Cap, etc.
  riskLevel      String   // Low, Moderate, High
  rating         Int      // 1-5 stars
  investedAmount Float
  currentValue   Float    @default(0)
  cagr           Float    @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("mutual_funds")
}

model FixedDeposit {
  id             String   @id @default(cuid())
  userId         String
  bankName       String
  interestRate   Float
  type           String   // Simple, Cumulative
  investedAmount Float
  currentValue   Float
  maturityAmount Float
  startDate      DateTime
  maturityDate   DateTime
  tenure         Int      // in months
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("fixed_deposits")
}

model EPFAccount {
  id                   String    @id @default(cuid())
  userId               String
  employerName         String
  pfNumber             String
  status               String    // Active, Transferred
  totalBalance         Float
  employeeContribution Float
  employerContribution Float
  pensionFund          Float
  monthlyContribution  Float
  startDate            DateTime
  endDate              DateTime?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("epf_accounts")
}

model Stock {
  id             String   @id @default(cuid())
  userId         String
  symbol         String
  companyName    String
  sector         String
  marketCap      String   // Large Cap, Mid Cap, Small Cap
  quantity       Int
  buyPrice       Float
  currentPrice   Float    @default(0)
  investedAmount Float
  currentValue   Float    @default(0)
  pnl            Float    @default(0)
  pnlPercentage  Float    @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("stocks")
}

model SIP {
  id                    String   @id @default(cuid())
  userId                String
  fundName              String
  amount                Float
  frequency             String   // Monthly, Quarterly
  nextDueDate           DateTime
  totalInstallments     Int
  completedInstallments Int      @default(0)
  status                String   // Active, Paused, Completed
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("sips")
}
```

### API Response Models

```javascript
// Dashboard Overview Response
{
  portfolioSummary: {
    totalValue: number,
    totalInvested: number,
    totalReturns: number,
    monthlyGrowth: number
  },
  assetAllocation: {
    mutualFunds: { value: number, percentage: number },
    stocks: { value: number, percentage: number },
    fixedDeposits: { value: number, percentage: number },
    epf: { value: number, percentage: number }
  },
  topPerformers: [
    {
      name: string,
      type: string,
      returns: number,
      returnsPercentage: number
    }
  ]
}

// Mutual Fund Response
{
  id: string,
  name: string,
  category: string,
  riskLevel: string,
  rating: number,
  investedAmount: number,
  currentValue: number,
  cagr: number,
  createdAt: string,
  updatedAt: string
}
```

## User Interface Design

### Design System

**Color Scheme (Shadcn/ui):**
- Primary: Blue variants (blue-500, blue-600, etc.)
- Success/Gains: Green variants (green-500, green-600, etc.)
- Destructive/Losses: Red variants (red-500, red-600, etc.)
- Warning: Orange variants (orange-500, orange-600, etc.)
- Background: slate-50 (light), slate-900 (dark)
- Text: slate-900 (light), slate-50 (dark)

**Typography:**
- Headings: font-semibold, text-xl/2xl/3xl
- Body: font-normal, text-sm/base
- Numbers: font-mono for financial values
- Currency: ₹ symbol with proper Indian formatting

**Components:**
- Cards: Shadcn Card with consistent padding and shadows
- Buttons: Shadcn Button with variants (default, outline, ghost)
- Forms: Shadcn Form components with validation
- Tables: Shadcn Table with hover effects and sorting
- Modals: Shadcn Dialog for add/edit operations

### Layout Structure

**Sidebar Navigation:**
- Fixed left sidebar (240px width)
- Navigation items with icons and labels
- Active state highlighting
- Responsive collapse on mobile

**Main Content Area:**
- Header with page title and live data indicators
- Content padding: px-6 py-4
- Responsive grid layouts for cards
- Consistent spacing between sections

**Page Layouts:**

1. **Dashboard Layout:**
   - 4-column summary cards grid
   - Asset allocation chart (full width)
   - Top performers list (half width)
   - Financial goals placeholder (half width)

2. **Investment Pages Layout:**
   - 3-4 column summary cards
   - Tab navigation (where applicable)
   - Data table/cards with actions
   - Add/Export buttons in header

3. **Settings Layout:**
   - Two-column layout
   - Export section (left)
   - Preferences section (right)

## State Management (MobX)

### Store Structure

```javascript
// stores/PortfolioStore.js
class PortfolioStore {
  // Observable state
  mutualFunds = []
  fixedDeposits = []
  epfAccounts = []
  stocks = []
  sips = []
  loading = false
  error = null
  
  // Actions
  async fetchMutualFunds()
  async addMutualFund(data)
  async updateMutualFund(id, data)
  async deleteMutualFund(id)
  
  // Computed values
  get totalPortfolioValue()
  get totalInvested()
  get totalReturns()
  get assetAllocation()
  get topPerformers()
}

// stores/UIStore.js
class UIStore {
  sidebarCollapsed = false
  darkMode = false
  currentPage = 'dashboard'
  
  toggleSidebar()
  toggleDarkMode()
  setCurrentPage(page)
}
```

### API Integration Pattern

```javascript
// lib/apiClient.js
class ApiClient {
  constructor() {
    this.baseURL = 'http://localhost:5000/api'
  }
  
  async get(endpoint) {
    const response = await fetch(`${this.baseURL}${endpoint}`)
    if (!response.ok) throw new Error('API Error')
    return response.json()
  }
  
  async post(endpoint, data) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('API Error')
    return response.json()
  }
}
```

## Error Handling

### Frontend Error Handling

```javascript
// Error boundaries for React components
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true }
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />
    }
    return this.props.children
  }
}

// Toast notifications for user feedback
import { toast } from 'sonner'

// Success
toast.success('Investment added successfully')

// Error
toast.error('Failed to save investment')

// Loading
toast.loading('Saving investment...')
```

### Backend Error Handling

```javascript
// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error(err.stack)
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.details
    })
  }
  
  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      error: 'Database Error',
      message: 'Invalid request'
    })
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong'
  })
}
```

## Testing Strategy

### Frontend Testing

```javascript
// Component testing with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react'
import { MutualFundsPage } from '../components/mutual-funds/MutualFundsPage'

test('displays mutual funds summary cards', () => {
  render(<MutualFundsPage />)
  expect(screen.getByText('Total Invested')).toBeInTheDocument()
  expect(screen.getByText('Current Value')).toBeInTheDocument()
  expect(screen.getByText('CAGR Returns')).toBeInTheDocument()
})

// MobX store testing
import { PortfolioStore } from '../stores/PortfolioStore'

test('calculates total portfolio value correctly', () => {
  const store = new PortfolioStore()
  store.mutualFunds = [{ currentValue: 10000 }]
  store.stocks = [{ currentValue: 5000 }]
  
  expect(store.totalPortfolioValue).toBe(15000)
})
```

### Backend Testing

```javascript
// API endpoint testing with Jest and Supertest
import request from 'supertest'
import app from '../src/server'

describe('Mutual Funds API', () => {
  test('GET /api/mutual-funds returns funds list', async () => {
    const response = await request(app)
      .get('/api/mutual-funds')
      .expect(200)
    
    expect(Array.isArray(response.body)).toBe(true)
  })
  
  test('POST /api/mutual-funds creates new fund', async () => {
    const fundData = {
      name: 'Test Fund',
      category: 'Large Cap',
      investedAmount: 10000
    }
    
    const response = await request(app)
      .post('/api/mutual-funds')
      .send(fundData)
      .expect(201)
    
    expect(response.body.name).toBe('Test Fund')
  })
})
```

### Database Testing

```javascript
// Prisma testing with test database
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL
    }
  }
})

beforeEach(async () => {
  await prisma.mutualFund.deleteMany()
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})
```

## Performance Considerations

### Frontend Optimization

1. **Code Splitting:** Use React.lazy() for route-based code splitting
2. **Memoization:** Use React.memo() for expensive components
3. **Virtual Scrolling:** For large data tables
4. **Image Optimization:** Lazy loading for bank logos and icons
5. **Bundle Analysis:** Regular bundle size monitoring

### Backend Optimization

1. **Database Indexing:** Add indexes on frequently queried fields
2. **Query Optimization:** Use Prisma's include/select for efficient queries
3. **Caching:** Redis for frequently accessed data
4. **Pagination:** Implement pagination for large datasets
5. **Connection Pooling:** Configure PostgreSQL connection pooling

### Database Indexes

```sql
-- Add indexes for better query performance
CREATE INDEX idx_mutual_funds_user_id ON mutual_funds(user_id);
CREATE INDEX idx_stocks_user_id ON stocks(user_id);
CREATE INDEX idx_fixed_deposits_user_id ON fixed_deposits(user_id);
CREATE INDEX idx_epf_accounts_user_id ON epf_accounts(user_id);
CREATE INDEX idx_sips_user_id ON sips(user_id);
CREATE INDEX idx_sips_next_due_date ON sips(next_due_date);
```

## Security Considerations

### Data Validation

```javascript
// Zod schemas for request validation
import { z } from 'zod'

const mutualFundSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(['Large Cap', 'Mid Cap', 'Small Cap', 'Hybrid']),
  riskLevel: z.enum(['Low', 'Moderate', 'High']),
  rating: z.number().min(1).max(5),
  investedAmount: z.number().positive(),
  currentValue: z.number().nonnegative(),
  cagr: z.number()
})
```

### Input Sanitization

1. **XSS Prevention:** Sanitize all user inputs
2. **SQL Injection:** Use Prisma's parameterized queries
3. **CORS Configuration:** Restrict origins in production
4. **Rate Limiting:** Implement API rate limiting
5. **Data Encryption:** Encrypt sensitive financial data

## Deployment Architecture

### Development Environment

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: fiscalflow_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: postgresql://dev:dev123@postgres:5432/fiscalflow_dev
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Production Considerations

1. **Environment Variables:** Secure configuration management
2. **SSL/TLS:** HTTPS for all communications
3. **Database Backups:** Automated backup strategy
4. **Monitoring:** Application and database monitoring
5. **Logging:** Structured logging with log aggregation

This design provides a comprehensive foundation for building FiscalFlow as a robust, scalable, and maintainable personal finance dashboard that meets all the specified requirements while following modern development best practices.