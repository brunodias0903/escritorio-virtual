-- Cargo de cada pessoa, e o cargo do dono de cada mesinha.
ALTER TABLE local_accounts ADD COLUMN role text NOT NULL DEFAULT '';
ALTER TABLE desks ADD COLUMN owner_role text NOT NULL DEFAULT '';
