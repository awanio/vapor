const defaultConfig = {
    API_BASE_URL: 'https://vapor-dev.awan.app',
    WS_BASE_URL: 'wss://vapor-dev.awan.app',
    API_VERSION: '/api/v1'
};
const windowConfig = window.VAPOR_CONFIG || {};
export const config = {
    ...defaultConfig,
    ...windowConfig
};
export function getApiUrl(endpoint) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${config.API_BASE_URL}${config.API_VERSION}${cleanEndpoint}`;
}
export function getWsUrl(path) {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${config.WS_BASE_URL}${cleanPath}`;
}
//# sourceMappingURL=config.js.map