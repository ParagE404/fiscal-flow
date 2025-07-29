# Implementation Plan

- [x] 1. Backend Foundation Setup

  - Initialize Node.js project with Express server and basic middleware configuration
  - Set up PostgreSQL database connection and Prisma ORM with schema migration
  - Create basic project structure with routes, controllers, and middleware directories
  - _Requirements: All backend functionality foundation_

- [x] 1.1 Database Schema Implementation

  - Implement complete Prisma schema with all models (User, MutualFund, FixedDeposit, EPFAccount, Stock, SIP)
  - Run database migrations and seed with sample data for testing
  - Create database indexes for performance optimization
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [x] 1.2 Express Server and Middleware Setup

  - Configure Express server with CORS, JSON parsing, and error handling middleware
  - Implement Zod validation middleware for request/response validation
  - Set up global error handler with proper HTTP status codes and error formatting
  - _Requirements: 8.1, 8.2, 8.6_

- [x] 2. Core API Endpoints Implementation

  - Implement CRUD operations for all investment types with proper validation
  - Create dashboard aggregation endpoint for portfolio overview calculations
  - Add comprehensive error handling and input validation for all endpoints
  - _Requirements: 1.2, 2.2, 3.2, 4.2, 5.2_

- [x] 2.1 Mutual Funds API Implementation

  - Create GET /api/mutual-funds endpoint with summary calculations (total invested, current value, CAGR)
  - Implement POST, PUT, DELETE endpoints for mutual fund CRUD operations with validation
  - Add fund category and risk level validation using Zod schemas
  - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 2.2 SIPs API Implementation

  - Create GET /api/sips endpoint for active SIP tracking with next due date calculations
  - Implement POST, PUT, DELETE endpoints for SIP management with frequency validation
  - Add SIP status tracking (Active, Paused, Completed) with proper state transitions
  - _Requirements: 2.8, 2.9_

- [x] 2.3 Fixed Deposits API Implementation

  - Create GET /api/fixed-deposits endpoint with interest calculations and maturity progress
  - Implement POST, PUT, DELETE endpoints with date validation and tenure calculations
  - Add current value calculation based on simple/cumulative interest types
  - _Requirements: 3.1, 3.4, 3.6, 3.7, 3.8_

- [x] 2.4 EPF Accounts API Implementation

  - Create GET /api/epf endpoint with employer-wise breakdown and contribution aggregation
  - Implement POST, PUT, DELETE endpoints for EPF account management with PF number validation
  - Add account status handling (Active/Transferred) and contribution calculations
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7, 4.8_

- [x] 2.5 Stocks API Implementation

  - Create GET /api/stocks endpoint with P&L calculations and sector categorization
  - Implement POST, PUT, DELETE endpoints with stock symbol validation and market cap categorization
  - Add P&L calculation logic for both absolute amounts and percentages with color coding data
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7, 5.8, 5.9_

- [x] 2.6 Dashboard API Implementation

  - Create GET /api/dashboard endpoint with portfolio summary calculations (total value, invested, returns, monthly growth)
  - Implement asset allocation calculation with percentage distribution across all investment types
  - Add top performers calculation with gains/losses ranking and performance metrics
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 3. Data Export API Implementation

  - Create GET /api/export/all endpoint for complete portfolio CSV export with all investment data
  - Implement category-wise export endpoints (/api/export/mutual-funds, /api/export/fixed-deposits, etc.)
  - Add proper CSV formatting with headers and Indian currency formatting
  - _Requirements: 2.10, 3.9, 4.9, 5.10, 6.2, 6.3, 6.9_

- [x] 4. Frontend Foundation Setup

  - Initialize React + Vite project with Shadcn/ui components and Tailwind CSS configuration
  - Set up MobX stores for state management with portfolio data and UI state
  - Create basic project structure with components, stores, and utility directories
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 4.1 Shadcn/ui Components Setup

  - Install and configure Shadcn/ui with required components (Card, Button, Input, Dialog, Table, Badge, Progress)
  - Set up Tailwind CSS with Indian market color scheme (blue primary, green gains, red losses)
  - Make it more Inviting, Tactile and Engaging Also refer to other platforms like Groww and zerodha. And also refer to New UI style Apple make
  - Create base component library with consistent styling and typography
  - _Requirements: 1.6, 5.4, 7.6_

- [x] 4.2 Layout and Navigation Implementation

  - Create fixed left sidebar navigation with icons and labels for all sections
  - Implement responsive layout with proper margins, padding, and mobile responsiveness
  - Add active navigation state highlighting and page routing
  - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6, 7.7_

