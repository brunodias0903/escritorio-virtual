-- Conformidade ECA (uso profissional 18+) e LGPD (registro de aceite de termos)
ALTER TABLE local_accounts
  ADD COLUMN IF NOT EXISTS terms_accepted_at bigint;
