import {
  createSessionStorage,
  type StorageBackend,
} from '@/features/session/api/sessionStorage';

// Sessão guardada no localStorage (vale 12 horas e pode ser encerrada no servidor).
const webBackend: StorageBackend = {
  get: async (key) => window.localStorage.getItem(key),
  set: async (key, value) => window.localStorage.setItem(key, value),
  remove: async (key) => window.localStorage.removeItem(key),
};

export const sessionStorage = createSessionStorage(webBackend);
