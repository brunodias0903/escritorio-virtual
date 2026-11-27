-- Fase 3: Planos/limites por servidor (servidor 'default' irrestrito para testes) e escopo por server_id
ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS max_members integer,
  ADD COLUMN IF NOT EXISTS max_pending_invites integer;

UPDATE servers
SET
  plan_tier = 'unlimited',
  max_members = NULL,
  max_pending_invites = NULL
WHERE id = 'default';

ALTER TABLE channels
  ADD COLUMN IF NOT EXISTS server_id text NOT NULL DEFAULT 'default';

ALTER TABLE desks
  ADD COLUMN IF NOT EXISTS server_id text NOT NULL DEFAULT 'default';

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS server_id text NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS idx_channels_server_id ON channels (server_id);
CREATE INDEX IF NOT EXISTS idx_desks_server_id ON desks (server_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_server_id ON chat_messages (server_id);
