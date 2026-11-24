/**
 * Fundações numéricas e de superfície compartilhadas entre Web (px) e React Native (dp).
 * Nenhum valor depende do DOM.
 */

export { FONT_SIZES } from './typography';

export const RADII = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 14,
  '2xl': 16,
  '3xl': 20,
  pill: 999,
} as const;

export const SPACING = {
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const BLUR = {
  sm: 6,
  md: 12,
  lg: 18,
} as const;

export const SIZES = {
  railWidth: 60,
  railBtn: 42,
  controlSm: 30,
  controlMd: 36,
  controlLg: 44,
  sidebarMin: 280,
  sidebarDefault: 340,
  sidebarMax: 520,
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
