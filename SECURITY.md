# Security Policy

## Supported Versions

The `main` branch is actively supported. Security patches are released as needed.

## Reporting a Vulnerability

- Please email security@vapor.dev with details of the issue and steps to reproduce.
- Do not open public issues for security-sensitive reports.
- We will acknowledge receipt within 72 hours and provide a timeline for a fix after triage.

## Disclosure Policy

- We follow responsible disclosure. Once a fix is available, we will credit reporters (if desired) in the release notes and/or NOTICE file.

## PGP/Encryption

If you require encrypted communication, request our security PGP key in your initial email and we will respond with the public key and fingerprint.

## Hardening Recommendations

- Always set a strong JWT secret in production.
- Run the API on hardened Linux systems with least privileges and appropriate firewalling.
- Prefer TLS termination in front of the API (e.g., reverse proxy).
- Review and restrict access to WebSocket terminal features in production.
