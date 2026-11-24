/**
 * Lê ALLOWED_ORIGINS: lista separada por vírgula.
 * Aceita origens exatas e curinga de subdomínio (ex.: https://*.trycloudflare.com).
 */
export const parseAllowedOrigins = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

const WILDCARD_PREFIX = /^([a-z][a-z0-9+.-]*):\/\/\*\.(.+)$/i;
const PLACEHOLDER_SUBDOMAIN = 'wildcard-check.';

type WildcardPattern = {
  protocol: string;
  baseHost: string;
  port: string;
};

const parseWildcardPattern = (pattern: string): WildcardPattern | null => {
  const match = WILDCARD_PREFIX.exec(pattern);
  if (!match) return null;
  const [, scheme, rest] = match;
  if (!scheme || !rest || rest.includes('*')) return null;

  try {
    const url = new URL(`${scheme}://${PLACEHOLDER_SUBDOMAIN}${rest}`);
    if (
      url.pathname !== '/' ||
      url.search !== '' ||
      url.hash !== '' ||
      url.username !== '' ||
      url.password !== ''
    ) {
      return null;
    }
    const baseHost = url.hostname.slice(PLACEHOLDER_SUBDOMAIN.length);
    if (!baseHost || baseHost.startsWith('.')) return null;
    return { protocol: url.protocol, baseHost, port: url.port };
  } catch {
    return null;
  }
};

const matchesWildcardOrigin = (origin: string, pattern: string): boolean => {
  const parsed = parseWildcardPattern(pattern);
  if (!parsed) return false;

  try {
    const url = new URL(origin);
    if (
      url.pathname !== '/' ||
      url.search !== '' ||
      url.hash !== '' ||
      url.username !== '' ||
      url.password !== '' ||
      origin.endsWith('/')
    ) {
      return false;
    }
    if (url.protocol !== parsed.protocol || url.port !== parsed.port) {
      return false;
    }
    const suffix = `.${parsed.baseHost}`;
    return url.hostname.endsWith(suffix) && url.hostname.length > suffix.length;
  } catch {
    return false;
  }
};

const matchesOrigin = (origin: string, pattern: string): boolean =>
  pattern.includes('*')
    ? matchesWildcardOrigin(origin, pattern)
    : pattern === origin;

/**
 * Impede que outro site abra uma conexão em nome do usuário logado no
 * navegador. Sem lista configurada, qualquer origem passa (desenvolvimento).
 * Clientes sem cabeçalho Origin (app nativo) também passam: o cabeçalho só
 * protege contra navegadores.
 */
export const isOriginAllowed = (
  origin: string | undefined,
  allowed: readonly string[],
): boolean =>
  allowed.length === 0 ||
  !origin ||
  allowed.some((pattern) => matchesOrigin(origin, pattern));
