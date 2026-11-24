-- Método de MFA ativo na conta ('none', 'email', 'totp')
ALTER TABLE local_accounts
  ADD COLUMN IF NOT EXISTS mfa_method text NOT NULL DEFAULT 'none';

UPDATE local_accounts
SET mfa_method = 'totp'
WHERE mfa_enabled = true AND mfa_method = 'none';
