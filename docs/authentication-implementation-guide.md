# Authentication Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Authentication Methods](#authentication-methods)
3. [Password Authentication](#password-authentication)
4. [SSH Key Authentication](#ssh-key-authentication)
5. [SSH Challenge-Response Flow](#ssh-challenge-response-flow)
6. [Client Implementation Examples](#client-implementation-examples)
7. [Security Best Practices](#security-best-practices)
8. [Error Handling](#error-handling)
9. [Testing Guide](#testing-guide)

## Overview

The Vapor API supports two authentication methods:
1. **Password Authentication** - Traditional username/password authentication
2. **SSH Key Authentication** - Cryptographic authentication using SSH private keys

Both methods return a JWT token that must be included in subsequent API requests.

### JWT Token Usage
After successful authentication, include the JWT token in the `Authorization` header:
```
Authorization: Bearer <jwt-token>
```

### Token Expiration
- Default expiration: 24 hours
- The `expires_at` field in the response contains the Unix timestamp of expiration
- Clients should implement token refresh logic before expiration

## Authentication Methods

### Method Selection
The `/auth/login` endpoint accepts an `auth_type` parameter to specify the authentication method:
- `password` - Use password authentication
- `ssh_key` - Use SSH private key authentication

## Password Authentication

### Endpoint
```
POST /api/v1/auth/login
```

### Request Body
```json
{
  "username": "john",
  "auth_type": "password",
  "password": "secretpassword123"
}
```

### Response
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": 1705406400,
    "user": {
      "username": "john",
      "uid": 1000,
      "gid": 1000,
      "home": "/home/john"
    }
  }
}
```

### Web App Implementation Example (JavaScript)

```javascript
async function loginWithPassword(username, password) {
  try {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username,
        auth_type: 'password',
        password: password
      })
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const data = await response.json();
    
    // Store the token
    localStorage.setItem('jwt_token', data.data.token);
    localStorage.setItem('token_expires', data.data.expires_at);
    localStorage.setItem('user_info', JSON.stringify(data.data.user));
    
    return data.data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}
```

## SSH Key Authentication

### Overview
SSH key authentication provides a more secure, passwordless authentication method. It supports:
- RSA keys (2048-bit, 3072-bit, 4096-bit)
- ED25519 keys
- ECDSA keys (P-256, P-384, P-521)
- Encrypted private keys with passphrase

### Direct Authentication Flow

#### Endpoint
```
POST /api/v1/auth/login
```

#### Request Body
```json
{
  "username": "john",
  "auth_type": "ssh_key",
  "private_key": "-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW\n...\n-----END OPENSSH PRIVATE KEY-----",
  "passphrase": "optional-passphrase-for-encrypted-keys"
}
```

#### Response
Same as password authentication - returns JWT token and user info.

### Web App Implementation Example

```javascript
async function loginWithSSHKey(username, privateKey, passphrase = null) {
  try {
    const requestBody = {
      username: username,
      auth_type: 'ssh_key',
      private_key: privateKey
    };
    
    if (passphrase) {
      requestBody.passphrase = passphrase;
    }
    
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'SSH key authentication failed');
    }

    const data = await response.json();
    
    // Store the token
    localStorage.setItem('jwt_token', data.data.token);
    localStorage.setItem('token_expires', data.data.expires_at);
    localStorage.setItem('user_info', JSON.stringify(data.data.user));
    
    return data.data;
  } catch (error) {
    console.error('SSH key login failed:', error);
    throw error;
  }
}

// Helper function to read SSH key from file input
function readSSHKeyFile(fileInput) {
  return new Promise((resolve, reject) => {
    const file = fileInput.files[0];
    if (!file) {
      reject(new Error('No file selected'));
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
```

### React Component Example

```jsx
import React, { useState } from 'react';

function SSHKeyLogin() {
  const [username, setUsername] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const text = await file.text();
      setPrivateKey(text);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          auth_type: 'ssh_key',
          private_key: privateKey,
          passphrase: passphrase || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Authentication failed');
      }

      const data = await response.json();
      
      // Store token and redirect
      localStorage.setItem('jwt_token', data.data.token);
      window.location.href = '/dashboard';
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <div>
        <label>Username:</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      
      <div>
        <label>SSH Private Key:</label>
        <input
          type="file"
          accept=".pem,.key,id_rsa,id_ed25519,id_ecdsa"
          onChange={handleFileUpload}
        />
        <textarea
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          placeholder="Or paste your private key here..."
          rows={10}
        />
      </div>
      
      <div>
        <label>Passphrase (if key is encrypted):</label>
        <input
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
        />
      </div>
      
      {error && <div className="error">{error}</div>}
      
      <button type="submit" disabled={loading}>
        {loading ? 'Authenticating...' : 'Login with SSH Key'}
      </button>
    </form>
  );
}
```

## Token Refresh

JWT tokens can be refreshed to extend their expiration without requiring re-authentication. This is useful for maintaining user sessions without forcing frequent logins.

### Refresh Endpoint

```
POST /api/v1/auth/refresh
```

### Refresh Rules

- **Valid tokens**: Can be refreshed anytime before expiration
- **Recently expired tokens**: Can be refreshed if expired within the last 7 days
- **Old expired tokens**: Tokens expired more than 7 days ago require re-authentication via `/auth/login`

### Request

Include the current (or recently expired) token in the Authorization header:

```http
POST /api/v1/auth/refresh HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### Response

```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...new-token",
    "expires_at": 1705492800,
    "user": {
      "username": "john",
      "uid": 1000,
      "gid": 1000,
      "home": "/home/john"
    }
  }
}
```

### JavaScript Implementation

```javascript
async function refreshToken(currentToken) {
  try {
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // Token is invalid or expired beyond refresh window
      // Redirect to login
      window.location.href = '/login';
      return null;
    }

    const data = await response.json();
    
    // Store new token
    localStorage.setItem('jwt_token', data.data.token);
    localStorage.setItem('token_expires', data.data.expires_at);
    localStorage.setItem('user_info', JSON.stringify(data.data.user));
    
    return data.data.token;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}
```

### Automatic Token Refresh

Implement automatic token refresh to maintain user sessions seamlessly:

```javascript
class TokenManager {
  constructor() {
    this.refreshInterval = null;
    this.refreshThreshold = 5 * 60; // Refresh 5 minutes before expiry
  }

  startAutoRefresh() {
    // Check every minute
    this.refreshInterval = setInterval(() => {
      this.checkAndRefresh();
    }, 60000);
    
    // Also check immediately
    this.checkAndRefresh();
  }

  async checkAndRefresh() {
    const token = localStorage.getItem('jwt_token');
    const expiresAt = parseInt(localStorage.getItem('token_expires') || '0');
    
    if (!token || !expiresAt) return;
    
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expiresAt - now;
    
    // Refresh if token expires soon or recently expired
    if (timeUntilExpiry < this.refreshThreshold) {
      await this.refresh();
    }
  }

  async refresh() {
    const currentToken = localStorage.getItem('jwt_token');
    if (!currentToken) return;

    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('jwt_token', data.data.token);
        localStorage.setItem('token_expires', data.data.expires_at);
        console.log('Token refreshed successfully');
      } else if (response.status === 401) {
        // Token invalid or expired beyond window
        this.handleAuthFailure();
      }
    } catch (error) {
      console.error('Token refresh error:', error);
    }
  }

  handleAuthFailure() {
    // Clear stored credentials
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('token_expires');
    localStorage.removeItem('user_info');
    
    // Redirect to login
    window.location.href = '/login';
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

// Usage
const tokenManager = new TokenManager();

// Start auto-refresh when user logs in
tokenManager.startAutoRefresh();

// Stop when user logs out
tokenManager.stopAutoRefresh();
```

### React Hook for Token Management

```jsx
import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function useTokenRefresh() {
  const navigate = useNavigate();
  const intervalRef = useRef(null);

  const refreshToken = useCallback(async () => {
    const currentToken = localStorage.getItem('jwt_token');
    if (!currentToken) return false;

    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('jwt_token', data.data.token);
        localStorage.setItem('token_expires', data.data.expires_at);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    
    return false;
  }, []);

  const checkTokenExpiry = useCallback(async () => {
    const expiresAt = parseInt(localStorage.getItem('token_expires') || '0');
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expiresAt - now;

    // Refresh if token expires in less than 5 minutes
    if (timeUntilExpiry > 0 && timeUntilExpiry < 300) {
      const success = await refreshToken();
      if (!success) {
        navigate('/login');
      }
    } else if (timeUntilExpiry <= 0) {
      // Token already expired, try to refresh
      const success = await refreshToken();
      if (!success) {
        navigate('/login');
      }
    }
  }, [refreshToken, navigate]);

  useEffect(() => {
    // Check immediately
    checkTokenExpiry();

    // Set up interval to check every minute
    intervalRef.current = setInterval(checkTokenExpiry, 60000);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkTokenExpiry]);

  return { refreshToken };
}

// Usage in a component
function App() {
  useTokenRefresh(); // Automatically manages token refresh
  
  return (
    // Your app content
    <div>...</div>
  );
}
```

### Axios Interceptor for Token Refresh

If using Axios for API calls, implement an interceptor to automatically refresh tokens:

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If token expired and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const currentToken = localStorage.getItem('jwt_token');
        const refreshResponse = await axios.post('/api/v1/auth/refresh', {}, {
          headers: {
            'Authorization': `Bearer ${currentToken}`
          }
        });

        const { token } = refreshResponse.data.data;
        localStorage.setItem('jwt_token', token);
        localStorage.setItem('token_expires', refreshResponse.data.data.expires_at);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('token_expires');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

## SSH Challenge-Response Flow

For enhanced security, you can use the challenge-response flow instead of sending the private key directly.

### Flow Overview
1. Client requests a challenge for a specific user
2. Server generates a random challenge and returns it
3. Client signs the challenge with their private SSH key
4. Client sends the signature back to the server
5. Server verifies the signature against the user's public keys
6. Server returns JWT token if verification succeeds

### Step 1: Request Challenge

#### Endpoint
```
POST /api/v1/auth/challenge
```

#### Request
```json
{
  "username": "john"
}
```

#### Response
```json
{
  "status": "success",
  "data": {
    "challenge": "YXNkZmFzZGZhc2RmYXNkZmFzZGY=",
    "challenge_id": "chall-123e4567-e89b-12d3-a456-426614174000",
    "expires_at": 1705320600
  }
}
```

### Step 2: Sign Challenge and Verify

#### Endpoint
```
POST /api/v1/auth/verify
```

#### Request
```json
{
  "username": "john",
  "challenge_id": "chall-123e4567-e89b-12d3-a456-426614174000",
  "signature": "U2lnbmF0dXJlRGF0YUhlcmU=",
  "public_key": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ..."
}
```

#### Response
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": 1705406400,
    "user": {
      "username": "john",
      "uid": 1000,
      "gid": 1000,
      "home": "/home/john"
    }
  }
}
```

### JavaScript Implementation with Web Crypto API

```javascript
// Note: This example uses the Web Crypto API for demonstration.
// In production, you might want to use a library like node-forge or sshpk
// for proper SSH key handling.

async function challengeResponseAuth(username, privateKeyPEM) {
  try {
    // Step 1: Get challenge
    const challengeResponse = await fetch('/api/v1/auth/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    
    const challengeData = await challengeResponse.json();
    const { challenge, challenge_id } = challengeData.data;
    
    // Step 2: Sign the challenge
    // Note: This is a simplified example. Real SSH signing is more complex.
    const signature = await signChallenge(challenge, privateKeyPEM);
    
    // Step 3: Verify signature
    const verifyResponse = await fetch('/api/v1/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        challenge_id,
        signature: btoa(signature) // Base64 encode
      })
    });
    
    const authData = await verifyResponse.json();
    
    // Store token
    localStorage.setItem('jwt_token', authData.data.token);
    
    return authData.data;
  } catch (error) {
    console.error('Challenge-response auth failed:', error);
    throw error;
  }
}

