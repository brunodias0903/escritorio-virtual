-- Fase 3: Isola mesas adotadas por servidor (permite a mesma mesa e o mesmo dono em servidores distintos)
ALTER TABLE desks
  DROP CONSTRAINT IF EXISTS desks_pkey;

ALTER TABLE desks
  ADD PRIMARY KEY (server_id, map_id, desk_id);

DROP INDEX IF EXISTS desks_owner_idx;

CREATE UNIQUE INDEX IF NOT EXISTS desks_owner_server_idx
  ON desks (server_id, owner_email);
