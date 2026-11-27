import {
  THEME_PRESETS,
  applyThemeCssVariables,
  findPreset,
  resolveThemeTokens,
  type ResolvedThemeTokens,
  type ThemeColors,
  type ThemeMode,
  type ThemePreset,
  type ThemePresetId,
} from '@design-system';
import { create } from 'zustand';

export {
  THEME_PRESETS,
  findPreset,
  resolveThemeTokens,
  type ResolvedThemeTokens,
  type ThemeColors,
  type ThemeMode,
  type ThemePreset,
  type ThemePresetId,
};

const STORAGE_KEY = 'voffice:ui-theme:v1';

const DARK_ONLY_PRESETS = new Set<ThemePresetId>([
  'default',
  'games',
  'fantasy',
  'scifi',
]);

export const supportsLightMode = (presetId: ThemePresetId): boolean =>
  !DARK_ONLY_PRESETS.has(presetId);

type SavedTheme = {
  presetId: ThemePresetId;
  mode: ThemeMode;
  colors: ThemeColors;
  customized: boolean;
};

const loadSavedTheme = (): SavedTheme => {
  const fallback = findPreset('default');
  if (typeof window === 'undefined') {
    return {
      presetId: 'default',
      mode: 'dark',
      colors: fallback.colors,
      customized: false,
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        presetId: 'default',
        mode: 'dark',
        colors: fallback.colors,
        customized: false,
      };
    }
    const parsed = JSON.parse(raw) as Partial<SavedTheme>;
    const preset = findPreset((parsed.presetId as ThemePresetId) ?? 'default');
    const mode: ThemeMode =
      supportsLightMode(preset.id) && parsed.mode === 'light'
        ? 'light'
        : 'dark';
    return {
      presetId: preset.id,
      mode,
      colors: { ...preset.colors },
      customized: false,
    };
  } catch {
    return {
      presetId: 'default',
      mode: 'dark',
      colors: fallback.colors,
      customized: false,
    };
  }
};

const persistTheme = (state: SavedTheme): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage indisponível
  }
};

const applyAndSync = (state: SavedTheme): ResolvedThemeTokens => {
  const tokens = resolveThemeTokens(
    state.presetId,
    state.colors,
    state.customized,
    state.mode,
  );
  applyThemeCssVariables(tokens);
  return tokens;
};

type ThemeStore = SavedTheme & {
  tokens: ResolvedThemeTokens;
  selectPreset: (id: ThemePresetId, mode?: ThemeMode) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  hydrate: (saved: Omit<SavedTheme, 'mode'> & { mode?: ThemeMode }) => void;
  reset: () => void;
};

const initial = loadSavedTheme();
const initialTokens = applyAndSync(initial);

export const useThemeStore = create<ThemeStore>((set) => ({
  ...initial,
  tokens: initialTokens,
  selectPreset: (id, mode) => {
    set((state) => {
      const preset = findPreset(id);
      const requestedMode = mode ?? state.mode;
      const nextMode: ThemeMode = supportsLightMode(preset.id)
        ? requestedMode
        : 'dark';
      const next: SavedTheme = {
        presetId: preset.id,
        mode: nextMode,
        colors: { ...preset.colors },
        customized: false,
      };
      const tokens = applyAndSync(next);
      persistTheme(next);
      return { ...next, tokens };
    });
  },
  setMode: (mode) => {
    set((state) => {
      const nextMode: ThemeMode = supportsLightMode(state.presetId)
        ? mode
        : 'dark';
      const next: SavedTheme = {
        ...state,
        mode: nextMode,
        customized: false,
      };
      const tokens = applyAndSync(next);
      persistTheme(next);
      return { ...next, tokens };
    });
  },
  toggleMode: () => {
    set((state) => {
      if (!supportsLightMode(state.presetId)) return state;
      const nextMode: ThemeMode = state.mode === 'dark' ? 'light' : 'dark';
      const next: SavedTheme = {
        ...state,
        mode: nextMode,
        customized: false,
      };
      const tokens = applyAndSync(next);
      persistTheme(next);
      return { ...next, tokens };
    });
  },
  hydrate: (saved) => {
    set((state) => {
      const preset = findPreset(saved.presetId);
      const fallbackMode =
        saved.mode ?? (preset.id === state.presetId ? state.mode : 'dark');
      const next: SavedTheme = {
        presetId: preset.id,
        mode:
          supportsLightMode(preset.id) && fallbackMode === 'light'
            ? 'light'
            : 'dark',
        colors: { ...preset.colors },
        customized: false,
      };
      const tokens = applyAndSync(next);
      persistTheme(next);
      return { ...next, tokens };
    });
  },
  reset: () => {
    const preset = findPreset('default');
    const next: SavedTheme = {
      presetId: 'default',
      mode: 'dark',
      colors: { ...preset.colors },
      customized: false,
    };
    const tokens = applyAndSync(next);
    persistTheme(next);
    set({ ...next, tokens });
  },
}));
