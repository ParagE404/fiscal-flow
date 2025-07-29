# User Onboarding System

This directory contains the complete user onboarding system for FiscalFlow, implementing task 10.9 from the project specifications.

## Components

### 1. WelcomeScreen.jsx
- **Purpose**: App introduction and feature highlights
- **Features**:
  - Welcome message with app branding
  - Feature showcase with icons and descriptions
  - Benefits list with checkmarks
  - Get Started and Skip Setup buttons
  - Responsive design with gradient background

### 2. ProfileSetupWizard.jsx
- **Purpose**: Step-by-step profile setup wizard
- **Features**:
  - 3-step wizard: Personal Info, Preferences, Portfolio Setup
  - Progress indicator and step navigation
  - Form validation using Zod schemas
  - Avatar upload functionality
  - User preferences configuration
  - Investment profile setup
  - Data persistence to localStorage and user profile

### 3. GuidedTour.jsx
- **Purpose**: Interactive guided tour with tooltips
- **Features**:
  - 8-step interactive tour of key features
  - Dynamic tooltip positioning
  - Element highlighting with animations
  - Skip option for experienced users
  - Responsive tooltip placement
  - Progress tracking
  - Auto-scroll to highlighted elements

### 4. OnboardingFlow.jsx
- **Purpose**: Main orchestrator for the onboarding process
- **Features**:
  - State management for onboarding steps
  - Automatic detection of new users
  - Persistence of onboarding completion status
  - Integration with authentication system
  - Conditional rendering based on user state

### 5. OnboardingTest.jsx
- **Purpose**: Testing component for development
- **Features**:
  - Individual component testing
  - State reset functionality
  - Mock data for guided tour
  - Development-only component

## Integration

### App.jsx Integration
The onboarding system is integrated into the main app through:
```jsx
{showOnboarding && (
  <OnboardingFlow onComplete={handleOnboardingComplete} />
)}
```

### Tour Data Attributes
Components throughout the app use `data-tour` attributes for guided tour targeting:
- `data-tour="sidebar"` - Navigation sidebar
- `data-tour="summary-cards"` - Portfolio summary cards
- `data-tour="asset-allocation"` - Asset allocation chart
- `data-tour="top-performers"` - Top performers section
- `data-tour="add-button"` - Add investment buttons
- `data-tour="settings-nav"` - Settings navigation

### Settings Integration
Users can manually trigger the guided tour from Settings > App Preferences > Take Guided Tour

## State Management

### LocalStorage Keys
- `onboardingCompleted`: Tracks completion of welcome screen and profile setup
- `guidedTourCompleted`: Tracks completion of guided tour
- `userPreferences`: Stores user preferences from profile setup

### User Detection
The system detects new users by comparing:
- User creation date vs last login date
- Onboarding completion status
- Tour completion status

## Styling

### CSS Classes
- Uses Tailwind CSS for styling
- Responsive design with mobile-first approach
- Custom animations for tour highlights
- Gradient backgrounds for visual appeal

### Tour Highlighting
```css
.tour-highlight {
  position: relative;
  z-index: 51;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
  border-radius: 8px;
  transition: all 0.3s ease;
}
```

## Usage

### For New Users
1. Welcome screen appears automatically after registration
2. Profile setup wizard guides through initial configuration
3. Guided tour introduces key features
4. All steps can be skipped if desired

### For Existing Users
- Guided tour can be triggered from Settings
- Onboarding state can be reset for testing
- Components are conditionally rendered based on completion status

## Dependencies

- `react-hook-form`: Form handling and validation
- `@hookform/resolvers/zod`: Zod integration for form validation
- `zod`: Schema validation
- `mobx-react-lite`: State management integration
- `lucide-react`: Icons
- `@radix-ui/*`: UI components (Dialog, Progress, Select, etc.)

## Testing

Use the test route `/onboarding-test` during development to:
- Test individual components
- Verify form validation
- Check responsive design
- Reset onboarding state
- Debug tour positioning

## Future Enhancements

1. **Analytics**: Track onboarding completion rates
2. **A/B Testing**: Test different onboarding flows
3. **Personalization**: Customize based on user preferences
4. **Help System**: Context-sensitive help throughout the app
5. **Video Tutorials**: Embedded video guides for complex features