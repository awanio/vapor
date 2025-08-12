# Contributing to Vapor

Thank you for your interest in contributing! We welcome issues, bug fixes, features, and documentation improvements.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

- Linux is required for development and testing.
- See the project [README](README.md) and [development/README.md](development/README.md) for environment setup.

### Prerequisites
- Go 1.21+
- Docker (for dev environment) or a Linux host with required packages

### Development Workflow
1. Fork the repository and create your branch from `main`:
   - `git checkout -b feature/my-change`
2. Run tests and linters:
   - `make test`
   - `make lint`
3. Format your code:
   - `make fmt`
4. Ensure commits are clear and incremental. Reference issues when applicable (e.g., "Fixes #123").
5. Open a Pull Request (PR) against `main` and fill in the template.

## Commit Sign-off (DCO)

We use the Developer Certificate of Origin (DCO). Each commit must be signed off:

```
Signed-off-by: Your Name <your.email@example.com>
```

Use `git commit -s` to add this automatically.

## Testing
- Add unit tests or integration tests where appropriate.
- For changes impacting system operations (network/storage), prefer running within the provided dev environment.

## Documentation
- Update `README.md`, `docs/`, and OpenAPI spec (`openapi.yaml`) as needed.
- Include examples and migration notes if behavior changes.

## Coding Standards
- Follow Go best practices and existing project patterns.
- Keep functions small and focused.
- Prefer composition over inheritance. Avoid unnecessary global state.

## Security
- Do not include secrets in code or tests.
- Report vulnerabilities via our [Security Policy](SECURITY.md).

## Review Process
- At least one maintainer approval is required.
- CI must pass before merging.
- Maintainers may request changes; please be responsive.

## Release Notes
- For user-visible changes, include a brief note in the PR description to aid release notes.

Thanks for contributing to Vapor!
