# Environment Configuration Guide

## Overview

The Vapor web frontend now supports environment-based configuration using Vite's built-in environment variable system. This allows you to have different settings for development, staging, and production builds without modifying the source code.

## Quick Start

1. Copy the example environment file:
   ```bash
   cp .env.example .env.development
   ```

2. Update the values in `.env.development` for your local development environment

3. Run the development server:
   ```bash
   npm run dev
   ```

## Environment Files

The application supports multiple environment files:

- `.env` - Loaded in all cases
- `.env.development` - Loaded in development mode
- `.env.production` - Loaded in production mode
- `.env.staging` - Loaded when using staging mode
- `.env.local` - Local overrides (gitignored)
- `.env.[mode].local` - Local overrides for specific mode (gitignored)

### Priority Order

Environment variables are loaded in the following order (later files override earlier ones):

1. `.env`
2. `.env.[mode]` (e.g., `.env.development`)
3. `.env.local`
4. `.env.[mode].local`

## Available Environment Variables

### API Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `VITE_API_BASE_URL` | Base URL for API requests | Same origin | `http://localhost:8080` |
| `VITE_WS_BASE_URL` | Base URL for WebSocket connections | Same origin | `ws://localhost:8080` |
| `VITE_API_VERSION` | API version prefix | `/api/v1` | `/api/v2` |

### Feature Flags

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `VITE_ENABLE_DEBUG` | Enable debug logging | `false` (true in dev) | `true` |
| `VITE_ENABLE_MOCK_DATA` | Enable mock data mode | `false` | `true` |

### Development Server

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `VITE_PORT` | Development server port | `5173` | `3000` |

## Usage in Code

### Accessing Environment Variables

In your TypeScript/JavaScript code, you can access environment variables through the `config` object:

```typescript
import { config } from '@/config';

// Use the configuration
console.log(config.API_BASE_URL);
console.log(config.ENABLE_DEBUG);

// Or use the helper functions
import { getApiUrl, getWsUrl } from '@/config';

const apiEndpoint = getApiUrl('/users');  // Returns full API URL
const wsEndpoint = getWsUrl('/ws/metrics');  // Returns full WebSocket URL
```

### Conditional Features

Use feature flags to conditionally enable features:

```typescript
import { config } from '@/config';

if (config.ENABLE_DEBUG) {
  console.log('Debug info:', data);
}

if (config.ENABLE_MOCK_DATA) {
  // Use mock data instead of real API
  return mockData;
}
```

## Build Scripts

The `package.json` includes several build scripts for different environments:

### Development
```bash
npm run dev                 # Start dev server with .env.development
npm run dev:staging        # Start dev server with .env.staging
```

### Building
```bash
npm run build              # Production build with .env.production
npm run build:dev          # Development build with .env.development
npm run build:staging      # Staging build with .env.staging
npm run build:prod         # Explicit production build
```

### Preview
```bash
npm run preview            # Preview production build
npm run preview:prod       # Preview with production environment
```

## Same-Origin Deployment

When deploying the frontend embedded with the backend (same origin), you can leave the URL environment variables empty:

```env
VITE_API_BASE_URL=
VITE_WS_BASE_URL=
```

The application will automatically detect and use the current origin for API and WebSocket connections.

## Runtime Configuration

While environment variables are injected at build time, you can still override configuration at runtime using the window object:

```html
<script>
  // This must be set before the app loads
  window.VAPOR_CONFIG = {
    API_BASE_URL: 'https://custom-api.example.com',
    WS_BASE_URL: 'wss://custom-api.example.com',
    ENABLE_DEBUG: true
  };
</script>
```

## Debugging

In development mode with `ENABLE_DEBUG=true`, the configuration is exposed globally for debugging:

```javascript
// In browser console
console.log(window.__VAPOR_CONFIG__);
```

## Security Notes

1. **Never commit sensitive data** in environment files
2. Use `.env.local` or `.env.*.local` for sensitive local configurations
3. These local files are gitignored and won't be committed
4. For production deployments, set environment variables through your CI/CD pipeline or deployment platform

## Examples

### Local Development Setup

`.env.development`:
```env
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_BASE_URL=ws://localhost:8080
VITE_ENABLE_DEBUG=true
```

### Production Build for External API

`.env.production`:
```env
VITE_API_BASE_URL=https://api.vapor.example.com
VITE_WS_BASE_URL=wss://api.vapor.example.com
VITE_ENABLE_DEBUG=false
```

### Embedded Deployment (Same Origin)

`.env.production`:
```env
# Leave empty for same-origin deployment
VITE_API_BASE_URL=
VITE_WS_BASE_URL=
VITE_ENABLE_DEBUG=false
```

## Troubleshooting

### Environment variables not working?

1. Ensure variables are prefixed with `VITE_`
2. Restart the dev server after changing `.env` files
3. Check the console log in development mode for loaded configuration

### Different API endpoint for specific developer?

Create a `.env.development.local` file (gitignored) with your custom settings:

```env
VITE_API_BASE_URL=http://192.168.1.100:8080
```

This will override the settings in `.env.development` just for you.

### "process is not defined" error in production?

If you encounter an error like:
```
Uncaught ReferenceError: process is not defined
```

This is caused by some libraries (like nanostores) checking `process.env.NODE_ENV` which doesn't exist in the browser. The fix is already applied in `vite.config.ts`:

```typescript
define: {
  'process.env.NODE_ENV': JSON.stringify(mode)
}
```

This tells Vite to replace all occurrences of `process.env.NODE_ENV` with the appropriate value at build time.
