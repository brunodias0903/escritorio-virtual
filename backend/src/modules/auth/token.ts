import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const SessionClaimsSchema = z.object({
  email: z.string(),
  /** Nome completo (o que aparece). */
  name: z.string(),
  admin: z.boolean(),
  kind: z.enum(['company', 'third_party']),
  nickname: z.string().default(''),
  role: z.string().default(''),
  /** Identifica esta sessão, para poder encerrá-la antes de vencer. */
  jti: z.string(),
  exp: z.number(), // segundos desde 1970
});
export type SessionClaims = z.infer<typeof SessionClaimsSchema>;

const encode = (value: object): string =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

const sign = (data: string, secret: string): Buffer =>
  createHmac('sha256', secret).update(data).digest();

/** Token no formato JWT (HS256), assinado com o segredo do servidor. */
export const signSession = (
  claims: Omit<SessionClaims, 'exp' | 'jti' | 'nickname' | 'role'> &
    Partial<Pick<SessionClaims, 'nickname' | 'role'>>,
  secret: string,
  ttlSeconds: number,
  nowMs: number = Date.now(),
): string => {
  const exp = Math.floor(nowMs / 1000) + ttlSeconds;
  const data = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ ...claims, jti: randomUUID(), exp })}`;
  return `${data}.${sign(data, secret).toString('base64url')}`;
};

export const verifySession = (
  token: string,
  secret: string,
  nowMs: number = Date.now(),
): SessionClaims | null => {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts as [string, string, string];

  const expected = sign(`${header}.${payload}`, secret);
  const received = Buffer.from(signature, 'base64url');
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return null;
  }

  try {
    const claims = SessionClaimsSchema.safeParse(
      JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')),
    );
    if (!claims.success || claims.data.exp <= Math.floor(nowMs / 1000)) {
      return null;
    }
    return claims.data;
  } catch {
    return null;
  }
};
