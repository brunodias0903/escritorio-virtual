-- Onde cada pessoa estava ao sair, para voltar ao mesmo lugar ao entrar de novo.
ALTER TABLE profiles
  ADD COLUMN last_map text,
  ADD COLUMN last_x integer,
  ADD COLUMN last_y integer;
