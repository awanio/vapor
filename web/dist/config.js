function getSameOriginUrl(protocol) {
    const { protocol: currentProtocol, host } = window.location;
    const isSecure = currentProtocol === 'https:';
    if (protocol === 'http') {
        return `${currentProtocol}//${host}`;
    }
    else {
        return `${isSecure ? 'wss' : 'ws'}://${host}`;
    }
}
const getEnvConfig = () => {
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
const defaultConfig = getEnvConfig();
const windowConfig = window.VAPOR_CONFIG || {};
export const config = {
    ...defaultConfig,
    ...windowConfig
};
if (config.ENABLE_DEBUG && import.meta.env.DEV) {
    console.log('[Vapor Config] Current configuration:', config);
    console.log('[Vapor Config] Environment:', import.meta.env.MODE);
    window.__VAPOR_CONFIG__ = config;
}
export function getApiUrl(endpoint) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${config.API_BASE_URL}${config.API_VERSION}${cleanEndpoint}`;
}
export function getWsUrl(path) {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${config.WS_BASE_URL}${cleanPath}`;
}
//# sourceMappingURL=config.js.map