const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Em desenvolvimento o servidor informa o LiveKit como `ws://localhost:5002`.
 * Quem abre o app por outro endereço (o IP do computador, no celular) precisa
 * falar com o mesmo computador, não com o próprio aparelho.
 */
export const resolveMediaUrl = (url: string, pageHost: string): string => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (
    !LOCAL_HOSTS.has(parsed.hostname) ||
    LOCAL_HOSTS.has(pageHost) ||
    !pageHost
  ) {
    return url;
  }
  parsed.hostname = pageHost;
  return parsed.toString().replace(/\/$/, '');
};
