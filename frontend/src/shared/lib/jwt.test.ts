import { describe, expect, it } from 'vitest';
import { isExpired, jwtExpiry } from './jwt';

const encode = (value: object) =>
  btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const token = (claims: object) => `h.${encode(claims)}.s`;

describe('jwtExpiry', () => {
  it('lê o exp', () => {
    expect(jwtExpiry(token({ exp: 1_900_000_000 }))).toBe(1_900_000_000);
  });

  it('devolve null para lixo, sem exp ou exp inválido', () => {
    expect(jwtExpiry('abc')).toBeNull();
    expect(jwtExpiry('h.@@@.s')).toBeNull();
    expect(jwtExpiry(token({ nome: 'x' }))).toBeNull();
    expect(jwtExpiry(token({ exp: 'amanhã' }))).toBeNull();
  });
});

describe('isExpired', () => {
  const now = 1_800_000_000_000;

  it('vale antes do exp e vence depois', () => {
    expect(isExpired(token({ exp: now / 1000 + 60 }), now)).toBe(false);
    expect(isExpired(token({ exp: now / 1000 }), now)).toBe(true);
    expect(isExpired(token({ exp: now / 1000 - 1 }), now)).toBe(true);
  });

  it('trata token ilegível como vencido', () => {
    expect(isExpired('lixo', now)).toBe(true);
  });
});
