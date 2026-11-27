import {
  createFont,
  createShorthands,
  createTamagui,
  createTokens,
} from 'tamagui';

import { THEME_PRESETS, type ThemePresetId } from './themes/presets';
import {
  resolveThemeTokens,
  type ResolvedThemeTokens,
} from './themes/resolveTheme';
import { RADII, SIZES, SPACING, Z_INDEX } from './tokens/foundations';
import { MOBILE_BREAKPOINTS } from './tokens/mobileLayout';
import {
  FONT_FAMILIES,
  FONT_SIZES,
  FONT_WEIGHTS,
  LINE_HEIGHTS,
} from './tokens/typography';

const fontSizeScale = {
  1: FONT_SIZES['2xs'],
  2: FONT_SIZES.xs,
  3: FONT_SIZES.sm,
  4: FONT_SIZES.base,
  true: FONT_SIZES.md,
  5: FONT_SIZES.md,
  6: FONT_SIZES.lg,
  7: FONT_SIZES.xl,
  8: FONT_SIZES['2xl'],
  9: FONT_SIZES['3xl'],
  10: FONT_SIZES['4xl'],
} as const;

const lineHeightScale = {
  1: Math.round(FONT_SIZES['2xs'] * LINE_HEIGHTS.snug),
  2: Math.round(FONT_SIZES.xs * LINE_HEIGHTS.snug),
  3: Math.round(FONT_SIZES.sm * LINE_HEIGHTS.snug),
  4: Math.round(FONT_SIZES.base * LINE_HEIGHTS.normal),
  true: Math.round(FONT_SIZES.md * LINE_HEIGHTS.normal),
  5: Math.round(FONT_SIZES.md * LINE_HEIGHTS.normal),
  6: Math.round(FONT_SIZES.lg * LINE_HEIGHTS.snug),
  7: Math.round(FONT_SIZES.xl * LINE_HEIGHTS.tight),
  8: Math.round(FONT_SIZES['2xl'] * LINE_HEIGHTS.tight),
  9: Math.round(FONT_SIZES['3xl'] * LINE_HEIGHTS.tight),
  10: Math.round(FONT_SIZES['4xl'] * LINE_HEIGHTS.none),
} as const;

const fontWeightScale = {
  1: String(FONT_WEIGHTS.regular),
  2: String(FONT_WEIGHTS.regular),
  3: String(FONT_WEIGHTS.medium),
  4: String(FONT_WEIGHTS.regular),
  true: String(FONT_WEIGHTS.regular),
  5: String(FONT_WEIGHTS.medium),
  6: String(FONT_WEIGHTS.semibold),
  7: String(FONT_WEIGHTS.bold),
  8: String(FONT_WEIGHTS.bold),
  9: String(FONT_WEIGHTS.extrabold),
  10: String(FONT_WEIGHTS.extrabold),
} as const;

const bodyFont = createFont({
  family: FONT_FAMILIES.sans,
  size: fontSizeScale,
  lineHeight: lineHeightScale,
  weight: fontWeightScale,
  letterSpacing: {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    true: 0,
    5: 0,
    6: -0.2,
    7: -0.3,
    8: -0.4,
    9: -0.6,
    10: -0.8,
  },
  face: {
    400: { normal: 'DMSans-Regular' },
    500: { normal: 'DMSans-Medium' },
    600: { normal: 'DMSans-SemiBold' },
    700: { normal: 'DMSans-Bold' },
    800: { normal: 'DMSans-ExtraBold' },
  },
});

const headingFont = createFont({
  family: FONT_FAMILIES.display,
  size: fontSizeScale,
  lineHeight: lineHeightScale,
  weight: fontWeightScale,
  letterSpacing: {
    1: 0,
    2: 0,
    3: 0,
    4: -0.1,
    true: -0.2,
    5: -0.2,
    6: -0.3,
    7: -0.4,
    8: -0.5,
    9: -0.7,
    10: -1.0,
  },
});

const monoFont = createFont({
  family: FONT_FAMILIES.mono,
  size: fontSizeScale,
  lineHeight: lineHeightScale,
  weight: fontWeightScale,
});

