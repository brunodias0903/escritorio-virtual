-- Controle de verificação de e-mail para contas existentes e novas,
-- além da persistência do tema de interface escolhido pelo usuário.
ALTER TABLE local_accounts
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE local_accounts
  ADD COLUMN IF NOT EXISTS ui_theme TEXT;
