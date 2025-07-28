# Requirements Document

## Introduction

FiscalFlow is a self-hosted personal finance dashboard designed for tracking investments across multiple asset classes including Mutual Funds, Fixed Deposits, EPF (Employee Provident Fund), and Stocks. This MVP (Phase 1) focuses on manual data entry with a clean, modern UI inspired by INDmoney and Monarch. The application provides comprehensive portfolio tracking, performance analytics, and data export capabilities tailored for the Indian financial market.

## Requirements

### Requirement 1: Dashboard Overview

**User Story:** As a user, I want to view a comprehensive dashboard of my financial portfolio, so that I can quickly understand my overall investment performance and asset allocation.

#### Acceptance Criteria

1. WHEN the user accesses the dashboard THEN the system SHALL display a welcome message with user greeting
2. WHEN the dashboard loads THEN the system SHALL show four summary cards: Total Portfolio Value, Total Invested, Monthly Growth, and Total Returns
3. WHEN displaying financial values THEN the system SHALL format currency in Indian Rupees (₹) with proper Indian number formatting (₹1,23,456)
4. WHEN the dashboard loads THEN the system SHALL display an asset allocation horizontal bar chart showing percentage distribution across Mutual Funds, Stocks, Fixed Deposits, and EPF
5. WHEN the dashboard loads THEN the system SHALL show a "Top Performers" section listing best performing investments with gains/losses
6. WHEN displaying performance metrics THEN the system SHALL use color coding: green for gains, red for losses
7. WHEN the dashboard loads THEN the system SHALL display a "Financial Goals" section placeholder
8. WHEN the user views the dashboard THEN the system SHALL show a portfolio growth indicator with monthly percentage change

### Requirement 2: Mutual Funds Management

**User Story:** As an investor, I want to track my mutual fund investments and SIPs, so that I can monitor performance and manage my systematic investment plans.

#### Acceptance Criteria

1. WHEN the user accesses mutual funds page THEN the system SHALL display three summary cards: Total Invested, Current Value, and CAGR Returns
2. WHEN the mutual funds page loads THEN the system SHALL show two tabs: "My Mutual Funds" and "Active SIPs"
3. WHEN viewing mutual fund holdings THEN the system SHALL display each fund with name, category, risk level, star rating (1-5), invested amount, current value, and CAGR percentage
4. WHEN displaying fund categories THEN the system SHALL support Large Cap, Mid Cap, Small Cap, and other standard categories
5. WHEN showing risk levels THEN the system SHALL display Low, Moderate, and High risk indicators with appropriate color coding
6. WHEN the user clicks "Add Fund" THEN the system SHALL open a modal form for entering fund details
7. WHEN the user submits fund data THEN the system SHALL validate all required fields and save the investment
8. WHEN viewing Active SIPs tab THEN the system SHALL show SIP name, amount, frequency, next due date, and total installments
9. WHEN the user clicks "Add SIP" THEN the system SHALL open a modal form for creating new SIP investments
10. WHEN the user clicks "Export" THEN the system SHALL generate CSV export of mutual fund data

### Requirement 3: Fixed Deposits Tracking

**User Story:** As a saver, I want to track my fixed deposit investments across different banks, so that I can monitor maturity dates and interest earnings.

#### Acceptance Criteria

1. WHEN the user accesses fixed deposits page THEN the system SHALL display four summary cards: Total Invested, Current Value, Average Interest Rate, and Interest Earned
2. WHEN displaying fixed deposits THEN the system SHALL show each FD as a card (not table format) with bank name, invested amount, current value, maturity amount, and tenure
3. WHEN showing FD cards THEN the system SHALL display bank icons/logos for visual identification
4. WHEN displaying maturity information THEN the system SHALL show a progress bar indicating time remaining until maturity
5. WHEN showing maturity progress THEN the system SHALL display days remaining in readable format (e.g., "345 days left")
6. WHEN displaying FD types THEN the system SHALL support Simple and Cumulative interest types
7. WHEN the user clicks "Add FD" THEN the system SHALL open a modal form for entering FD details including bank, amount, interest rate, start date, and maturity date
8. WHEN calculating current value THEN the system SHALL compute interest earned based on type (simple/cumulative) and elapsed time
9. WHEN the user clicks "Export CSV" THEN the system SHALL generate CSV export of fixed deposit data

### Requirement 4: EPF Account Management

**User Story:** As an employee, I want to track my EPF contributions across different employers, so that I can monitor my retirement savings and contribution history.

#### Acceptance Criteria

