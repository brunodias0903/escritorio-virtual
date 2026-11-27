-- Fase 3: Multi-servidor, membros por servidor e convites
CREATE TABLE IF NOT EXISTS servers (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  accent_color text NOT NULL DEFAULT '#5b6cff',
  visibility text NOT NULL DEFAULT 'invite',
  owner_email text NOT NULL,
  created_at bigint NOT NULL DEFAULT 0
);

INSERT INTO servers (id, name, description, accent_color, visibility, owner_email, created_at)
VALUES ('default', 'Setter', 'Escritório virtual interativo da equipe', '#5b6cff', 'open', 'system@local', 0)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS server_members (
  server_id text NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (server_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_server_members_user_email
  ON server_members (user_email);

CREATE TABLE IF NOT EXISTS server_invites (
  code text PRIMARY KEY,
  server_id text NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  created_by text NOT NULL,
  max_uses integer,
  uses integer NOT NULL DEFAULT 0,
  expires_at bigint,
  revoked boolean NOT NULL DEFAULT false,
  created_at bigint NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_server_invites_server_id
  ON server_invites (server_id, created_at DESC);
