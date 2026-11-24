import type { Session } from '@/shared/domain';
import { describe, expect, it } from 'vitest';
import { createSessionStorage, type StorageBackend } from './sessionStorage';

const NOW = 1_800_000_000_000;

const jwt = (exp: number) =>
  `h.${btoa(JSON.stringify({ exp })).replace(/=+$/, '')}.s`;

const session = (exp = NOW / 1000 + 3600): Session => ({
  token: jwt(exp),
  user: {
    email: 'ana@empresa.com',
    name: 'Ana',
    admin: false,
    kind: 'company',
    tier: 'tester',
    nickname: 'ana',
    role: '',
  },
});

const memoryBackend = (): StorageBackend & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    get: async (key) => data.get(key) ?? null,
    set: async (key, value) => void data.set(key, value),
    remove: async (key) => void data.delete(key),
  };
};

describe('sessionStorage', () => {
  it('guarda e recupera a sessão', async () => {
    const storage = createSessionStorage(memoryBackend(), () => NOW);
    expect(await storage.load()).toBeNull();
    await storage.save(session());
    expect(await storage.load()).toEqual(session());
  });

  it('descarta e apaga a sessão vencida', async () => {
    const backend = memoryBackend();
    const storage = createSessionStorage(backend, () => NOW);
    await storage.save(session(NOW / 1000 - 10));
    expect(await storage.load()).toBeNull();
    expect(backend.data.size).toBe(0);
  });

  it('descarta dados corrompidos ou com formato errado', async () => {
    const backend = memoryBackend();
    const storage = createSessionStorage(backend, () => NOW);
    backend.data.set('escritorio-virtual.session', 'não é json');
    expect(await storage.load()).toBeNull();
    expect(backend.data.size).toBe(0);

    backend.data.set(
      'escritorio-virtual.session',
      JSON.stringify({ token: 1 }),
    );
    expect(await storage.load()).toBeNull();
    expect(backend.data.size).toBe(0);
  });

  it('limpa ao sair', async () => {
    const storage = createSessionStorage(memoryBackend(), () => NOW);
    await storage.save(session());
    await storage.clear();
    expect(await storage.load()).toBeNull();
  });

  it('não quebra quando o armazenamento falha', async () => {
    const broken: StorageBackend = {
      get: async () => {
        throw new Error('sem acesso');
      },
      set: async () => {
        throw new Error('sem acesso');
      },
      remove: async () => {
        throw new Error('sem acesso');
      },
    };
    const storage = createSessionStorage(broken, () => NOW);
    expect(await storage.load()).toBeNull();
    await expect(storage.save(session())).resolves.toBeUndefined();
    await expect(storage.clear()).resolves.toBeUndefined();
  });
});
