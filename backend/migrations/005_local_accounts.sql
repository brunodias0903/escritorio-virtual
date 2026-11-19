-- Contas locais: entram com nickname e senha.
CREATE TABLE local_accounts (
  nickname_key  text PRIMARY KEY,
  nickname      text NOT NULL,
  full_name     text NOT NULL,
  email         text NOT NULL,
  password_hash text NOT NULL,
  created_at    bigint NOT NULL
);

-- Um e-mail corporativo tem uma conta só.
CREATE UNIQUE INDEX local_accounts_email_idx ON local_accounts (email);
