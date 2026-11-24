import {
  THEME_PRESETS,
  applyThemeCssVariables,
  findPreset,
  isHexColor,
  resolveThemeTokens,
  type ResolvedThemeTokens,
  type ThemeColors,
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
  type ThemePreset,
  type ThemePresetId,
};

const STORAGE_KEY = 'voffice:ui-theme:v1';

type SavedTheme = {
  presetId: ThemePresetId;
  colors: ThemeColors;
  customized: boolean;
};

const loadSavedTheme = (): SavedTheme => {
  const fallback = findPreset('default');
  if (typeof window === 'undefined') {
    return { presetId: 'default', colors: fallback.colors, customized: false };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        presetId: 'default',
        colors: fallback.colors,
        customized: false,
      };
    }
    const parsed = JSON.parse(raw) as Partial<SavedTheme>;
    const preset = findPreset((parsed.presetId as ThemePresetId) ?? 'default');
    const colors: ThemeColors = {
      rail: isHexColor(parsed.colors?.rail ?? '')
        ? parsed.colors!.rail
        : preset.colors.rail,
      surface: isHexColor(parsed.colors?.surface ?? '')
        ? parsed.colors!.surface
        : preset.colors.surface,
      accent: isHexColor(parsed.colors?.accent ?? '')
        ? parsed.colors!.accent
        : preset.colors.accent,
      presence: isHexColor(parsed.colors?.presence ?? '')
        ? parsed.colors!.presence
        : preset.colors.presence,
    };
    return {
      presetId: preset.id,
      colors,
      customized: Boolean(parsed.customized),
    };
  } catch {
    return { presetId: 'default', colors: fallback.colors, customized: false };
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
  );
  applyThemeCssVariables(tokens);
  return tokens;
};

type ThemeStore = SavedTheme & {
  tokens: ResolvedThemeTokens;
  selectPreset: (id: ThemePresetId) => void;
  enableCustom: () => void;
  setColor: (key: keyof ThemeColors, value: string) => void;
  hydrate: (saved: SavedTheme) => void;
  reset: () => void;
};

const initial = loadSavedTheme();
const initialTokens = applyAndSync(initial);

export const useThemeStore = create<ThemeStore>((set) => ({
  ...initial,
  tokens: initialTokens,
  selectPreset: (id) => {
    const preset = findPreset(id);
    const next: SavedTheme = {
      presetId: preset.id,
      colors: { ...preset.colors },
      customized: false,
    };
    const tokens = applyAndSync(next);
    persistTheme(next);
    set({ ...next, tokens });
  },
  enableCustom: () => {
    set((state) => {
      const next: SavedTheme = {
        presetId: state.presetId,
        colors: { ...state.colors },
        customized: true,
      };
      const tokens = applyAndSync(next);
      persistTheme(next);
      return { ...next, tokens };
    });
  },
  setColor: (key, value) => {
    if (!isHexColor(value)) return;
    set((state) => {
      const next: SavedTheme = {
        presetId: state.presetId,
        colors: { ...state.colors, [key]: value },
        customized: true,
      };
      const tokens = applyAndSync(next);
      persistTheme(next);
      return { ...next, tokens };
    });
  },
  hydrate: (saved) => {
    const preset = findPreset(saved.presetId);
    const next: SavedTheme = {
      presetId: preset.id,
      colors: {
        rail: isHexColor(saved.colors.rail)
          ? saved.colors.rail
          : preset.colors.rail,
        surface: isHexColor(saved.colors.surface)
          ? saved.colors.surface
          : preset.colors.surface,
        accent: isHexColor(saved.colors.accent)
          ? saved.colors.accent
          : preset.colors.accent,
        presence: isHexColor(saved.colors.presence)
          ? saved.colors.presence
          : preset.colors.presence,
      },
      customized: Boolean(saved.customized),
    };
    const tokens = applyAndSync(next);
    persistTheme(next);
    set({ ...next, tokens });
  },
  reset: () => {
    const preset = findPreset('default');
    const next: SavedTheme = {
      presetId: 'default',
      colors: { ...preset.colors },
      customized: false,
    };
    const tokens = applyAndSync(next);
    persistTheme(next);
    set({ ...next, tokens });
  },
}));
