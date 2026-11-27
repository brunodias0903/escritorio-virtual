-- Fase 3: Cargos individuais por servidor (sem vazar cargo de outro servidor) e cargo padrão 'member'
ALTER TABLE server_members
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS secondary_tiers text[] NOT NULL DEFAULT '{}';

UPDATE server_members
SET tier = 'admin'
WHERE role = 'owner' AND tier = 'member';