export const tamaguiTokens = createTokens({
  color: {
    white: '#ffffff',
    black: '#000000',
    danger: '#d9364b',
    dangerText: '#ff9aa8',
    warning: '#f39c12',
    statusBusy: '#ff6b81',
    statusAway: '#f1c40f',
    statusOffline: '#6b72a8',
  },
  space: {
    ...SPACING,
    0: 0,
    3.5: 14,
  },
  size: {
    0: 0,
    1: 20,
    2: 28,
    3: SIZES.controlSm,
    4: SIZES.controlMd,
    5: SIZES.controlLg,
    6: 52,
    7: 60,
    railWidth: SIZES.railWidth,
    railBtn: SIZES.railBtn,
    controlSm: SIZES.controlSm,
    controlMd: SIZES.controlMd,
    controlLg: SIZES.controlLg,
    sidebarMin: SIZES.sidebarMin,
    sidebarDefault: SIZES.sidebarDefault,
    sidebarMax: SIZES.sidebarMax,
  },
  radius: {
    ...RADII,
    0: 0,
    1: RADII.xs,
    2: RADII.sm,
    3: RADII.md,
    4: RADII.lg,
    5: RADII.xl,
    6: RADII['2xl'],
  },
  zIndex: {
    ...Z_INDEX,
    0: 0,
  },
});

export type TamaguiSemanticTheme = {
  background: string;
  backgroundHover: string;
  backgroundPress: string;
  backgroundFocus: string;
  color: string;
  colorHover: string;
  colorPress: string;
  colorFocus: string;
  borderColor: string;
  borderColorHover: string;
  borderColorPress: string;
  borderColorFocus: string;
  placeholderColor: string;
  shadowColor: string;
  outlineColor: string;
  'background-hover': string;
  'background-press': string;
  'background-focus': string;
  'border-color': string;
  'border-color-hover': string;
  'border-color-focus': string;
  'color-press': string;
  'outline-color': string;
  bgRail: string;
  bgApp: string;
  bgSurface: string;
  bgSurfaceElevated: string;
  bgSurfaceGlass: string;
  bgBar: string;
  bgBarGlass: string;
  bgControl: string;
  bgControlHover: string;
  bgInput: string;
  bgInputHover: string;
  bgTile: string;
  bgTooltip: string;
  bgHoverOverlay: string;
  bgActiveOverlay: string;
  borderBar: string;
  borderSubtle: string;
  borderAccent: string;
  borderGlass: string;
  textPrimary: string;
  textBody: string;
  textSecondary: string;
  textMuted: string;
  textSubtle: string;
  textPlaceholder: string;
  textIcon: string;
  textDisabled: string;
  accent: string;
  accentHover: string;
  accentActive: string;
  accentStrong: string;
  accentChip: string;
  accentDisabled: string;
  accentLink: string;
  accentBorderSoft: string;
  accentMentionBg: string;
  accentGlow: string;
  presenceAvailable: string;
  presenceSoft: string;
  presenceBorder: string;
  presenceStrong: string;
  dangerBg: string;
  dangerBorder: string;
  dangerText: string;
  warningBg: string;
  warningBorder: string;
  warningText: string;
};

/**
 * Converte um conjunto `ResolvedThemeTokens` do Design System em um tema plano
 * compatível com os componentes e hooks do Tamagui.
 */
