# Spec: Preparação Nuvem (HTTPS) e Design System React Native

## ADDED Requirements

### Requirement: Production HTTPS readiness

The system SHALL operate securely behind HTTPS/WSS in production (`COMPOSE_PROFILES=prod`), including Caddy TLS termination, strict origin checks, and LiveKit media connectivity.

#### Scenario: Production health and TLS check

- **WHEN** the stack starts with `COMPOSE_PROFILES=prod` and valid `SITE_DOMAIN`
- **THEN** HTTP/WebSocket traffic is served over HTTPS/WSS with security headers and automated PostgreSQL backups active.

### Requirement: Platform-agnostic Design System tokens

The `@design-system` package SHALL keep `tokens/` and `themes/` free of Web DOM globals so they can be imported directly by both the React Web app and the future React Native app.

#### Scenario: Importing tokens without DOM

- **WHEN** a React Native or Node environment imports tokens or resolved themes from `@design-system`
- **THEN** no `window`, `document`, or CSS-only APIs are required at import time.
