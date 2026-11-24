import { create } from 'zustand';

import { DEFAULT_SERVER_SETTINGS, type ServerSettings } from '@/shared/domain';

type ServerState = {
  settings: ServerSettings;
  setSettings: (settings: ServerSettings) => void;
};

export const useServerStore = create<ServerState>((set) => ({
  settings: DEFAULT_SERVER_SETTINGS,
  setSettings: (settings) => set({ settings }),
}));
