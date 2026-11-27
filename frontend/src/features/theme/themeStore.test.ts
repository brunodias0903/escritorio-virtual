import { describe, expect, it } from 'vitest';

import { THEME_PRESETS, findPreset, useThemeStore } from './themeStore';

describe('themeStore', () => {
  it('expõe os 11 presets (4 clássicos + 7 escalas de cor)', () => {
    expect(THEME_PRESETS.map((p) => p.id)).toEqual([
      'default',
      'games',
      'fantasy',
      'scifi',
      'violet',
      'emerald',
      'sapphire',
      'sunset',
      'amethyst',
      'rose',
      'monochrome',
    ]);
    expect(findPreset('games').name).toBe('Arcade');
    expect(findPreset('violet').name).toBe('Violeta');
    expect(findPreset('emerald').name).toBe('Esmeralda');
    expect(findPreset('sapphire').name).toBe('Safira');
    expect(findPreset('sunset').name).toBe('Pôr do sol');
    expect(findPreset('amethyst').name).toBe('Ametista');
    expect(findPreset('rose').name).toBe('Rosa');
    expect(findPreset('monochrome').name).toBe('Monocromático');
  });

  it('troca de preset, alterna entre claro e escuro e restaura o padrão', () => {
    useThemeStore.getState().selectPreset('sapphire', 'light');
    expect(useThemeStore.getState().presetId).toBe('sapphire');
    expect(useThemeStore.getState().mode).toBe('light');
    expect(useThemeStore.getState().customized).toBe(false);

    useThemeStore.getState().toggleMode();
    expect(useThemeStore.getState().mode).toBe('dark');

    useThemeStore.getState().setMode('light');
    expect(useThemeStore.getState().mode).toBe('light');

    // Os 4 temas iniciais permanecem apenas no modo escuro.
    useThemeStore.getState().selectPreset('games', 'light');
    expect(useThemeStore.getState().mode).toBe('dark');

    // Hidratação preserva modo claro quando informado ou já ativo no mesmo preset.
    useThemeStore.getState().selectPreset('violet', 'light');
    useThemeStore.getState().hydrate({
      presetId: 'violet',
      colors: findPreset('violet').colors,
      customized: false,
    });
    expect(useThemeStore.getState().mode).toBe('light');

    useThemeStore.getState().hydrate({
      presetId: 'emerald',
      mode: 'light',
      colors: findPreset('emerald').colors,
      customized: false,
    });
    expect(useThemeStore.getState().presetId).toBe('emerald');
    expect(useThemeStore.getState().mode).toBe('light');

    useThemeStore.getState().reset();
    expect(useThemeStore.getState().presetId).toBe('default');
    expect(useThemeStore.getState().mode).toBe('dark');
    expect(useThemeStore.getState().customized).toBe(false);
  });
});
