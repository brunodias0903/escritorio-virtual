-- Tiers iniciais de acesso e preferência de recebimento de e-mails (LGPD opt-in).
ALTER TABLE local_accounts
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'tester';

-- NULL = conta criada antes da preferência (perguntar no próximo acesso);
-- TRUE = aceita novidades, patch notes e avisos;
-- FALSE = somente e-mails importantes (códigos de conta e alertas urgentes).
ALTER TABLE local_accounts
  ADD COLUMN IF NOT EXISTS email_marketing_opt_in BOOLEAN;
