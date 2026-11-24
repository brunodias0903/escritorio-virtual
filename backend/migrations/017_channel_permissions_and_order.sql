-- Ordem dos canais públicos, visibilidade por cargo e exceções individuais de participação
ALTER TABLE channels
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_tiers text[] NOT NULL DEFAULT ARRAY['master','admin','developer','designer','tester']::text[],
  ADD COLUMN IF NOT EXISTS allowed_emails text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS blocked_emails text[] NOT NULL DEFAULT ARRAY[]::text[];
