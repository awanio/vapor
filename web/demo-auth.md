# Authentication Flow Demo

This document explains how to test the authentication flow in the Vapor web application.

## Overview

The authentication system has been implemented with the following features:

1. **Login Page**: Displayed when user is not authenticated
2. **Main Dashboard**: Shown when user is authenticated
3. **Session Management**: JWT tokens stored in localStorage
4. **Logout Functionality**: Clear session and redirect to login

## Testing the Authentication Flow

### 1. Start the Development Server

```bash
cd /Users/kandar/Workspaces/vapor/api/web
npm run dev
```

### 2. Initial State (Not Logged In)

When you visit http://localhost:5173/, you should see:
- A login page with username and password fields
- The Vapor logo and "Vapor Dashboard" title
- A blue "Login" button

### 3. Login Attempt

Since the backend API is not running, login attempts will fail. You'll see:
- Error message: "An error occurred. Please try again."
- The form remains active for retry

### 4. Simulating Authentication (for testing)

To test the authenticated state, you can manually set a token in the browser console:

```javascript
// Open browser DevTools console and run:
localStorage.setItem('jwt_token', 'fake-token-for-testing');
localStorage.setItem('jwt_expires_at', String(Date.now() + 3600000)); // 1 hour from now

// Reload the page
location.reload();
```

### 5. Authenticated State

After setting the token and reloading, you should see:
- Header with "Vapor Dashboard" title
- "Logged in" status and "Logout" button
- Collapsible sidebar with toggle button
- Tab navigation (Dashboard, Network, Storage)
- The dashboard content (charts may not render without backend)

### 6. Logout

Click the "Logout" button to:
- Clear the authentication token
- Redirect back to the login page

## Implementation Details

### Components

1. **`/src/auth.ts`**: AuthManager singleton for handling authentication
2. **`/src/components/login-page.ts`**: Login form component
3. **`/src/app-root.ts`**: Main app component with auth state management

### CSS Variables

The app uses a dark theme with CSS variables defined in:
- `/src/styles/globals.css`: Theme variables and base styles

### Testing

Run the authentication flow tests:

```bash
npm test -- test/auth-flow.test.ts
```

## Next Steps

To fully test the authentication flow with a real backend:

1. Start the Vapor API server
2. Ensure the proxy configuration in `vite.config.ts` points to the correct API endpoint
3. Use valid credentials to test actual login/logout flow

## Security Notes

- Tokens are stored in localStorage (consider using httpOnly cookies for production)
- All API requests include the JWT token in the Authorization header
- WebSocket connections include the token as a query parameter
- Token expiration is checked before making requests
