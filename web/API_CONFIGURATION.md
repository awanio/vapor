# API Configuration

This web app is configured to communicate directly with the Vapor API server without any proxy.

## Default Configuration

By default, the app is configured to connect to:
- REST API: `http://103.179.254.248:8080`
- WebSocket: `ws://103.179.254.248:8080`

## Changing the API Endpoint

You can easily configure the API endpoints by setting the `window.VAPOR_CONFIG` object before the app loads.

### Method 1: Modify index.html

Add the following script tag to your `index.html` file before the app's main script:

```html
<script>
  window.VAPOR_CONFIG = {
    API_BASE_URL: 'http://your-api-host:8080',
    WS_BASE_URL: 'ws://your-api-host:8080',
    API_VERSION: '/api/v1'  // Optional, defaults to '/api/v1'
  };
</script>
```

### Method 2: Using Environment Variables (Build Time)

For build-time configuration with Vite, create a `.env` file:

```bash
VITE_API_BASE_URL=http://your-api-host:8080
VITE_WS_BASE_URL=ws://your-api-host:8080
```

Then update `config.ts` to use these variables:

```typescript
const defaultConfig: Config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://103.179.254.248:8080',
  WS_BASE_URL: import.meta.env.VITE_WS_BASE_URL || 'ws://103.179.254.248:8080',
  API_VERSION: '/api/v1'
};
```

## Configuration Examples

### Local Development
```javascript
window.VAPOR_CONFIG = {
  API_BASE_URL: 'http://localhost:8080',
  WS_BASE_URL: 'ws://localhost:8080'
};
```

### Production with HTTPS
```javascript
window.VAPOR_CONFIG = {
  API_BASE_URL: 'https://api.example.com',
  WS_BASE_URL: 'wss://api.example.com'
};
```

### Custom Network/Port
```javascript
window.VAPOR_CONFIG = {
  API_BASE_URL: 'http://192.168.1.100:3000',
  WS_BASE_URL: 'ws://192.168.1.100:3000'
};
```

## Configuration Structure

The configuration object supports the following properties:

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `API_BASE_URL` | string | Base URL for REST API calls | `http://103.179.254.248:8080` |
| `WS_BASE_URL` | string | Base URL for WebSocket connections | `ws://103.179.254.248:8080` |
| `API_VERSION` | string | API version path prefix | `/api/v1` |

## Notes

1. **No Proxy Required**: The app communicates directly with the API server.
2. **CORS**: Ensure your API server has proper CORS headers configured to allow requests from the web app's origin.
3. **HTTPS/WSS**: In production, use HTTPS and WSS for secure connections.
4. **Authentication**: The app automatically includes JWT tokens in API requests and WebSocket connections.

## Troubleshooting

If you're having connection issues:

1. Check that the API server is running and accessible from your network
2. Verify CORS is properly configured on the API server
3. Check browser console for any error messages
4. Ensure the API endpoints are correctly formatted (no trailing slashes)
5. For WebSocket issues, check if your firewall or proxy is blocking WebSocket connections
