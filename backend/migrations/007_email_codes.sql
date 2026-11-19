-- Códigos de confirmação enviados por e-mail (criar conta e esqueci a senha).
-- Guarda só o hash do código. Um código vivo por e-mail e por uso.
CREATE TABLE email_codes (
  email      text NOT NULL,
  purpose    text NOT NULL,
  code_hash  text NOT NULL,
  expires_at bigint NOT NULL,
  sent_at    bigint NOT NULL,
  attempts   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (email, purpose)
);