- [x] 4.3 MobX Store Implementation

  - Create PortfolioStore with observable state for all investment types and loading/error states
  - Implement computed values for portfolio totals, asset allocation, and top performers
  - Add API integration actions for CRUD operations with proper error handling
  - _Requirements: All data management requirements_

- [x] 5. Dashboard Page Implementation

  - Create dashboard page with welcome message and user greeting display
  - Implement four summary cards (Total Portfolio Value, Total Invested, Monthly Growth, Total Returns) with Indian currency formatting
  - Add asset allocation horizontal bar chart using Recharts with percentage distribution
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.8_

- [x] 5.1 Portfolio Summary Cards

  - Create SummaryCard component with consistent styling and Indian rupee formatting
  - Implement portfolio calculations integration with MobX store computed values
  - Add loading states and error handling for summary data display
  - _Requirements: 1.2, 1.3_

- [x] 5.2 Asset Allocation Chart

  - Implement horizontal bar chart using Recharts showing percentage distribution across investment types
  - Add color coding for different asset classes with proper legends
  - Create responsive chart layout that works on different screen sizes
  - _Requirements: 1.4_

- [x] 5.3 Top Performers Section

  - Create top performers list component showing best performing investments with gains/losses
  - Implement color coding (green for gains, red for losses) and percentage calculations
  - Add sorting logic to rank investments by performance metrics
  - _Requirements: 1.5, 1.6_

- [x] 6. Mutual Funds Module Implementation

  - Create mutual funds page with three summary cards (Total Invested, Current Value, CAGR Returns)
  - Implement two-tab layout ("My Mutual Funds" and "Active SIPs") with proper tab switching
  - Add funds list table with star ratings, risk levels, categories, and CAGR display
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 6.1 Mutual Funds List and Forms

  - Create funds list table with sortable columns and hover effects
  - Implement Add Fund modal form with validation for all required fields (name, category, risk level, rating, amounts)
  - Add edit and delete functionality with confirmation dialogs
  - _Requirements: 2.3, 2.6, 2.7, 8.7_

- [x] 6.2 SIPs Management Interface

  - Create Active SIPs tab with SIP list showing name, amount, frequency, next due date, and installments
  - Implement Add SIP modal form with frequency validation and due date calculations
  - Add SIP status management (Active, Paused, Completed) with proper state transitions
  - _Requirements: 2.8, 2.9_

- [x] 6.3 Export Functionality

  - Add export button that generates CSV file with all mutual fund data
  - Implement proper CSV formatting with headers and Indian currency formatting
  - Create download functionality that works across different browsers
  - _Requirements: 2.10_

- [x] 7. Fixed Deposits Module Implementation

  - Create fixed deposits page with four summary cards (Total Invested, Current Value, Avg Interest Rate, Interest Earned)
  - Implement card-based FD display (not table format) with bank names and logos
  - Add maturity progress bars showing days remaining with visual progress indicators
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 7.1 FD Cards and Progress Tracking

  - Create FD card component with bank icons, invested amount, current value, and maturity information
  - Implement progress bar component showing time remaining until maturity with days calculation
  - Add FD type support (Simple/Cumulative) with appropriate interest calculations display
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 7.2 FD Management Forms

  - Create Add FD modal form with bank selection, amount, interest rate, start date, and maturity date validation
  - Implement current value calculation based on interest type and elapsed time
  - Add edit and delete functionality with proper validation and confirmation dialogs
  - _Requirements: 3.7, 3.8, 8.4, 8.7_

- [x] 8. EPF Module Implementation

  - Create EPF page with four summary cards (Total EPF Balance, Employee Contribution, Employer Contribution, Interest Earned)
  - Implement employer-wise breakdown display with company names, PF numbers, and account status
  - Add contribution details showing employee share, employer share, and pension fund amounts separately
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [x] 8.1 EPF Account Management

  - Create EPF account cards showing employer details, PF numbers, and contribution breakdowns
  - Implement account status indicators (Active/Transferred) with appropriate visual styling
  - Add monthly contribution rate display as percentage with proper calculations
  - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [x] 8.2 EPF Forms and Data Entry

  - Create Add Employer modal form with employer name, PF number, and contribution details validation
  - Implement start date and end date handling for transferred accounts
  - Add aggregation logic for total calculations across all EPF accounts
  - _Requirements: 4.6, 4.7, 4.8_

- [x] 9. Stocks Module Implementation

  - Create stocks page with four summary cards (Total Investment, Current Value, Total P&L, SIP Investment)
  - Implement stocks list table with company name, symbol, sector, market cap, quantity, prices, and P&L
  - Add color-coded P&L display (green for gains, red for losses) with both absolute and percentage values
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 9.1 Stock Holdings and P&L Calculations

  - Create stocks table with sortable columns and market cap categorization (Large Cap, Mid Cap, Small Cap)
  - Implement P&L calculation logic: (Current Price - Buy Price) × Quantity for absolute P&L
  - Add P&L percentage calculation: ((Current Value - Invested Amount) / Invested Amount) × 100
  - _Requirements: 5.2, 5.3, 5.4, 5.8, 5.9_

