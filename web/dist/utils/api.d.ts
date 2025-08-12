export declare class Api {
    private baseUrl;
    private headers;
    constructor(baseUrl?: string);
    setAuthToken(token: string): void;
    get(path: string, params?: Record<string, any>): Promise<any>;
    post(path: string, data?: any): Promise<any>;
    put(path: string, data?: any): Promise<any>;
    patch(path: string, data?: any): Promise<any>;
    delete(path: string): Promise<any>;
    stream(path: string, onData: (data: string) => void): Promise<void>;
    private handleResponse;
}
export declare class ApiError extends Error {
    status: number;
    details?: any | undefined;
    constructor(message: string, status: number, details?: any | undefined);
}
export declare const api: Api;
//# sourceMappingURL=api.d.ts.map