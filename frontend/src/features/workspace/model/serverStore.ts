import { create } from 'zustand';

import {
  DEFAULT_SERVER_SETTINGS,
  type ServerSettings,
  type WorkspaceServer,
} from '@/shared/domain';

type ServerState = {
  settings: ServerSettings;
  servers: WorkspaceServer[];
  activeServerId: string;
  setSettings: (settings: ServerSettings) => void;
  setServers: (servers: WorkspaceServer[]) => void;
  addServer: (server: WorkspaceServer) => void;
  selectServer: (id: string) => void;
};

export const useServerStore = create<ServerState>((set) => ({
  settings: DEFAULT_SERVER_SETTINGS,
  servers: [],
  activeServerId: 'default',
  setSettings: (settings) => set({ settings }),
  setServers: (servers) => set({ servers }),
  addServer: (server) => {
    set((state) => ({
      servers: state.servers.some((s) => s.id === server.id)
        ? state.servers
        : [...state.servers, server],
      activeServerId: server.id,
    }));
  },
  selectServer: (activeServerId) => set({ activeServerId }),
}));
