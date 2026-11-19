import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { signSession, verifySession } from './token.js';

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres';
const claims = {
  email: 'ana@empresa.com',
  name: 'Ana',
  admin: false,
  kind: 'company' as const,
};
const NOW = 1_800_000_000_000;

describe('token de sessão', () => {
  it('assina e verifica', () => {
    const token = signSession(claims, SECRET, 60, NOW);
    expect(verifySession(token, SECRET, NOW)).toMatchObject(claims);
  });

  it('recusa token expirado', () => {
    const token = signSession(claims, SECRET, 60, NOW);
    expect(verifySession(token, SECRET, NOW + 61_000)).toBeNull();
  });

  it('recusa segredo diferente e assinatura adulterada', () => {
    const token = signSession(claims, SECRET, 60, NOW);
    expect(verifySession(token, `${SECRET}x`, NOW)).toBeNull();
    const [h, p, s] = token.split('.') as [string, string, string];
    expect(
      verifySession(`${h}.${p}.${s.slice(0, -2)}AA`, SECRET, NOW),
    ).toBeNull();
  });

  it('recusa dados alterados com a assinatura antiga', () => {
    const token = signSession(claims, SECRET, 60, NOW);
    const [h, , s] = token.split('.') as [string, string, string];
    const forged = Buffer.from(
      JSON.stringify({ ...claims, admin: true, exp: NOW / 1000 + 60 }),
    ).toString('base64url');
    expect(verifySession(`${h}.${forged}.${s}`, SECRET, NOW)).toBeNull();
  });

  it('recusa lixo e conteúdo com formato errado', () => {
    expect(verifySession('abc', SECRET, NOW)).toBeNull();
    const body = Buffer.from('não é json').toString('base64url');
    const signature = createHmac('sha256', SECRET)
      .update(`h.${body}`)
      .digest('base64url');
    expect(verifySession(`h.${body}.${signature}`, SECRET, NOW)).toBeNull();
    const wrong = Buffer.from(JSON.stringify({ email: 1 })).toString(
      'base64url',
    );
    const sig2 = createHmac('sha256', SECRET)
      .update(`h.${wrong}`)
      .digest('base64url');
    expect(verifySession(`h.${wrong}.${sig2}`, SECRET, NOW)).toBeNull();
  });
});
