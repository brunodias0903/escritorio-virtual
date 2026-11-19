import { describe, expect, it } from 'vitest';
import { isOriginAllowed, parseAllowedOrigins } from './origin.js';

describe('parseAllowedOrigins', () => {
  it('separa por vírgula e ignora vazios', () => {
    expect(parseAllowedOrigins(' https://a.com , ,https://b.com ')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });

  it('devolve lista vazia sem valor', () => {
    expect(parseAllowedOrigins(undefined)).toEqual([]);
  });
});

describe('isOriginAllowed', () => {
  const allowed = ['https://virtual-office.exemplo.com'];

  it('aceita qualquer origem sem lista configurada', () => {
    expect(isOriginAllowed('https://outro.com', [])).toBe(true);
  });

  it('aceita origem da lista e clientes sem Origin', () => {
    expect(isOriginAllowed('https://virtual-office.exemplo.com', allowed)).toBe(
      true,
    );
    expect(isOriginAllowed(undefined, allowed)).toBe(true);
    expect(isOriginAllowed('', allowed)).toBe(true);
  });

  it('recusa origem fora da lista', () => {
    expect(isOriginAllowed('https://mal.com', allowed)).toBe(false);
  });
});
