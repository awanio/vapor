// API Configuration
// This file makes it easy to configure the API endpoints
// Now supports environment-based configuration via Vite

interface Config {
  API_BASE_URL: string;
  WS_BASE_URL: string;
  API_VERSION: string;
  ENABLE_DEBUG: boolean;
  ENABLE_MOCK_DATA: boolean;
}

// Helper function to get the base URL for same-origin deployments
function getSameOriginUrl(protocol: 'http' | 'ws'): string {
  const { protocol: currentProtocol, host } = window.location;
  const isSecure = currentProtocol === 'https:';
  
  if (protocol === 'http') {
    return `${currentProtocol}//${host}`;
  } else {
    return `${isSecure ? 'wss' : 'ws'}://${host}`;
  }
}

// Get configuration from environment variables (Vite injects these at build time)
const getEnvConfig = (): Config => {
  // API URLs - if not set or empty, default to same origin
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || getSameOriginUrl('http');
  const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || getSameOriginUrl('ws');
  
  return {
    API_BASE_URL: apiBaseUrl,
    WS_BASE_URL: wsBaseUrl,
    API_VERSION: import.meta.env.VITE_API_VERSION || '/api/v1',
    ENABLE_DEBUG: import.meta.env.VITE_ENABLE_DEBUG === 'true' || import.meta.env.DEV,
    ENABLE_MOCK_DATA: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true'
  };
};

// Default configuration from environment
const defaultConfig: Config = getEnvConfig();

// Allow override via window object for runtime configuration
// You can set window.VAPOR_CONFIG before the app loads
const windowConfig = (window as any).VAPOR_CONFIG || {};

// Merge configurations (window config takes precedence)
export const config: Config = {
  ...defaultConfig,
  ...windowConfig
};

// Development mode helpers
if (config.ENABLE_DEBUG && import.meta.env.DEV) {
  console.log('[Vapor Config] Current configuration:', config);
  console.log('[Vapor Config] Environment:', import.meta.env.MODE);
  
  // Make config available globally in development for debugging
  (window as any).__VAPOR_CONFIG__ = config;
}

// Helper function to get full API URL
export function getApiUrl(endpoint: string): string {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${config.API_BASE_URL}${config.API_VERSION}${cleanEndpoint}`;
}

// Helper function to get full WebSocket URL
export function getWsUrl(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${config.WS_BASE_URL}${cleanPath}`;
}
