-- Inclusão (identidade de gênero e pronomes opcionais) e recursos de acessibilidade (LBI / WCAG / LGPD Art. 11)
ALTER TABLE local_accounts
  ADD COLUMN IF NOT EXISTS gender_identity text NOT NULL DEFAULT 'prefer_not_to_say',
  ADD COLUMN IF NOT EXISTS pronouns text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS accessibility_needs text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS accessibility_prefs text;