1. WHEN the user accesses EPF page THEN the system SHALL display four summary cards: Total EPF Balance, Employee Contribution, Employer Contribution, and Interest Earned
2. WHEN displaying EPF accounts THEN the system SHALL show employer-wise breakdown with company name, PF number, and account status
3. WHEN showing EPF details THEN the system SHALL display employee share, employer share, and pension fund amounts separately
4. WHEN displaying account status THEN the system SHALL support Active and Transferred status indicators
5. WHEN showing contribution details THEN the system SHALL display monthly contribution rate as a percentage
6. WHEN the user clicks "Add Employer" THEN the system SHALL open a modal form for entering employer and PF details
7. WHEN displaying EPF accounts THEN the system SHALL show start date and end date (if transferred)
8. WHEN calculating totals THEN the system SHALL aggregate all EPF accounts for summary cards
9. WHEN the user clicks "Export" THEN the system SHALL generate CSV export of EPF data

### Requirement 5: Stock Portfolio Tracking

**User Story:** As a stock investor, I want to track my equity investments with live price indicators, so that I can monitor my stock portfolio performance and P&L.

#### Acceptance Criteria

1. WHEN the user accesses stocks page THEN the system SHALL display four summary cards: Total Investment, Current Value, Total P&L, and SIP Investment
2. WHEN displaying stock holdings THEN the system SHALL show company name, symbol, sector, market cap category, quantity, buy price, current price, and P&L
3. WHEN showing market cap THEN the system SHALL categorize stocks as Large Cap, Mid Cap, or Small Cap
4. WHEN displaying P&L THEN the system SHALL show both absolute amount and percentage with appropriate color coding
5. WHEN showing current prices THEN the system SHALL display "Live prices" indicator (placeholder for future live data integration)
6. WHEN displaying sectors THEN the system SHALL support standard sectors like Energy, IT Services, Banking, etc.
7. WHEN the user clicks "Add Stock" THEN the system SHALL open a modal form for entering stock details
8. WHEN calculating P&L THEN the system SHALL compute (Current Price - Buy Price) × Quantity for absolute P&L
9. WHEN calculating P&L percentage THEN the system SHALL compute ((Current Value - Invested Amount) / Invested Amount) × 100
10. WHEN the user clicks "Export" THEN the system SHALL generate CSV export of stock data

### Requirement 6: Settings and Data Management

**User Story:** As a user, I want to configure app preferences and export my financial data, so that I can customize the application and backup my investment information.

#### Acceptance Criteria

1. WHEN the user accesses settings page THEN the system SHALL display "Export Data" section with complete portfolio and category-wise export options
2. WHEN the user clicks "Export Complete Portfolio" THEN the system SHALL generate a comprehensive CSV file with all investment data
3. WHEN the user selects category-wise export THEN the system SHALL provide separate export buttons for Mutual Funds, Fixed Deposits, EPF, and Stocks data
4. WHEN the user accesses app preferences THEN the system SHALL show currency format setting with "Indian Rupees (₹)" option
5. WHEN the user accesses number format setting THEN the system SHALL show "Indian (₹1,23,456)" format option
6. WHEN the user toggles dark mode THEN the system SHALL switch between light and dark themes
7. WHEN the user enables auto-refresh prices THEN the system SHALL show toggle for automatic price updates (placeholder for future implementation)
8. WHEN the user configures push notifications THEN the system SHALL show toggle for important updates notifications
9. WHEN exporting data THEN the system SHALL include all relevant fields in proper CSV format with headers

### Requirement 7: Navigation and Layout

**User Story:** As a user, I want intuitive navigation and responsive layout, so that I can easily access different sections and use the app on various devices.

#### Acceptance Criteria

1. WHEN the user accesses the application THEN the system SHALL display a fixed left sidebar with navigation icons and labels
2. WHEN showing navigation items THEN the system SHALL include Dashboard, Mutual Funds, Fixed Deposits, EPF, Stocks, and Settings
3. WHEN the user selects a navigation item THEN the system SHALL highlight the active section and load the corresponding page
4. WHEN displaying page content THEN the system SHALL show page titles with live data indicators where applicable
5. WHEN the user views any page THEN the system SHALL maintain consistent card styling and spacing
6. WHEN displaying on different screen sizes THEN the system SHALL provide responsive design that works on desktop and mobile
7. WHEN showing the main content area THEN the system SHALL use proper margins and padding for readability
8. WHEN displaying the portfolio growth indicator THEN the system SHALL show it consistently across relevant pages

### Requirement 8: Data Validation and Error Handling

**User Story:** As a user, I want proper validation and error handling, so that I can enter data correctly and understand any issues that occur.

#### Acceptance Criteria

1. WHEN the user submits any form THEN the system SHALL validate all required fields before saving
2. WHEN validation fails THEN the system SHALL display clear error messages indicating what needs to be corrected
3. WHEN the user enters financial amounts THEN the system SHALL validate that values are positive numbers
4. WHEN the user enters dates THEN the system SHALL validate date format and logical date ranges
5. WHEN the user enters percentage values THEN the system SHALL validate that percentages are within reasonable ranges
6. WHEN API calls fail THEN the system SHALL display user-friendly error messages
7. WHEN the user performs delete operations THEN the system SHALL show confirmation dialogs
8. WHEN displaying loading states THEN the system SHALL show appropriate loading indicators during data operations