// Using a library like node-forge (recommended for production)
async function signChallengeWithForge(challenge, privateKeyPEM, passphrase) {
  const forge = require('node-forge');
  
  try {
    // Decode base64 challenge
    const challengeBytes = forge.util.decode64(challenge);
    
    // Parse private key
    let privateKey;
    if (passphrase) {
      privateKey = forge.pki.decryptRsaPrivateKey(privateKeyPEM, passphrase);
    } else {
      privateKey = forge.pki.privateKeyFromPem(privateKeyPEM);
    }
    
    // Create signature
    const md = forge.md.sha256.create();
    md.update(challengeBytes, 'raw');
    const signature = privateKey.sign(md);
    
    // Return base64 encoded signature
    return forge.util.encode64(signature);
  } catch (error) {
    throw new Error('Failed to sign challenge: ' + error.message);
  }
}
```

## Client Implementation Examples

### Vue.js Authentication Service

```javascript
// auth.service.js
class AuthService {
  constructor() {
    this.baseURL = '/api/v1';
    this.token = localStorage.getItem('jwt_token');
  }

  async login(username, password) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        auth_type: 'password',
        password
      })
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    this.setToken(data.data.token, data.data.expires_at);
    return data.data;
  }

  async loginWithSSHKey(username, privateKey, passphrase) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        auth_type: 'ssh_key',
        private_key: privateKey,
        passphrase
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'SSH authentication failed');
    }

    const data = await response.json();
    this.setToken(data.data.token, data.data.expires_at);
    return data.data;
  }

  async getUserSSHKeys() {
    const response = await fetch(`${this.baseURL}/auth/keys`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch SSH keys');
    }

    return response.json();
  }

  setToken(token, expiresAt) {
    this.token = token;
    localStorage.setItem('jwt_token', token);
    localStorage.setItem('token_expires', expiresAt);
  }

  getToken() {
    return this.token;
  }

  isAuthenticated() {
    if (!this.token) return false;
    
    const expires = parseInt(localStorage.getItem('token_expires'));
    const now = Math.floor(Date.now() / 1000);
    
    return now < expires;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('token_expires');
    localStorage.removeItem('user_info');
  }
}

