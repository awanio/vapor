// API Configuration
// This file makes it easy to configure the API endpoints

interface Config {
  API_BASE_URL: string;
  WS_BASE_URL: string;
  API_VERSION: string;
}

// Default configuration
const defaultConfig: Config = {
  API_BASE_URL: 'https://vapor-dev.awan.app',
  WS_BASE_URL: 'wss://vapor-dev.awan.app',
  API_VERSION: '/api/v1'
};

// Allow override via window object for runtime configuration
// You can set window.VAPOR_CONFIG before the app loads
const windowConfig = (window as any).VAPOR_CONFIG || {};

// Merge configurations
export const config: Config = {
  ...defaultConfig,
  ...windowConfig
};

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
