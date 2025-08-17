import { getApiUrl, getWsUrl } from './config';
export class AuthManager {
    constructor() {
        this.token = null;
        this.expiresAt = null;
        console.log('[AuthManager] Constructor called');
        this.loadToken();
    }
    static getInstance() {
        if (!AuthManager.instance) {
            AuthManager.instance = new AuthManager();
        }
        return AuthManager.instance;
    }
    loadToken() {
        console.log('[AuthManager] loadToken called');
        const storedToken = localStorage.getItem('jwt_token');
        const storedExpiry = localStorage.getItem('jwt_expires_at');
        console.log('[AuthManager] localStorage values:', {
            storedToken: storedToken ? `${storedToken.substring(0, 20)}...` : 'null',
            storedExpiry,
            currentTime: Date.now(),
            localStorage: {
                jwt_token: localStorage.getItem('jwt_token') ? 'exists' : 'null',
                jwt_expires_at: localStorage.getItem('jwt_expires_at')
            }
        });
        if (storedToken && storedExpiry) {
            const expiry = parseInt(storedExpiry, 10);
            console.log('[AuthManager] Token found, checking expiry:', {
                expiry,
                currentTime: Date.now(),
                isExpired: expiry <= Date.now(),
                timeUntilExpiry: expiry - Date.now()
            });
            if (expiry > Date.now()) {
                this.token = storedToken;
                this.expiresAt = expiry;
                console.log('[AuthManager] Token loaded successfully');
            }
            else {
                console.log('[AuthManager] Token expired, clearing');
                this.clearToken();
            }
        }
        else {
            console.log('[AuthManager] No valid token in localStorage');
        }
    }
    saveToken(token, expiresAt) {
        const expiresAtMs = expiresAt < 10000000000 ? expiresAt * 1000 : expiresAt;
        console.log('[AuthManager] saveToken called:', {
            token: token ? `${token.substring(0, 20)}...` : 'null',
            expiresAtOriginal: expiresAt,
            expiresAtMs,
            expiresAtDate: new Date(expiresAtMs).toISOString()
        });
        this.token = token;
        this.expiresAt = expiresAtMs;
        localStorage.setItem('jwt_token', token);
        localStorage.setItem('jwt_expires_at', expiresAtMs.toString());
        const savedToken = localStorage.getItem('jwt_token');
        const savedExpiry = localStorage.getItem('jwt_expires_at');
        console.log('[AuthManager] Token saved to localStorage:', {
            savedSuccessfully: savedToken === token && savedExpiry === expiresAtMs.toString(),
            savedToken: savedToken ? 'exists' : 'null',
            savedExpiry
        });
    }
    clearToken() {
        this.token = null;
        this.expiresAt = null;
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('jwt_expires_at');
    }
    async login(username, password) {
        try {
            const auth_type = "password";
            const response = await fetch(getApiUrl('/auth/login'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password, auth_type }),
            });
            const data = await response.json();
            if (response.ok && data.status === 'success' && data.data) {
                console.log('[AuthManager] Login successful, response data:', {
                    hasToken: !!data.data.token,
                    expiresAt: data.data.expires_at,
                    expiresAtDate: new Date(data.data.expires_at).toISOString()
                });
                this.saveToken(data.data.token, data.data.expires_at);
                window.dispatchEvent(new CustomEvent('auth:login'));
                return true;
            }
            else {
                console.log('[AuthManager] Login failed:', {
                    responseOk: response.ok,
                    status: data.status,
                    hasData: !!data.data,
                    error: data.error
                });
            }
            return false;
        }
        catch (error) {
            console.error('Login error:', error);
            return false;
        }
    }
    logout() {
        this.clearToken();
        window.dispatchEvent(new CustomEvent('auth:logout'));
        window.location.href = '/';
    }
    isAuthenticated() {
        return !!this.token && !!this.expiresAt && this.expiresAt > Date.now();
    }
    getToken() {
        if (this.isAuthenticated()) {
            return this.token;
        }
        return null;
    }
    getAuthHeaders() {
        const token = this.getToken();
        console.log('[AuthManager] getAuthHeaders called, token:', token ? 'present' : 'null');
        if (token) {
            const headers = {
                'Authorization': `Bearer ${token}`,
            };
            console.log('[AuthManager] Returning auth headers:', headers);
            return headers;
        }
        console.log('[AuthManager] No token, returning empty headers');
        return {};
    }
    isTokenExpiringSoon() {
        if (!this.expiresAt)
            return true;
        const fiveMinutes = 5 * 60 * 1000;
        return this.expiresAt - Date.now() < fiveMinutes;
    }
    getWebSocketUrl(path) {
        return getWsUrl(path);
    }
}
export const auth = AuthManager.getInstance();
//# sourceMappingURL=auth.js.map