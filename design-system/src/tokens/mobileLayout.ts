/**
 * Tokens e contrato de navegação da interface Mobile, compartilhados entre
 * Web (px) e o futuro app React Native (dp).
 */

export const MOBILE_NAV_TABS = [
  { id: 'map', label: 'Mapa' },
  { id: 'chat', label: 'Chat' },
  { id: 'people', label: 'Pessoas' },
  { id: 'account', label: 'Conta' },
] as const;

export type MobileNavTab = (typeof MOBILE_NAV_TABS)[number]['id'];

export const MOBILE_BREAKPOINTS = {
  /** Abaixo desta largura (em retrato), ativa o shell mobile com Bottom Navigation. */
  maxPortraitWidth: 820,
  /** Abaixo desta altura (em paisagem), ativa o shell mobile com rail lateral compacta. */
  maxLandscapeHeight: 540,
} as const;

export const MOBILE_METRICS = {
  bottomNavHeight: 54,
  landscapeRailWidth: 56,
  topBarHeight: 40,
  callBarHeight: 48,
  callButtonSize: 36,
  joystickSizePortrait: 112,
  joystickSizeLandscape: 96,
  joystickKnobPortrait: 44,
  joystickKnobLandscape: 38,
  joystickIdleOpacity: 0.38,
  joystickActiveOpacity: 0.88,
  pipWidthPortrait: 92,
  pipHeightPortrait: 122,
  pipWidthLandscape: 116,
  pipHeightLandscape: 74,
} as const;

export const isMobileViewport = (width: number, height: number): boolean =>
  width < MOBILE_BREAKPOINTS.maxPortraitWidth ||
  height < MOBILE_BREAKPOINTS.maxLandscapeHeight;

export const isMobileLandscape = (width: number, height: number): boolean =>
  width > height && height < MOBILE_BREAKPOINTS.maxLandscapeHeight;
