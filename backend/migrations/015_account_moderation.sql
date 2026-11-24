-- Moderação de contas (banimento permanente e restrição temporária)
ALTER TABLE local_accounts
  ADD COLUMN IF NOT EXISTS banned_at bigint,
  ADD COLUMN IF NOT EXISTS ban_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS restricted_until bigint,
  ADD COLUMN IF NOT EXISTS restriction_reason text NOT NULL DEFAULT '';
