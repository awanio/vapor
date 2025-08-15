# SSH Key Authentication for Vapor

## Overview

Vapor now supports SSH key-based authentication as an alternative to traditional password authentication. This provides a more secure and convenient way to authenticate, especially for automated systems and CI/CD pipelines.

## Features

- **Multiple Authentication Methods**: Support for both password and SSH key authentication
- **SSH Key Validation**: Validates private keys against user's `~/.ssh/authorized_keys`
- **Encrypted Key Support**: Supports encrypted private keys with passphrase
- **Multiple Key Formats**: Supports RSA, ED25519, ECDSA key types
- **Challenge-Response**: Optional challenge-response authentication for enhanced security
- **Key Management**: API endpoints to list user's authorized SSH keys

## Authentication Methods

### 1. Password Authentication (Traditional)

```json
POST /api/v1/auth/login
{
    "username": "john",
    "auth_type": "password",
    "password": "your-password"
}
```

### 2. SSH Key Authentication

```json
POST /api/v1/auth/login
{
    "username": "john",
    "auth_type": "ssh_key",
    "private_key": "base64-encoded-private-key",
    "passphrase": "optional-passphrase-for-encrypted-keys"
}
```

## How It Works

1. **User submits private key**: The client sends the private key (base64 encoded) along with the username
2. **Key parsing**: The server parses the private key and extracts the public key
3. **Authorization check**: The server checks if the corresponding public key exists in the user's `~/.ssh/authorized_keys` file
4. **Token generation**: If authentication succeeds, a JWT token is returned

## Implementation Details

### Key Files

- `internal/auth/ssh_auth.go` - SSH key authentication logic
- `internal/auth/service_enhanced.go` - Enhanced service with multiple auth methods
- `internal/auth/ssh_auth_test.go` - Test cases and examples

### Supported Key Formats

- **RSA**: Traditional RSA keys (2048, 3072, 4096 bits)
- **ED25519**: Modern elliptic curve keys (recommended)
- **ECDSA**: Elliptic curve DSA keys
- **OpenSSH**: Both old and new OpenSSH formats

### Security Considerations

1. **Private Key Transmission**: Private keys are transmitted over HTTPS only
2. **Key Validation**: Keys are validated against the system's authorized_keys
3. **No Key Storage**: Private keys are never stored on the server
4. **Token Expiration**: JWT tokens expire after 24 hours by default

## API Endpoints

### Login with SSH Key

**Endpoint**: `POST /api/v1/auth/login`

**Request Body**:
```json
{
    "username": "string",
    "auth_type": "ssh_key",
    "private_key": "string (base64 or PEM)",
    "passphrase": "string (optional)"
}
```

**Response**:
```json
{
    "success": true,
    "data": {
        "token": "jwt-token",
        "expires_at": 1234567890
    }
}
```

### Get User's SSH Keys

**Endpoint**: `GET /api/v1/auth/users/{username}/keys`

**Response**:
```json
{
    "success": true,
    "data": {
        "username": "john",
        "keys": [
            {
                "type": "ssh-rsa",
                "fingerprint": "SHA256:xxxxx",
                "comment": "john@laptop"
            },
            {
                "type": "ssh-ed25519",
                "fingerprint": "SHA256:yyyyy",
                "comment": "john@desktop"
            }
        ]
    }
}
```

## Client Examples

### Bash Script Example

```bash
#!/bin/bash

# Encode private key
PRIVATE_KEY=$(base64 -w 0 < ~/.ssh/id_rsa)

# Authenticate
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$USER\",
    \"auth_type\": \"ssh_key\",
    \"private_key\": \"$PRIVATE_KEY\"
  }"
```

### Go Client Example

```go
package main

import (
    "encoding/base64"
    "io/ioutil"
    "bytes"
    "net/http"
    "encoding/json"
)

func authenticateWithSSHKey(username, keyPath string) (string, error) {
    // Read private key
    keyData, err := ioutil.ReadFile(keyPath)
    if err != nil {
        return "", err
    }
    
    // Encode to base64
    keyBase64 := base64.StdEncoding.EncodeToString(keyData)
    
    // Create request
    payload := map[string]string{
        "username": username,
        "auth_type": "ssh_key",
        "private_key": keyBase64,
    }
    
    jsonData, _ := json.Marshal(payload)
    
    // Send request
    resp, err := http.Post(
        "http://localhost:8080/api/v1/auth/login",
        "application/json",
        bytes.NewBuffer(jsonData),
    )
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()
    
    // Parse response
    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    
    if data, ok := result["data"].(map[string]interface{}); ok {
        if token, ok := data["token"].(string); ok {
            return token, nil
        }
    }
    
    return "", fmt.Errorf("authentication failed")
}
```

