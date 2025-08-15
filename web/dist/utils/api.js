export class Api {
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
        this.headers = {
            'Content-Type': 'application/json',
        };
    }
    setAuthToken(token) {
        if (token) {
            this.headers['Authorization'] = `Bearer ${token}`;
        }
        else {
            delete this.headers['Authorization'];
        }
    }
    async get(path, params) {
        const url = new URL(`${this.baseUrl}${path}`, window.location.origin);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, String(value));
                }
            });
        }
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: this.headers,
        });
        return this.handleResponse(response);
    }
    async post(path, data) {
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: 'POST',
            headers: this.headers,
            body: data ? JSON.stringify(data) : undefined,
        });
        return this.handleResponse(response);
    }
    async put(path, data) {
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: 'PUT',
            headers: this.headers,
            body: data ? JSON.stringify(data) : undefined,
        });
        return this.handleResponse(response);
    }
    async patch(path, data) {
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: 'PATCH',
            headers: {
                ...this.headers,
                'Content-Type': 'application/merge-patch+json',
            },
            body: data ? JSON.stringify(data) : undefined,
        });
        return this.handleResponse(response);
    }
    async delete(path) {
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: 'DELETE',
            headers: this.headers,
        });
        return this.handleResponse(response);
    }
    async stream(path, onData) {
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: 'GET',
            headers: this.headers,
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body');
        }
        const decoder = new TextDecoder();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                const chunk = decoder.decode(value, { stream: true });
                onData(chunk);
            }
        }
        finally {
            reader.releaseLock();
        }
    }
    async handleResponse(response) {
        if (!response.ok) {
            let error;
            try {
                error = await response.json();
            }
            catch {
                error = { message: response.statusText };
            }
            throw new ApiError(error.message || `HTTP error! status: ${response.status}`, response.status, error);
        }
        if (response.status === 204 || response.headers.get('content-length') === '0') {
            return null;
        }
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        }
        return response.text();
    }
}
export class ApiError extends Error {
    constructor(message, status, details) {
        super(message);
        this.status = status;
        this.details = details;
        this.name = 'ApiError';
    }
}
export const api = new Api();
//# sourceMappingURL=api.js.map