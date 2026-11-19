-- Contas de terceiros e solicitações de conta.
CREATE TABLE users (
  email         text PRIMARY KEY,
  name          text NOT NULL,
  company       text NOT NULL,
  reason        text NOT NULL DEFAULT '',
  password_hash text NOT NULL,
  status        text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    bigint NOT NULL,
  decided_by    text,
  decided_at    bigint
);

CREATE INDEX users_status_created_idx ON users (status, created_at);

-- Histórico do chat.
CREATE TABLE chat_messages (
  id        text PRIMARY KEY,
  channel   text NOT NULL,
  author_id text NOT NULL,
  author    text NOT NULL,
  color     integer NOT NULL,
  text      text NOT NULL,
  at        bigint NOT NULL
);

CREATE INDEX chat_messages_channel_at_idx ON chat_messages (channel, at DESC);
