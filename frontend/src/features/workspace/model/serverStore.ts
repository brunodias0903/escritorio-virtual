import { create } from 'zustand';

import {
  DEFAULT_SERVER_SETTINGS,
  type ServerSettings,
  type WorkspaceServer,
} from '@/shared/domain';

export const ACTIVE_SERVER_STORAGE_KEY = 'ev.activeServerId';

export const readSavedActiveServerId = (): string => {
  try {
    const raw = window.localStorage.getItem(ACTIVE_SERVER_STORAGE_KEY)?.trim();
    if (raw) return raw;
  } catch {
    // ignore storage errors
  }
  return 'default';
};

const saveActiveServerId = (id: string): void => {
  try {
    window.localStorage.setItem(ACTIVE_SERVER_STORAGE_KEY, id);
  } catch {
    // ignore storage errors
  }
};

type ServerState = {
  settings: ServerSettings;
  servers: WorkspaceServer[];
  activeServerId: string;
  setSettings: (settings: ServerSettings) => void;
  setServers: (servers: WorkspaceServer[]) => void;
  addServer: (server: WorkspaceServer) => void;
  updateServer: (
    id: string,
    patch: Partial<
      Pick<WorkspaceServer, 'name' | 'description' | 'accentColor'>
    >,
  ) => void;
  selectServer: (id: string) => void;
};

export const useServerStore = create<ServerState>((set) => ({
  settings: DEFAULT_SERVER_SETTINGS,
  servers: [],
  activeServerId: readSavedActiveServerId(),
  setSettings: (settings) => set({ settings }),
  setServers: (servers) =>
    set((state) => {
      if (
        servers.length > 0 &&
        !servers.some((s) => s.id === state.activeServerId)
      ) {
        const fallback = servers[0]!.id;
        saveActiveServerId(fallback);
        return { servers, activeServerId: fallback };
      }
      return { servers };
    }),
  addServer: (server) => {
    saveActiveServerId(server.id);
    set((state) => ({
      servers: state.servers.some((s) => s.id === server.id)
        ? state.servers
        : [...state.servers, server],
      activeServerId: server.id,
    }));
  },
  updateServer: (id, patch) => {
    set((state) => ({
      servers: state.servers.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  },
  selectServer: (activeServerId) => {
    saveActiveServerId(activeServerId);
    set({ activeServerId });
  },
}));