export const resolvedTokensToTamaguiTheme = (
  tokens: ResolvedThemeTokens,
): TamaguiSemanticTheme => ({
  background: tokens.bg.app,
  backgroundHover: tokens.bg.surface,
  backgroundPress: tokens.bg.surfaceElevated,
  backgroundFocus: tokens.bg.focus,
  color: tokens.text.primary,
  colorHover: tokens.text.primary,
  colorPress: tokens.text.secondary,
  colorFocus: tokens.text.primary,
  borderColor: tokens.border.subtle,
  borderColorHover: tokens.border.accent,
  borderColorPress: tokens.accent.active,
  borderColorFocus: tokens.accent.main,
  placeholderColor: tokens.text.placeholder,
  shadowColor: 'rgba(4, 6, 20, 0.44)',
  outlineColor: tokens.accent.link,
  'background-hover': tokens.bg.controlHover,
  'background-press': tokens.bg.surfaceElevated,
  'background-focus': tokens.bg.focus,
  'border-color': tokens.border.subtle,
  'border-color-hover': tokens.border.accent,
  'border-color-focus': tokens.accent.main,
  'color-press': tokens.text.secondary,
  'outline-color': tokens.accent.link,
  bgRail: tokens.bg.rail,
  bgApp: tokens.bg.app,
  bgSurface: tokens.bg.surface,
  bgSurfaceElevated: tokens.bg.surfaceElevated,
  bgSurfaceGlass: tokens.bg.surfaceGlass,
  bgBar: tokens.bg.bar,
  bgBarGlass: tokens.bg.barGlass,
  bgControl: tokens.bg.control,
  bgControlHover: tokens.bg.controlHover,
  bgInput: tokens.bg.input,
  bgInputHover: tokens.bg.inputHover,
  bgTile: tokens.bg.tile,
  bgTooltip: tokens.bg.tooltip,
  bgHoverOverlay: tokens.bg.hoverOverlay,
  bgActiveOverlay: tokens.bg.activeOverlay,
  borderBar: tokens.border.bar,
  borderSubtle: tokens.border.subtle,
  borderAccent: tokens.border.accent,
  borderGlass: tokens.border.glass,
  textPrimary: tokens.text.primary,
  textBody: tokens.text.body,
  textSecondary: tokens.text.secondary,
  textMuted: tokens.text.muted,
  textSubtle: tokens.text.subtle,
  textPlaceholder: tokens.text.placeholder,
  textIcon: tokens.text.icon,
  textDisabled: tokens.text.disabled,
  accent: tokens.accent.main,
  accentHover: tokens.accent.hover,
  accentActive: tokens.accent.active,
  accentStrong: tokens.accent.strong,
  accentChip: tokens.accent.chip,
  accentDisabled: tokens.accent.disabled,
  accentLink: tokens.accent.link,
  accentBorderSoft: tokens.accent.borderSoft,
  accentMentionBg: tokens.accent.mentionBg,
  accentGlow: tokens.accent.glow,
  presenceAvailable: tokens.presence.available,
  presenceSoft: tokens.presence.soft,
  presenceBorder: tokens.presence.border,
  presenceStrong: tokens.presence.strong,
  dangerBg: tokens.feedback.dangerBg,
  dangerBorder: tokens.feedback.dangerBorder,
  dangerText: tokens.feedback.dangerText,
  warningBg: tokens.feedback.warningBg,
  warningBorder: tokens.feedback.warningBorder,
  warningText: tokens.bg.app === '#f8f8fb' ? '#b45309' : '#fde08a',
});

type PresetThemeKey =
  ThemePresetId | `${ThemePresetId}_dark` | `${ThemePresetId}_light`;

const buildPresetThemes = (): Record<PresetThemeKey, TamaguiSemanticTheme> => {
  const entries: Array<readonly [PresetThemeKey, TamaguiSemanticTheme]> = [];
  for (const preset of THEME_PRESETS) {
    const darkTheme = resolvedTokensToTamaguiTheme(
      resolveThemeTokens(preset.id, preset.colors, false, 'dark'),
    );
    const lightTheme = resolvedTokensToTamaguiTheme(
      resolveThemeTokens(preset.id, preset.colors, false, 'light'),
    );
    entries.push([preset.id, darkTheme]);
    entries.push([`${preset.id}_dark`, darkTheme]);
    entries.push([`${preset.id}_light`, lightTheme]);
  }
  return Object.fromEntries(entries) as Record<
    PresetThemeKey,
    TamaguiSemanticTheme
  >;
};

export const tamaguiConfig = createTamagui({
  tokens: tamaguiTokens,
  themes: buildPresetThemes(),
  fonts: {
    body: bodyFont,
    heading: headingFont,
    mono: monoFont,
  },
  shorthands: createShorthands({
    bg: 'backgroundColor',
    br: 'borderRadius',
    bw: 'borderWidth',
    bc: 'borderColor',
    f: 'flex',
    fd: 'flexDirection',
    ai: 'alignItems',
    jc: 'justifyContent',
    p: 'padding',
    px: 'paddingHorizontal',
    py: 'paddingVertical',
    m: 'margin',
    mx: 'marginHorizontal',
    my: 'marginVertical',
    w: 'width',
    h: 'height',
    miw: 'minWidth',
    maw: 'maxWidth',
    mih: 'minHeight',
    mah: 'maxHeight',
  }),
  media: {
    mobile: { maxWidth: MOBILE_BREAKPOINTS.maxPortraitWidth },
    landscapeCompact: { maxHeight: MOBILE_BREAKPOINTS.maxLandscapeHeight },
    gtMobile: { minWidth: MOBILE_BREAKPOINTS.maxPortraitWidth + 1 },
  },
});

export type AppTamaguiConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppTamaguiConfig {}
}
