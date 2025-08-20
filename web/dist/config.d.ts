interface Config {
    API_BASE_URL: string;
    WS_BASE_URL: string;
    API_VERSION: string;
    ENABLE_DEBUG: boolean;
    ENABLE_MOCK_DATA: boolean;
}
export declare const config: Config;
export declare function getApiUrl(endpoint: string): string;
export declare function getWsUrl(path: string): string;
export {};
//# sourceMappingURL=config.d.ts.map