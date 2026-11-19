-- Canais (públicos e conversas diretas), respostas em conversas, menções,
-- leitura por pessoa e perfis (aparência e diretório para conversas diretas).

CREATE TABLE channels (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  kind       text NOT NULL CHECK (kind IN ('public', 'dm')),
  archived   boolean NOT NULL DEFAULT false,
  created_by text,
  created_at bigint NOT NULL
);

INSERT INTO channels (id, name, kind, created_at) VALUES
  ('geral', 'geral', 'public', 0),
  ('projetos', 'projetos', 'public', 0),
  ('aleatorio', 'aleatorio', 'public', 0);

ALTER TABLE chat_messages ADD COLUMN thread_id text;
ALTER TABLE chat_messages ADD COLUMN mentions text NOT NULL DEFAULT '[]';

CREATE INDEX chat_messages_thread_idx ON chat_messages (thread_id, at);

CREATE TABLE read_state (
  email        text NOT NULL,
  channel      text NOT NULL,
  last_read_at bigint NOT NULL,
  PRIMARY KEY (email, channel)
);

CREATE TABLE profiles (
  email      text PRIMARY KEY,
  name       text NOT NULL,
  appearance text,
  last_seen  bigint NOT NULL
);
