# Spec: MFA por WhatsApp

## ADDED Requirements

### Requirement: WhatsApp Business Cloud API OTP delivery

The system SHALL support sending 2FA verification codes via WhatsApp Business Cloud API when configured, while keeping E-mail and TOTP MFA free and operational in V1.

#### Scenario: Enrolling a phone number for WhatsApp MFA

- **WHEN** an authenticated user enters a valid E.164 phone number in `AccountModal` and verifies the received OTP
- **THEN** WhatsApp MFA is enabled for that account.

#### Scenario: Rate limiting and fallback

- **WHEN** a user requests WhatsApp OTP codes above the configured rate limit or the provider fails
- **THEN** the system throttles excessive requests and allows fallback to configured free MFA methods (TOTP or E-mail).