- [x] 9.2 Stock Management and Live Price Indicators

  - Create Add Stock modal form with symbol, company name, sector, market cap, quantity, and buy price validation
  - Implement "Live prices" indicator placeholder for future live data integration
  - Add sector categorization support (Energy, IT Services, Banking, etc.) with proper validation
  - _Requirements: 5.5, 5.6, 5.7_

- [-] 10. User Authentication and Onboarding System

  - Implement complete user authentication system with registration, login, and session management
  - Create user onboarding flow with welcome screens, profile setup, and portfolio initialization
  - Add user management features including profile editing, password reset, and account settings
  - _Requirements: User management, data security, personalized experience_

- [x] 10.1 Backend Authentication System

  - Implement JWT-based authentication with user registration and login endpoints
  - Create user model with secure password hashing using bcrypt
  - Add authentication middleware to protect all API endpoints with proper user context
  - _Requirements: Secure user authentication, data isolation, session management_

- [x] 10.2 User Registration and Login API

  - Create POST /api/auth/register endpoint with email validation and password strength requirements
  - Implement POST /api/auth/login endpoint with JWT token generation and user session creation
  - Add POST /api/auth/logout endpoint for secure session termination and token invalidation
  - _Requirements: User account creation, secure login, session management_

- [x] 10.3 Email Verification System

  - Create POST /api/auth/send-verification endpoint for sending email verification tokens
  - Implement GET /api/auth/verify-email/:token endpoint for email confirmation
  - Add email verification status tracking and prevent unverified users from accessing portfolio data
  - _Requirements: Email verification, account security, spam prevention_

- [x] 10.4 User Profile Management API

  - Create GET /api/user/profile endpoint for retrieving user information and preferences
  - Implement PUT /api/user/profile endpoint for updating user details and app preferences
  - Add POST /api/auth/reset-password endpoint for secure password reset functionality
  - _Requirements: User profile management, password security, account maintenance_

- [x] 10.5 Security and Account Protection

  - Implement rate limiting for authentication endpoints to prevent brute force attacks
  - Add account lockout mechanism after multiple failed login attempts
  - Create audit log for user authentication events and suspicious activities
  - _Requirements: Account security, attack prevention, compliance_

- [x] 10.6 Frontend Authentication UI

  - Create login page with email/password form validation and error handling
  - Implement registration page with user details form and terms acceptance
  - Add password reset flow with email input and confirmation screens
  - _Requirements: User-friendly authentication, form validation, error handling_

- [x] 10.7 Email Verification Frontend

  - Create email verification page with resend verification email functionality
  - Implement verification success/failure screens with appropriate messaging
  - Add email verification status indicators and prompts throughout the application
  - _Requirements: Email verification UX, user guidance, verification status_

- [x] 10.8 User Profile and Account Management

  - Create user profile page with avatar upload and personal information editing
  - Implement account settings page with password change and security preferences
  - Add account deletion functionality with data export option and confirmation flow
  - _Requirements: User profile management, account control, data portability_

- [x] 10.9 User Onboarding Flow

  - Create welcome screen with app introduction and feature highlights
  - Implement step-by-step profile setup wizard (personal info, preferences, initial portfolio setup)
  - Add interactive guided tour with tooltips for key features and skip option for experienced users
  - _Requirements: User onboarding experience, feature discovery, initial setup_

- [ ] 10.10 Protected Routes and Session Management

  - Implement React Router protected routes with authentication checks and email verification requirements
  - Create session management with automatic token refresh and logout on expiry
  - Add user context provider for accessing user data across components with loading states
  - _Requirements: Route protection, session persistence, user state management_

- [x] 10.11 Data Migration and User Context

  - Create data migration script to convert existing default user data to proper user accounts
  - Update all API endpoints to use authenticated user context instead of default user
  - Implement comprehensive data isolation ensuring users can only access their own financial data
  - _Requirements: Data security, user privacy, multi-user support, backward compatibility_

- [ ] 11. User Preferences and Settings Integration

  - Migrate existing app settings to user-specific preferences stored in user profiles
  - Implement user preference synchronization across devices and sessions
  - Add preference reset functionality and default settings management
  - _Requirements: User-specific settings, preference persistence, settings management_

