-- Autenticação em duas etapas (MFA / TOTP compatível com Google Authenticator, Microsoft Authenticator e similares)
ALTER TABLE local_accounts
  ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mfa_secret_enc text,
  ADD COLUMN IF NOT EXISTS mfa_recovery_hashes text[] NOT NULL DEFAULT ARRAY[]::text[];
