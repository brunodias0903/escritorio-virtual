import { SessionSchema, type Session } from '@/shared/domain';

import { isExpired } from '@/shared/lib/jwt';

/** Onde a sessão fica guardada (ex.: localStorage no navegador). */
export type StorageBackend = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
};

const KEY = 'escritorio-virtual.session';

/** Guarda a sessão para sobreviver a recarregar a página ou fechar o app. */
export const createSessionStorage = (
  backend: StorageBackend,
  now: () => number = Date.now,
) => ({
  /** Devolve a sessão guardada, ou null se não há, está corrompida ou venceu. */
  async load(): Promise<Session | null> {
    let raw: string | null;
    try {
      raw = await backend.get(KEY);
    } catch {
      return null;
    }
    if (!raw) return null;

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      await backend.remove(KEY).catch(() => {});
      return null;
    }
    const parsed = SessionSchema.safeParse(data);
    if (!parsed.success || isExpired(parsed.data.token, now())) {
      await backend.remove(KEY).catch(() => {});
      return null;
    }
    return parsed.data;
  },

  async save(session: Session): Promise<void> {
    await backend.set(KEY, JSON.stringify(session)).catch(() => {});
  },

  async clear(): Promise<void> {
    await backend.remove(KEY).catch(() => {});
  },
});

export type SessionStorage = ReturnType<typeof createSessionStorage>;
