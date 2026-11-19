-- Mesinhas adotadas e a decoração de cada uma.
CREATE TABLE desks (
  map_id      text NOT NULL,
  desk_id     text NOT NULL,
  owner_email text NOT NULL,
  owner_name  text NOT NULL,
  config      text NOT NULL,
  updated_at  bigint NOT NULL,
  PRIMARY KEY (map_id, desk_id)
);

-- Cada pessoa adota uma mesa só.
CREATE UNIQUE INDEX desks_owner_idx ON desks (owner_email);
