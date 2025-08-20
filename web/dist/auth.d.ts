export declare class AuthManager {
    private static instance;
    private token;
    private expiresAt;
    private constructor();
    static getInstance(): AuthManager;
    private loadToken;
    private saveToken;
    private clearToken;
    login(username: string, password: string): Promise<boolean>;
    logout(): void;
    isAuthenticated(): boolean;
    getToken(): string | null;
    getAuthHeaders(): Record<string, string>;
    isTokenExpiringSoon(): boolean;
    getWebSocketUrl(path: string): string;
}
export declare const auth: AuthManager;
//# sourceMappingURL=auth.d.ts.map