### Python Client Example

```python
import base64
import requests
import os

def authenticate_with_ssh_key(username, key_path, passphrase=None):
    """Authenticate using SSH private key"""
    
    # Read private key
    with open(os.path.expanduser(key_path), 'rb') as f:
        private_key = f.read()
    
    # Encode to base64
    private_key_b64 = base64.b64encode(private_key).decode('utf-8')
    
    # Prepare payload
    payload = {
        'username': username,
        'auth_type': 'ssh_key',
        'private_key': private_key_b64
    }
    
    if passphrase:
        payload['passphrase'] = passphrase
    
    # Send request
    response = requests.post(
        'http://localhost:8080/api/v1/auth/login',
        json=payload
    )
    
    if response.status_code == 200:
        data = response.json()
        return data['data']['token']
    else:
        raise Exception(f"Authentication failed: {response.text}")

# Usage
token = authenticate_with_ssh_key('john', '~/.ssh/id_rsa')
print(f"Token: {token}")
```

## Setup Instructions

### 1. Generate SSH Key Pair (if not already done)

```bash
# Generate RSA key
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Or generate ED25519 key (recommended)
ssh-keygen -t ed25519 -C "your-email@example.com"
```

### 2. Add Public Key to Authorized Keys

```bash
# Add to local user's authorized_keys
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys

# Or copy to remote server
ssh-copy-id user@server
```

### 3. Test Authentication

```bash
# Using the provided example script
./examples/ssh_auth_example.sh ssh

# Or manually with curl
PRIVATE_KEY=$(base64 -w 0 < ~/.ssh/id_rsa)
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$USER\",
    \"auth_type\": \"ssh_key\",
    \"private_key\": \"$PRIVATE_KEY\"
  }"
```

## Troubleshooting

### Common Issues

1. **"user does not exist"**: Ensure the username exists in the system (`/etc/passwd`)
2. **"failed to parse private key"**: Check if the key is correctly formatted and base64 encoded
3. **"private key is encrypted but no passphrase provided"**: Provide the passphrase for encrypted keys
4. **Authentication fails**: Ensure the public key is in `~/.ssh/authorized_keys`

### Debug Steps

1. Check if user exists:
   ```bash
   id username
   ```

2. Verify authorized_keys:
   ```bash
   cat ~/.ssh/authorized_keys
   ```

3. Test SSH connection locally:
   ```bash
   ssh -i ~/.ssh/id_rsa localhost
   ```

4. Check key fingerprint:
   ```bash
   ssh-keygen -lf ~/.ssh/id_rsa.pub
   ```

## Migration Guide

### For Existing Applications

1. **Update authentication flow**: Add support for `auth_type` field
2. **Handle both methods**: Keep password auth as fallback
3. **Update clients**: Modify clients to use SSH keys when available
4. **Gradual rollout**: Enable SSH auth for specific users first

### API Changes

The login endpoint now accepts an additional `auth_type` field:

**Before**:
```json
{
    "username": "john",
    "password": "secret"
}
```

**After** (backward compatible):
```json
{
    "username": "john",
    "auth_type": "password",  // or "ssh_key"
    "password": "secret",      // for password auth
    "private_key": "...",      // for ssh_key auth
    "passphrase": "..."        // optional for ssh_key
}
```

## Security Best Practices

1. **Use ED25519 keys**: More secure and faster than RSA
2. **Protect private keys**: Never share or commit private keys
3. **Use passphrases**: Always encrypt private keys with passphrases
4. **Rotate keys regularly**: Change SSH keys periodically
5. **Limit key scope**: Use different keys for different systems
6. **Monitor authentication**: Log and audit authentication attempts

## Future Enhancements

- [ ] Support for SSH certificates
- [ ] Hardware token support (YubiKey, etc.)
- [ ] Multi-factor authentication with SSH keys
- [ ] Key rotation API
- [ ] Temporary key support
- [ ] SSH agent integration
