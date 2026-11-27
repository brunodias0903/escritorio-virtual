-- Fase 3: Lista de e-mails convidados por servidor e assinantes diretos
CREATE TABLE IF NOT EXISTS server_email_invites (
  server_id text NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by text NOT NULL,
  created_at bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (server_id, email)
);

CREATE INDEX IF NOT EXISTS idx_server_email_invites_email
  ON server_email_invites (LOWER(email));

CREATE TABLE IF NOT EXISTS subscribers (
  email text PRIMARY KEY,
  plan_tier text NOT NULL DEFAULT 'starter',
  active boolean NOT NULL DEFAULT true,
  created_at bigint NOT NULL DEFAULT 0
);