export default new AuthService();
```

### Angular Authentication Service

```typescript
// auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

interface LoginRequest {
  username: string;
  auth_type: 'password' | 'ssh_key';
  password?: string;
  private_key?: string;
  passphrase?: string;
}

interface LoginResponse {
  status: string;
  data: {
    token: string;
    expires_at: number;
    user: {
      username: string;
      uid: number;
      gid: number;
      home: string;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseURL = '/api/v1';
  private tokenSubject = new BehaviorSubject<string>(localStorage.getItem('jwt_token'));
  public token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient) {}

  loginWithPassword(username: string, password: string): Observable<LoginResponse> {
    const request: LoginRequest = {
      username,
      auth_type: 'password',
      password
    };

    return this.http.post<LoginResponse>(`${this.baseURL}/auth/login`, request)
      .pipe(
        map(response => {
          this.storeToken(response.data.token, response.data.expires_at);
          return response;
        })
      );
  }

  loginWithSSHKey(
    username: string, 
    privateKey: string, 
    passphrase?: string
  ): Observable<LoginResponse> {
    const request: LoginRequest = {
      username,
      auth_type: 'ssh_key',
      private_key: privateKey,
      passphrase
    };

    return this.http.post<LoginResponse>(`${this.baseURL}/auth/login`, request)
      .pipe(
        map(response => {
          this.storeToken(response.data.token, response.data.expires_at);
          return response;
        })
      );
  }

  private storeToken(token: string, expiresAt: number): void {
    localStorage.setItem('jwt_token', token);
    localStorage.setItem('token_expires', expiresAt.toString());
    this.tokenSubject.next(token);
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.tokenSubject.value;
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  isAuthenticated(): boolean {
    const token = this.tokenSubject.value;
    if (!token) return false;

    const expires = parseInt(localStorage.getItem('token_expires') || '0');
    const now = Math.floor(Date.now() / 1000);
    
    return now < expires;
  }

  logout(): void {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('token_expires');
    localStorage.removeItem('user_info');
    this.tokenSubject.next(null);
  }
}
```

## Security Best Practices

### 1. Private Key Handling
- **Never store private keys in localStorage or cookies**
- Use session storage for temporary storage if needed
- Clear sensitive data from memory after use
- Implement key rotation policies

### 2. Token Management
```javascript
class TokenManager {
  constructor() {
    this.tokenKey = 'jwt_token';
    this.expiresKey = 'token_expires';
    this.refreshThreshold = 300; // Refresh 5 minutes before expiry
  }

  setToken(token, expiresAt) {
    // Use sessionStorage for more sensitive applications
    sessionStorage.setItem(this.tokenKey, token);
    sessionStorage.setItem(this.expiresKey, expiresAt.toString());
  }

  getToken() {
    return sessionStorage.getItem(this.tokenKey);
  }

  shouldRefresh() {
    const expires = parseInt(sessionStorage.getItem(this.expiresKey) || '0');
    const now = Math.floor(Date.now() / 1000);
    return (expires - now) < this.refreshThreshold;
  }

  clearToken() {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.expiresKey);
  }
}
```

### 3. HTTPS Requirements
- **Always use HTTPS in production**
- Never send credentials over unencrypted connections
- Implement certificate pinning for mobile apps

### 4. Rate Limiting
Implement client-side rate limiting to prevent brute force:
```javascript
class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = [];
  }

  canAttempt() {
    const now = Date.now();
    // Remove old attempts
    this.attempts = this.attempts.filter(time => now - time < this.windowMs);
    
    if (this.attempts.length >= this.maxAttempts) {
      return false;
    }
    
    this.attempts.push(now);
    return true;
  }

  getRemainingTime() {
    if (this.attempts.length < this.maxAttempts) return 0;
    
    const oldestAttempt = Math.min(...this.attempts);
    const now = Date.now();
    return Math.max(0, this.windowMs - (now - oldestAttempt));
  }
}
```

### 5. Input Validation
```javascript
function validateSSHKey(privateKey) {
  // Check for valid SSH key format
  const validFormats = [
    /^-----BEGIN RSA PRIVATE KEY-----/,
    /^-----BEGIN OPENSSH PRIVATE KEY-----/,
    /^-----BEGIN EC PRIVATE KEY-----/,
    /^-----BEGIN PRIVATE KEY-----/
  ];
  
  return validFormats.some(format => format.test(privateKey.trim()));
}

