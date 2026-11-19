/** Lê o `exp` (segundos desde 1970) de um token JWT, sem conferir assinatura. */
export const jwtExpiry = (token: string): number | null => {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const claims: unknown = JSON.parse(json);
    const exp = (claims as { exp?: unknown }).exp;
    return typeof exp === 'number' ? exp : null;
  } catch {
    return null;
  }
};

/** Vale como vencido sem `exp` legível. Quem decide de verdade é o servidor. */
export const isExpired = (
  token: string,
  nowMs: number = Date.now(),
): boolean => {
  const exp = jwtExpiry(token);
  return exp === null || exp * 1000 <= nowMs;
};
