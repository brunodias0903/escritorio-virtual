/**
 * Fundações numéricas compartilhadas entre Web (px) e React Native (dp).
 * Nenhum valor depende do DOM.
 */

export const RADII = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 14,
  '2xl': 16,
  pill: 999,
} as const;

export const SPACING = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
} as const;

export const FONT_SIZES = {
  xs: 11,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  '2xl': 22,
} as const;

export const Z_INDEX = {
  hud: 10,
  tiles: 15,
  bar: 20,
  popup: 30,
  tooltip: 40,
  panelOverlay: 50,
  modal: 60,
} as const;
