# Protected Routes and Session Management Implementation

## Overview

This implementation provides a comprehensive protected routes and session management system for the FiscalFlow application, including:

1. **Enhanced AuthStore** with automatic token refresh and session management
2. **UserContext Provider** for accessing user data across components
3. **Protected Route Components** with authentication and email verification checks
4. **Session Management Hooks** for automatic logout and session warnings
5. **API Client Integration** with automatic token handling and error management

## Key Components

### 1. Enhanced AuthStore (`frontend/src/stores/AuthStore.js`)

**New Features:**
- **Initialization State**: `isInitializing` flag to handle app startup
- **Token Refresh**: Automatic token validation and refresh setup
- **Session Management**: Automatic logout on token expiry
- **Enhanced Error Handling**: Better error handling for token-related issues

**Key Methods:**
- `initializeAuth()`: Validates stored token on app startup
- `setupTokenRefresh()`: Sets up automatic token refresh timers
- `refreshToken()`: Validates current token and sets up next refresh
- `clearAuth()`: Comprehensive cleanup of authentication state

**New Computed Properties:**
- `isAuthReady`: Indicates if authentication initialization is complete
- `needsEmailVerification`: Checks if user needs email verification
- `isFullyAuthenticated`: Checks if user is authenticated and email verified
- `userDisplayName`: Gets user display name

### 2. UserContext Provider (`frontend/src/contexts/UserContext.jsx`)

**Purpose**: Provides a React Context for accessing user data and authentication state across components without prop drilling.

**Features:**
- **User Data Access**: Direct access to user information
- **Authentication State**: Current authentication status
- **Loading States**: Initialization and loading indicators
- **Auth Actions**: Login, logout, register, and profile management
- **Session Management**: Token refresh and session handling

**Components:**
- `UserProvider`: Context provider component
- `useUser`: Custom hook for accessing user context
- `AuthLoadingSpinner`: Loading component for authentication initialization

### 3. Protected Route Components (`frontend/src/components/auth/ProtectedRoute.jsx`)

**Components:**

#### `ProtectedRoute`
- **Purpose**: Base protected route component
- **Features**: 
  - Authentication checks
  - Optional email verification requirement
  - Loading states during initialization
  - Customizable redirect paths

#### `EmailVerifiedRoute`
- **Purpose**: Route that requires email verification
- **Usage**: For routes that need verified users only

#### `PublicOnlyRoute`
- **Purpose**: Routes that redirect authenticated users
- **Usage**: For login/register pages

### 4. Session Management Hook (`frontend/src/hooks/useSession.js`)

**Features:**
- **Activity Monitoring**: Tracks user activity to manage session timeouts
- **Session Warnings**: Warns users before session expiry
- **Automatic Logout**: Logs out users after inactivity
- **Session Extension**: Allows manual session extension
- **Permission Checking**: Role-based permission system

**Configuration:**
- Session warning: 25 minutes of inactivity
- Session timeout: 30 minutes of inactivity
- Activity throttling: 1-minute intervals

### 5. Enhanced API Client (`frontend/src/lib/apiClient.js`)

**New Features:**
- **Automatic Token Handling**: Includes auth token in requests
- **Token Expiry Detection**: Detects and handles expired tokens
- **Automatic Logout**: Triggers logout on authentication failures
- **Error Handling**: Improved error handling for auth-related issues

## Implementation Details

### Authentication Flow

1. **App Initialization**:
   ```javascript
   // AuthStore initializes and validates stored token
   async initializeAuth() {
     this.isInitializing = true
     const token = localStorage.getItem('authToken')
     
     if (token) {
       try {
         this.token = token
         await this.fetchUserProfile() // Validates token
         this.isAuthenticated = true
         this.setupTokenRefresh()
       } catch (error) {
         this.clearAuth() // Clear invalid token
       }
     }
     
     this.isInitializing = false
   }
   ```

2. **Route Protection**:
   ```javascript
   // ProtectedRoute checks authentication status
   if (isInitializing || !isAuthReady) {
     return <AuthLoadingSpinner />
   }
   
   if (!isAuthenticated) {
     return <Navigate to="/login" />
   }
   
   if (requireEmailVerification && needsEmailVerification) {
     return <Navigate to="/verify-email/pending" />
   }
   ```

3. **Session Management**:
   ```javascript
   // useSession hook monitors activity and manages timeouts
   const handleActivity = () => {
     if (now - lastActivity > 60000) {
       resetTimers() // Reset session timers
     }
   }
   ```

### Token Refresh Strategy

The implementation uses a proactive token validation approach:

1. **Token Validation**: On app startup, validates stored token by fetching user profile
2. **Refresh Timer**: Sets up timer to refresh token 5 minutes before expiry
3. **Activity-Based**: Resets timers based on user activity
4. **Fallback**: If token is invalid, automatically logs out user

### Route Structure

```javascript
// App.jsx route structure
<Routes>
  {/* Public-only routes */}
  <Route path="/login" element={
    <PublicOnlyRoute><Login /></PublicOnlyRoute>
  } />
  
  {/* Email verification routes */}
  <Route path="/verify-email/:token" element={
    <ProtectedRoute><VerifyEmail /></ProtectedRoute>
  } />
  
  {/* Email-verified routes */}
  <Route path="/" element={
    <EmailVerifiedRoute><Layout /></EmailVerifiedRoute>
  }>
    <Route index element={<Dashboard />} />
    {/* Other protected routes */}
  </Route>
</Routes>
```

## Security Features

### 1. Token Security
- **Automatic Expiry**: Tokens expire and are automatically refreshed
- **Validation**: Tokens are validated on app startup and API calls
- **Cleanup**: Tokens are cleared on logout or expiry

### 2. Session Security
- **Activity Monitoring**: Sessions timeout after inactivity
- **Warning System**: Users are warned before session expiry
- **Automatic Logout**: Users are logged out after timeout

### 3. Route Security
- **Authentication Checks**: All protected routes verify authentication
- **Email Verification**: Sensitive routes require email verification
- **Loading States**: Prevents access during authentication initialization

## Usage Examples

### Basic Protected Route
```javascript
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

### Email Verification Required
```javascript
<EmailVerifiedRoute>
  <SensitiveComponent />
</EmailVerifiedRoute>
```

### Using User Context
```javascript
function MyComponent() {
  const { user, isAuthenticated, logout } = useUser()
  
  return (
    <div>
      <p>Welcome, {user?.name}</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

### Session Management
```javascript
function MyLayout() {
  const { extendSession } = useSession()
  
  return (
    <div>
      <button onClick={extendSession}>Extend Session</button>
    </div>
  )
}
```

## Testing

The implementation includes comprehensive tests for:
- Protected route behavior
- Authentication state management
- Session timeout handling
- Token refresh functionality

## Benefits

1. **Security**: Comprehensive authentication and session management
2. **User Experience**: Smooth authentication flow with loading states
3. **Maintainability**: Centralized authentication logic
4. **Flexibility**: Configurable route protection levels
5. **Performance**: Efficient token management and validation

## Future Enhancements

1. **Refresh Tokens**: Implement proper refresh token mechanism
2. **Multi-Device Sessions**: Track and manage sessions across devices
3. **Role-Based Access**: Expand permission system for different user roles
4. **Session Analytics**: Track session patterns and security events
5. **Biometric Authentication**: Add support for biometric login methods

This implementation provides a robust foundation for authentication and session management that can be extended as the application grows.