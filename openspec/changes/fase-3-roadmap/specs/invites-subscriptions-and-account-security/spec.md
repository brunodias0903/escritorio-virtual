# Spec: Convites por Assinatura, Verificação de Nome de Usuário e Troca Segura de E-mail

## ADDED Requirements

### Requirement: Invite-gated registration and subscription seat limits

The system MUST gate new account creation on the first step of registration by verifying the user's e-mail address before allowing profile/password completion.

A new account SHALL only be permitted to register if:

1. The e-mail is present on at least one active server's invite list, OR
2. The e-mail belongs to an active subscriber initiating their first server creation.

Both the maximum number of pending/accepted invites and the maximum number of members per server MUST be enforced according to the subscriber's plan tier (e.g., starter, intermediate, pro).

#### Scenario: Invited e-mail proceeds to registration

- **WHEN** an unregistered user submits an e-mail that appears on at least one server's active invite list
- **THEN** the system allows the user to proceed to account creation and associates them with the inviting server(s) upon completion.

#### Scenario: Uninvited and non-subscriber e-mail is blocked

- **WHEN** an unregistered user submits an e-mail that is neither on any server's invite list nor associated with an active subscription
- **THEN** the system blocks registration with a clear Portuguese (BR) message explaining that an invite or subscription is required.

#### Scenario: Plan limit reached when inviting members

- **WHEN** a server owner/admin attempts to add an e-mail to the invite list or admit a member beyond their plan's seat/invite quota
- **THEN** the backend rejects the operation and informs the plan limit and upgrade path.

### Requirement: Username availability check

The system SHALL provide a rate-limited endpoint (`GET /api/auth/username-available?username=...`) so the Account modal and registration form can check if a username ("Nome de usuário") is available in real time without exposing account PII.

#### Scenario: Checking an edited username in Account settings

- **WHEN** an authenticated user edits the "Nome de usuário" field and clicks "Verificar"
- **THEN** the client queries the availability endpoint and displays whether the username is available or already in use.

### Requirement: Secure e-mail change with multi-factor protection

The system SHALL allow authenticated users to change their account e-mail only through a multi-step verification flow that protects both the legacy and new e-mail addresses and preserves MFA integrity.

#### Scenario: Changing account e-mail with active MFA

- **WHEN** an authenticated user requests an e-mail change
- **THEN** the system MUST:
  1. Require current password confirmation;
  2. Require a 6-digit verification code sent to the **old e-mail**;
  3. Require a 6-digit verification code sent to the **new e-mail**;
  4. Require an active **TOTP (app autenticador)** or **WhatsApp** MFA challenge if configured on the account.

#### Scenario: Automatic e-mail MFA unlinking on e-mail change

- **WHEN** the e-mail change is confirmed
- **THEN** the system MUST automatically unlink/disable **e-mail MFA** on the account until the user explicitly re-enables it for the new verified address, while keeping **TOTP (authenticator app)** bound to the user's account ID and rotating active sessions/tokens.