- [ ] 12. Settings Page Implementation

  - Create settings page with two-column layout (Export section and App preferences section)
  - Implement complete portfolio export functionality with comprehensive CSV generation
  - Add category-wise export buttons for individual investment types
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 12.1 Export Data Functionality

  - Create export section with "Export Complete Portfolio" button generating comprehensive CSV
  - Implement separate export buttons for Mutual Funds, Fixed Deposits, EPF, and Stocks data
  - Add proper CSV formatting with all relevant fields and headers in Indian currency format
  - _Requirements: 6.2, 6.3, 6.9_

- [ ] 12.2 App Preferences Configuration

  - Create preferences section with currency format setting showing "Indian Rupees (₹)" option
  - Implement number format setting with "Indian (₹1,23,456)" format selection
  - Add dark mode toggle functionality with theme switching capability
  - _Requirements: 6.4, 6.5, 6.6_

- [ ] 12.3 Additional Settings Features

  - Implement auto-refresh prices toggle (placeholder for future live price integration)
  - Add push notifications toggle for important updates and reminders
  - Create settings persistence using user preferences API instead of local storage
  - _Requirements: 6.7, 6.8_

- [ ] 13. Form Validation and Error Handling

  - Implement comprehensive form validation using Shadcn Form components with Zod schemas
  - Add proper error message display for validation failures with clear user guidance
  - Create loading states and success/error toast notifications for all user actions
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [ ] 13.1 Input Validation Implementation

  - Add financial amount validation ensuring positive numbers for investments
  - Implement date validation with proper format checking and logical date range validation
  - Create percentage validation for rates and returns within reasonable ranges
  - _Requirements: 8.3, 8.4, 8.5_

- [ ] 13.2 User Feedback and Loading States

  - Implement toast notifications for success/error feedback on all CRUD operations
  - Add loading spinners and skeleton states during API calls and data fetching
  - Create confirmation dialogs for delete operations with proper user warnings
  - _Requirements: 8.6, 8.7, 8.8_

- [ ] 14. Indian Market Localization

  - Implement Indian currency formatting (₹1,23,456) throughout the application
  - Add Indian number format support with lakhs/crores system for large amounts
  - Create date formatting using DD/MM/YYYY format for all date displays
  - _Requirements: 1.3, 3.5, 4.7, 5.9_

- [ ] 14.1 Currency and Number Formatting

  - Create utility functions for Indian rupee formatting with proper comma placement
  - Implement lakhs/crores conversion for large financial amounts display
  - Add consistent currency symbol (₹) usage across all financial value displays
  - _Requirements: 1.3_

- [ ] 14.2 EPF and Stock Market Context

  - Add EPF-specific field handling for PF numbers and employer details validation
  - Implement stock market context with NSE/BSE references and Indian sector classifications
  - Create market cap categorization specific to Indian stock market standards
  - _Requirements: 4.2, 4.3, 5.2, 5.6_

- [ ] 15. Integration Testing and API Connection

  - Connect frontend MobX stores to backend API endpoints with proper error handling
  - Test all CRUD operations end-to-end from frontend forms to database persistence
  - Implement optimistic updates for better user experience during API calls
  - _Requirements: All integration requirements_

- [ ] 15.1 API Integration Testing

  - Test all API endpoints with frontend forms ensuring proper data flow
  - Implement error handling for network failures and API errors with user-friendly messages
  - Add retry logic for failed API calls and proper loading state management
  - _Requirements: 8.6_

- [ ] 15.2 Data Synchronization

  - Ensure real-time data sync between frontend state and backend database
  - Implement proper cache invalidation when data is updated through forms
  - Add data refresh mechanisms to keep portfolio information current
  - _Requirements: All data consistency requirements_

- [ ] 16. Responsive Design and Mobile Optimization

  - Implement responsive design for all pages ensuring mobile compatibility
  - Add proper breakpoints for tablet and mobile screen sizes
  - Create collapsible sidebar navigation for mobile devices
  - _Requirements: 7.6_

- [ ] 16.1 Mobile Layout Optimization

  - Optimize card layouts for mobile screens with proper stacking and spacing
  - Implement touch-friendly buttons and form inputs for mobile interaction
  - Add responsive table layouts that work well on smaller screens
  - _Requirements: 7.6, 7.7_

- [ ] 17. Performance Optimization and Final Polish

  - Implement code splitting for better initial load performance
  - Add memoization for expensive calculations and component re-renders
  - Optimize bundle size and implement lazy loading for non-critical components
  - _Requirements: Performance and user experience requirements_

- [ ] 17.1 Final Testing and Bug Fixes
  - Conduct comprehensive testing of all features across different browsers
  - Fix any remaining bugs and edge cases in form validation and data display
  - Perform final UI/UX polish to match wireframe specifications exactly
  - _Requirements: All requirements validation_
