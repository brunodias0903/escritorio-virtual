/** Lê ALLOWED_ORIGINS: lista separada por vírgula, ex.: https://virtual-office.exemplo.com */
export const parseAllowedOrigins = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

/**
 * Impede que outro site abra uma conexão em nome do usuário logado no
 * navegador. Sem lista configurada, qualquer origem passa (desenvolvimento).
 * Clientes sem cabeçalho Origin (app nativo) também passam: o cabeçalho só
 * protege contra navegadores.
 */
export const isOriginAllowed = (
  origin: string | undefined,
  allowed: readonly string[],
): boolean => allowed.length === 0 || !origin || allowed.includes(origin);
