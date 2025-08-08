/**
 * API utility class for making HTTP requests to the backend
 */
export class Api {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string) {
    if (token) {
      this.headers['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.headers['Authorization'];
    }
  }

  /**
   * Make a GET request
   */
  async get(path: string, params?: Record<string, any>): Promise<any> {
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

  /**
   * Make a POST request
   */
  async post(path: string, data?: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse(response);
  }

  /**
   * Make a PUT request
   */
  async put(path: string, data?: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse(response);
  }

  /**
   * Make a PATCH request
   */
  async patch(path: string, data?: any): Promise<any> {
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

  /**
   * Make a DELETE request
   */
  async delete(path: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });

    return this.handleResponse(response);
  }

  /**
   * Stream data from server (e.g., for logs)
   */
  async stream(path: string, onData: (data: string) => void): Promise<void> {
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
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        onData(chunk);
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Handle API response
   */
  private async handleResponse(response: Response): Promise<any> {
    if (!response.ok) {
      let error;
      try {
        error = await response.json();
      } catch {
        error = { message: response.statusText };
      }
      
      throw new ApiError(
        error.message || `HTTP error! status: ${response.status}`,
        response.status,
        error
      );
    }

    // Handle empty responses
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

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Export singleton instance
export const api = new Api();
