-- Configurações do servidor atual (nome, foto, descrição, boas-vindas e permissões por canal)
CREATE TABLE IF NOT EXISTS server_settings (
  id text PRIMARY KEY DEFAULT 'default',
  name text NOT NULL DEFAULT 'Setter',
  description text NOT NULL DEFAULT 'Escritório virtual interativo da equipe',
  icon text,
  welcome_message text NOT NULL DEFAULT '',
  allow_public_registration boolean NOT NULL DEFAULT true,
  updated_at bigint NOT NULL DEFAULT 0,
  updated_by text
);

INSERT INTO server_settings (id, name, description, welcome_message, allow_public_registration, updated_at)
VALUES ('default', 'Setter', 'Escritório virtual interativo da equipe', '', true, 0)
ON CONFLICT (id) DO NOTHING;

-- Tópico e tiers autorizados a enviar mensagens em cada canal público
ALTER TABLE channels
  ADD COLUMN IF NOT EXISTS topic text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS write_tiers text[] NOT NULL DEFAULT ARRAY['master','admin','developer','designer','tester']::text[];

-- Central de feedback, reclamações, dúvidas e sugestões com vínculo opcional de MR
CREATE TABLE IF NOT EXISTS feedback_items (
  id text PRIMARY KEY,
  kind text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  author_email text NOT NULL,
  author_name text NOT NULL,
  mr_url text,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  updated_by text
);

CREATE INDEX IF NOT EXISTS idx_feedback_items_updated_at
  ON feedback_items (updated_at DESC);

CREATE TABLE IF NOT EXISTS feedback_comments (
  id text PRIMARY KEY,
  feedback_id text NOT NULL REFERENCES feedback_items(id) ON DELETE CASCADE,
  author_email text NOT NULL,
  author_name text NOT NULL,
  author_tier text NOT NULL DEFAULT 'tester',
  body text NOT NULL,
  created_at bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_comments_feedback_id
  ON feedback_comments (feedback_id, created_at ASC);
