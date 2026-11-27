import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WorkspaceServer } from '@/shared/domain';

import {
  ACTIVE_SERVER_STORAGE_KEY,
  readSavedActiveServerId,
  useServerStore,
} from './serverStore';

const makeServer = (id: string, name: string): WorkspaceServer => ({
  id,
  name,
  description: '',
  accentColor: '#5b6cff',
  visibility: 'invite',
  ownerEmail: 'admin@empresa.com',
  planTier: 'starter',
  maxMembers: null,
  maxPendingInvites: null,
  createdAt: 1,
});

const createMemoryStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => {
      data.clear();
    },
  };
};

describe('useServerStore persistence', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    const storage = createMemoryStorage();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage: storage },
    });
    useServerStore.setState({
      servers: [],
      activeServerId: 'default',
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    });
  });

  it('persists activeServerId when selecting or adding a server', () => {
    useServerStore.getState().selectServer('srv-time');
    expect(useServerStore.getState().activeServerId).toBe('srv-time');
    expect(window.localStorage.getItem(ACTIVE_SERVER_STORAGE_KEY)).toBe(
      'srv-time',
    );
    expect(readSavedActiveServerId()).toBe('srv-time');

    const added = makeServer('srv-novo', 'Novo');
    useServerStore.getState().addServer(added);
    expect(useServerStore.getState().activeServerId).toBe('srv-novo');
    expect(window.localStorage.getItem(ACTIVE_SERVER_STORAGE_KEY)).toBe(
      'srv-novo',
    );
  });

  it('preserves saved activeServerId when still available and falls back otherwise', () => {
    const srvDefault = makeServer('default', 'Escritório Virtual');
    const srvDesign = makeServer('srv-design', 'Design');

    useServerStore.getState().selectServer('srv-design');
    useServerStore.getState().setServers([srvDefault, srvDesign]);
    expect(useServerStore.getState().activeServerId).toBe('srv-design');

    // Se o servidor salvo não estiver mais na lista do usuário, volta para o primeiro disponível.
    useServerStore.getState().setServers([srvDefault]);
    expect(useServerStore.getState().activeServerId).toBe('default');
    expect(window.localStorage.getItem(ACTIVE_SERVER_STORAGE_KEY)).toBe(
      'default',
    );
  });
});
