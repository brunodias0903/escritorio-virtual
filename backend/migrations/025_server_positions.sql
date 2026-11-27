CREATE TABLE IF NOT EXISTS profile_server_positions (
  email text NOT NULL REFERENCES profiles(email) ON DELETE CASCADE,
  server_id text NOT NULL,
  last_map text NOT NULL,
  last_x integer NOT NULL,
  last_y integer NOT NULL,
  PRIMARY KEY (email, server_id)
);

INSERT INTO profile_server_positions (email, server_id, last_map, last_x, last_y)
SELECT email, 'default', last_map, last_x, last_y
FROM profiles
WHERE last_map IS NOT NULL AND last_x IS NOT NULL AND last_y IS NOT NULL
ON CONFLICT (email, server_id) DO NOTHING;
