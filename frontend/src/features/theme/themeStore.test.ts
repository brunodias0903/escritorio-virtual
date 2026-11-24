import { describe, expect, it } from 'vitest';

import { THEME_PRESETS, findPreset, useThemeStore } from './themeStore';

describe('themeStore', () => {
  it('expõe os 4 temas (padrão + 3 temáticos)', () => {
    expect(THEME_PRESETS.map((p) => p.id)).toEqual([
      'default',
      'games',
      'fantasy',
      'scifi',
    ]);
    expect(findPreset('games').name).toBe('Modo Arcade');
  });

  it('troca de tema, aplica cor personalizada e restaura o padrão', () => {
    useThemeStore.getState().selectPreset('fantasy');
    expect(useThemeStore.getState().presetId).toBe('fantasy');
    expect(useThemeStore.getState().customized).toBe(false);

    useThemeStore.getState().enableCustom();
    expect(useThemeStore.getState().customized).toBe(true);

    useThemeStore.getState().setColor('accent', '#ff5500');
    expect(useThemeStore.getState().customized).toBe(true);
    expect(useThemeStore.getState().colors.accent).toBe('#ff5500');

    // Ignora valores que não são hex válidos.
    useThemeStore.getState().setColor('accent', 'not-a-color');
    expect(useThemeStore.getState().colors.accent).toBe('#ff5500');

    useThemeStore.getState().reset();
    expect(useThemeStore.getState().presetId).toBe('default');
    expect(useThemeStore.getState().customized).toBe(false);
  });
});
