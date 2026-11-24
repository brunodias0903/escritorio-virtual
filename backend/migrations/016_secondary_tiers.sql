-- Cargos secundários por conta (modelo multi-cargo estilo Discord: 1 principal em `tier` + secundários em `secondary_tiers`)
ALTER TABLE local_accounts
  ADD COLUMN IF NOT EXISTS secondary_tiers text[] NOT NULL DEFAULT ARRAY[]::text[];
