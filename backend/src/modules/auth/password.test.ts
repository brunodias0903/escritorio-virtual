import { describe, expect, it } from 'vitest';
import {
  hashPassword,
  verifyAgainstDummy,
  verifyPassword,
} from './password.js';

describe('password', () => {
  it('aceita a senha certa e recusa a errada', async () => {
    const hash = await hashPassword('uma-senha-longa-123');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('uma-senha-longa-123', hash)).toBe(true);
    expect(await verifyPassword('outra-senha-123', hash)).toBe(false);
  });

  it('gera hashes diferentes para a mesma senha (sal aleatório)', async () => {
    const [a, b] = await Promise.all([
      hashPassword('abc12345678'),
      hashPassword('abc12345678'),
    ]);
    expect(a).not.toBe(b);
  });

  it('recusa hashes malformados', async () => {
    expect(await verifyPassword('x', 'texto-qualquer')).toBe(false);
    expect(await verifyPassword('x', 'scrypt$a$b$c$d$e')).toBe(false);
    expect(await verifyPassword('x', 'scrypt$0$8$1$AAAA$AAAA')).toBe(false);
    expect(await verifyPassword('x', 'scrypt$3$8$1$AAAA$AAAA')).toBe(false);
  });

  it('a conferência falsa sempre recusa', async () => {
    expect(await verifyAgainstDummy('qualquer')).toBe(false);
    expect(await verifyAgainstDummy('qualquer')).toBe(false);
  });
});
