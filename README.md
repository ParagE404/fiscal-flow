# FiscalFlow - Personal Finance Dashboard

A comprehensive personal finance management platform built with React and Node.js, featuring automated investment tracking, portfolio analytics, and secure data synchronization.

## 🚀 Features

### 📊 Investment Portfolio Management
- **Mutual Funds**: Track lump sum investments and SIPs with real-time NAV updates
- **Fixed Deposits**: Monitor FD portfolios with maturity tracking and interest calculations
- **EPF Accounts**: Manage Employee Provident Fund accounts with contribution tracking
- **Stocks**: Track equity investments with live price updates and P&L analysis
- **SIP Management**: Comprehensive SIP tracking with current value calculations

### 🔄 Auto-Sync Integration
- **Automated Data Sync**: Real-time synchronization with AMFI, EPFO, and stock exchanges
- **Multiple Data Sources**: Support for AMFI, Yahoo Finance, NSE, and other financial APIs
- **Configurable Sync**: Customizable sync frequencies (hourly, daily, weekly, monthly)
- **Credential Management**: Secure encrypted storage of API keys and login credentials
- **Sync Analytics**: Detailed sync performance metrics and error tracking

### 🛡️ Security & Authentication
- **JWT Authentication**: Secure token-based authentication with automatic refresh
- **Email Verification**: Email verification system for account security
- **Protected Routes**: Role-based access control with email verification requirements
- **Session Management**: Automatic session timeout with activity monitoring
- **Password Security**: Strong password requirements with bcrypt hashing

### 📱 Modern User Interface
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Dark/Light Mode**: Theme switching with system preference detection
- **Interactive Charts**: Beautiful data visualizations using Recharts
- **Loading States**: Engaging loading animations and skeleton screens
- **Error Handling**: Comprehensive error states with user-friendly messages

### 🔧 Advanced Features
- **Data Export**: Complete portfolio data export in JSON format
- **Account Management**: Profile management with avatar upload
- **Audit Logging**: Comprehensive activity tracking and security monitoring
- **Rate Limiting**: API rate limiting for security and performance
- **Background Jobs**: Automated sync jobs with Redis queue management

## 🏗️ Architecture

### Backend Stack
- **Node.js** with Express.js framework
- **PostgreSQL** database with Prisma ORM
- **Redis** for job queuing and caching
- **JWT** for authentication
- **Docker** containerization support

### Frontend Stack
- **React 19** with modern hooks and concurrent features
- **Vite** for fast development and building
- **MobX** for state management
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **React Router** for navigation

### Infrastructure
- **Docker Compose** for local development
- **Prometheus & Grafana** for monitoring
- **Loki** for log aggregation
- **Background Workers** for sync operations

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Redis (optional, for background jobs)
- Docker & Docker Compose (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/fiscalflow.git
   cd fiscalflow
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Copy environment variables
   cp .env.example .env
   # Edit .env with your database and API credentials
   
   # Setup database
   npm run db:migrate
   npm run db:generate
   npm run db:seed
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

4. **Start Development Servers**
   ```bash
   # Backend (Terminal 1)
   cd backend && npm run dev
   
   # Frontend (Terminal 2)
   cd frontend && npm run dev
   ```

### Docker Setup (Alternative)

```bash
# Start all services with Docker Compose
docker-compose -f docker-compose.sync.yml up -d

# View logs
docker-compose logs -f
```

## 📖 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify-email/:token` - Email verification

### Investment Management
- `GET /api/mutual-funds` - Get all mutual funds
- `POST /api/mutual-funds` - Add new mutual fund
- `PUT /api/mutual-funds/:id` - Update mutual fund
- `DELETE /api/mutual-funds/:id` - Delete mutual fund

### Auto-Sync API
- `POST /api/sync/{type}` - Trigger manual sync
- `GET /api/sync/{type}/status` - Get sync status
- `PUT /api/sync/config/{type}` - Update sync configuration
- `GET /api/sync/stats` - Get sync analytics

For complete API documentation, see [SYNC_API_DOCUMENTATION.md](SYNC_API_DOCUMENTATION.md)

## 🔧 Configuration

### Environment Variables

**Backend (.env)**
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/fiscalflow"

# Authentication
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="7d"

# Sync APIs
YAHOO_FINANCE_API_KEY="your-yahoo-finance-key"
ALPHA_VANTAGE_API_KEY="your-alpha-vantage-key"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Redis (optional)
REDIS_URL="redis://localhost:6379"
```

### Sync Configuration

Configure automatic sync for different investment types:

```javascript
// Example sync configuration
{
  "mutual_funds": {
    "isEnabled": true,
    "syncFrequency": "daily",
    "preferredSource": "amfi",
    "fallbackSource": "mfcentral"
  },
  "stocks": {
    "isEnabled": true,
    "syncFrequency": "hourly",
    "preferredSource": "yahoo_finance"
  }
}
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
npm run test:watch
```

### Frontend Tests
```bash
cd frontend
npm test
npm run test:coverage
npm run test:integration
```

## 📊 Monitoring

Access monitoring dashboards:
- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Application**: http://localhost:5173

## 🔒 Security Features

### Data Protection
- **Encryption**: All sensitive data encrypted at rest
- **Credential Security**: API keys and passwords securely encrypted
- **Audit Logging**: Complete audit trail of all operations
- **Rate Limiting**: Protection against abuse and attacks

### Authentication Security
- **JWT Tokens**: Secure token-based authentication
- **Session Management**: Automatic session timeout and refresh
- **Email Verification**: Required for sensitive operations
- **Password Policy**: Strong password requirements enforced

## 📚 Documentation

- [Sync API Documentation](SYNC_API_DOCUMENTATION.md)
- [SIP Current Value Implementation](SIP_CURRENT_VALUE_DEMO.md)
- [Protected Routes Implementation](PROTECTED_ROUTES_IMPLEMENTATION.md)
- [User Profile Features](USER_PROFILE_FEATURES.md)
- [Sync Setup Guide](SYNC_API_SETUP_GUIDE.md)
- [Troubleshooting Guide](SYNC_TROUBLESHOOTING_GUIDE.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow ESLint configuration for code style
- Write tests for new features
- Update documentation for API changes
- Use conventional commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Radix UI](https://www.radix-ui.com/) for accessible components
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- [Recharts](https://recharts.org/) for beautiful charts
- [Prisma](https://www.prisma.io/) for database management
- [AMFI](https://www.amfiindia.com/) for mutual fund data

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Email: support@fiscalflow.com
- Documentation: [Project Wiki](https://github.com/yourusername/fiscalflow/wiki)

---

**FiscalFlow** - Take control of your financial future with intelligent portfolio management and automated investment tracking.