function validateUsername(username) {
  // Linux username validation
  const usernameRegex = /^[a-z_][a-z0-9_-]{0,31}$/;
  return usernameRegex.test(username);
}
```

## Error Handling

### Common Error Responses

#### Invalid Credentials (401)
```json
{
  "status": "error",
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid username or password"
  }
}
```

#### Invalid SSH Key Format (400)
```json
{
  "status": "error",
  "error": {
    "code": "INVALID_KEY_FORMAT",
    "message": "Invalid SSH private key format"
  }
}
```

#### Encrypted Key Without Passphrase (400)
```json
{
  "status": "error",
  "error": {
    "code": "PASSPHRASE_REQUIRED",
    "message": "Private key is encrypted but no passphrase provided"
  }
}
```

#### Wrong Passphrase (401)
```json
{
  "status": "error",
  "error": {
    "code": "INVALID_PASSPHRASE",
    "message": "Failed to decrypt private key: wrong passphrase"
  }
}
```

#### No Matching Public Key (401)
```json
{
  "status": "error",
  "error": {
    "code": "NO_MATCHING_KEY",
    "message": "No matching public key found in authorized_keys"
  }
}
```

### Error Handling Example
```javascript
class AuthErrorHandler {
  handleError(error) {
    const errorCode = error.error?.code;
    const errorMessage = error.error?.message;
    
    switch (errorCode) {
      case 'INVALID_CREDENTIALS':
        return {
          title: 'Login Failed',
          message: 'Please check your username and password.',
          action: 'retry'
        };
        
      case 'INVALID_KEY_FORMAT':
        return {
          title: 'Invalid SSH Key',
          message: 'The provided SSH key is not in a valid format.',
          action: 'check_key'
        };
        
      case 'PASSPHRASE_REQUIRED':
        return {
          title: 'Passphrase Required',
          message: 'This SSH key is encrypted. Please provide the passphrase.',
          action: 'request_passphrase'
        };
        
      case 'INVALID_PASSPHRASE':
        return {
          title: 'Wrong Passphrase',
          message: 'The passphrase for the SSH key is incorrect.',
          action: 'retry_passphrase'
        };
        
      case 'NO_MATCHING_KEY':
        return {
          title: 'Key Not Authorized',
          message: 'This SSH key is not authorized for the specified user.',
          action: 'check_authorized_keys'
        };
        
      default:
        return {
          title: 'Authentication Error',
          message: errorMessage || 'An unexpected error occurred.',
          action: 'contact_support'
        };
    }
  }
}
```

## Testing Guide

### Unit Tests Example (Jest)

```javascript
// auth.service.test.js
describe('AuthService', () => {
  let authService;
  
  beforeEach(() => {
    authService = new AuthService();
    // Mock fetch
    global.fetch = jest.fn();
  });
  
  afterEach(() => {
    localStorage.clear();
    jest.resetAllMocks();
  });
  
  describe('loginWithPassword', () => {
    it('should successfully authenticate with valid credentials', async () => {
      const mockResponse = {
        status: 'success',
        data: {
          token: 'mock-jwt-token',
          expires_at: Math.floor(Date.now() / 1000) + 86400,
          user: {
            username: 'testuser',
            uid: 1000,
            gid: 1000,
            home: '/home/testuser'
          }
        }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });
      
      const result = await authService.loginWithPassword('testuser', 'password123');
      
      expect(result.token).toBe('mock-jwt-token');
      expect(localStorage.getItem('jwt_token')).toBe('mock-jwt-token');
    });
    
    it('should handle invalid credentials', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          status: 'error',
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid username or password'
          }
        })
      });
      
      await expect(authService.loginWithPassword('testuser', 'wrong'))
        .rejects.toThrow('Invalid username or password');
    });
  });
  
  describe('loginWithSSHKey', () => {
    it('should authenticate with valid SSH key', async () => {
      const mockKey = '-----BEGIN OPENSSH PRIVATE KEY-----\n...key content...\n-----END OPENSSH PRIVATE KEY-----';
      const mockResponse = {
        status: 'success',
        data: {
          token: 'mock-jwt-token',
          expires_at: Math.floor(Date.now() / 1000) + 86400,
          user: {
            username: 'testuser',
            uid: 1000,
            gid: 1000,
            home: '/home/testuser'
          }
        }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });
      
      const result = await authService.loginWithSSHKey('testuser', mockKey);
      
      expect(result.token).toBe('mock-jwt-token');
      expect(fetch).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            username: 'testuser',
            auth_type: 'ssh_key',
            private_key: mockKey
          })
        })
      );
    });
    
    it('should handle encrypted key with passphrase', async () => {
      const mockKey = '-----BEGIN ENCRYPTED PRIVATE KEY-----\n...';
      const passphrase = 'test-passphrase';
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            token: 'mock-jwt-token',
            expires_at: Math.floor(Date.now() / 1000) + 86400
          }
        })
      });
      
      await authService.loginWithSSHKey('testuser', mockKey, passphrase);
      
      expect(fetch).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        expect.objectContaining({
          body: expect.stringContaining('"passphrase":"test-passphrase"')
        })
      );
    });
  });
});
```

### E2E Testing with Cypress

```javascript
// cypress/integration/auth.spec.js
describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });
  
  it('should login with username and password', () => {
    cy.get('[data-cy=username]').type('testuser');
    cy.get('[data-cy=password]').type('password123');
    cy.get('[data-cy=login-button]').click();
    
    cy.url().should('include', '/dashboard');
    cy.window().its('localStorage.jwt_token').should('exist');
  });
  
  it('should login with SSH key file upload', () => {
    cy.get('[data-cy=auth-method-ssh]').click();
    cy.get('[data-cy=username]').type('testuser');
    
    const fileName = 'test-key.pem';
    cy.fixture(fileName).then(fileContent => {
      cy.get('[data-cy=ssh-key-upload]').attachFile({
        fileContent: fileContent.toString(),
        fileName: fileName,
        mimeType: 'text/plain'
      });
    });
    
    cy.get('[data-cy=login-button]').click();
    cy.url().should('include', '/dashboard');
  });
  
  it('should handle encrypted SSH key', () => {
    cy.get('[data-cy=auth-method-ssh]').click();
    cy.get('[data-cy=username]').type('testuser');
    
    cy.fixture('encrypted-key.pem').then(fileContent => {
      cy.get('[data-cy=ssh-key-upload]').attachFile({
        fileContent: fileContent.toString(),
        fileName: 'encrypted-key.pem',
        mimeType: 'text/plain'
      });
    });
    
    // Should show passphrase field
    cy.get('[data-cy=passphrase]').should('be.visible');
    cy.get('[data-cy=passphrase]').type('test-passphrase');
    
    cy.get('[data-cy=login-button]').click();
    cy.url().should('include', '/dashboard');
  });
  
  it('should display error for invalid credentials', () => {
    cy.get('[data-cy=username]').type('testuser');
    cy.get('[data-cy=password]').type('wrongpassword');
    cy.get('[data-cy=login-button]').click();
    
    cy.get('[data-cy=error-message]')
      .should('be.visible')
      .and('contain', 'Invalid username or password');
  });
});
```

## Troubleshooting

### Common Issues and Solutions

#### 1. SSH Key Not Working
- Ensure the public key is in the user's `~/.ssh/authorized_keys` file
- Check key format (OpenSSH vs PEM)
- Verify key permissions on the server

#### 2. Token Expiration
- Implement automatic token refresh
- Show user-friendly session timeout warnings
- Provide seamless re-authentication

#### 3. CORS Issues
- Configure proper CORS headers on the server
- Use proxy configuration in development

#### 4. Large Key Files
- Implement file size validation (typical SSH keys are < 10KB)
- Show progress indicator for file reading

## Additional Resources

- [OpenSSH Key Format Specification](https://github.com/openssh/openssh-portable/blob/master/PROTOCOL.key)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Web Crypto API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [SSH Key Types and Algorithms](https://www.ssh.com/academy/ssh/keygen)
