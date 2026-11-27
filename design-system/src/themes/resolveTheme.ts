import {
  BLUR,
  FONT_SIZES,
  RADII,
  SIZES,
  SPACING,
  Z_INDEX,
} from '../tokens/foundations';
import { MOTION, type MotionTokens } from '../tokens/motion';
import { TYPOGRAPHY, type TypographyTokens } from '../tokens/typography';
import { adjustHex, ensureContrast, hexToRgba } from './colorMath';
import {
  findPreset,
  type ThemeColors,
  type ThemeMode,
  type ThemePresetId,
} from './presets';

/**
 * Conjunto completo de tokens semânticos resolvidos.
 * Pode ser consumido diretamente em React Native (`StyleSheet`) ou convertido
 * em variáveis CSS no Web via `applyThemeCssVariables`.
 */
export type ResolvedThemeTokens = {
  bg: {
    rail: string;
    app: string;
    surface: string;
    surfaceElevated: string;
    surfaceGlass: string;
    bar: string;
    barGlass: string;
    control: string;
    controlHover: string;
    input: string;
    inputHover: string;
    tooltip: string;
    zoom: string;
    pill: string;
    pillDark: string;
    focus: string;
    tile: string;
    avatarFace: string;
    hoverOverlay: string;
    activeOverlay: string;
  };
  border: {
    bar: string;
    subtle: string;
    accent: string;
    glass: string;
  };
  text: {
    primary: string;
    body: string;
    secondary: string;
    muted: string;
    subtle: string;
    placeholder: string;
    icon: string;
    iconIdle: string;
    disabled: string;
  };
  accent: {
    main: string;
    hover: string;
    active: string;
    strong: string;
    chip: string;
    disabled: string;
    link: string;
    mentionBg: string;
    borderSoft: string;
    glow: string;
  };
  presence: {
    available: string;
    soft: string;
    border: string;
    strong: string;
    callOnBg: string;
    callOnIcon: string;
    callOffBg: string;
    callOffIcon: string;
    zonePillBg: string;
    infoText: string;
    glow: string;
  };
  feedback: {
    dangerBg: string;
    dangerBorder: string;
    dangerText: string;
    warningBg: string;
    warningBorder: string;
  };
  shadows: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    focus: string;
    innerHighlight: string;
  };
  gradient: {
    server: string;
  };
  radii: typeof RADII;
  spacing: typeof SPACING;
  blur: typeof BLUR;
  sizes: typeof SIZES;
  fontSizes: typeof FONT_SIZES;
  typography: TypographyTokens;
  motion: MotionTokens;
  zIndex: typeof Z_INDEX;
};

/** Calcula todos os tokens derivados a partir de um tema pronto ou de cores customizadas. */
export const resolveThemeTokens = (
  presetId: ThemePresetId,
  colors: ThemeColors,
  customized: boolean,
  mode: ThemeMode = 'dark',
): ResolvedThemeTokens => {
  const preset = findPreset(presetId);
  const isLight = mode === 'light';

  const rail = isLight
    ? '#e4e4eb'
    : customized
      ? colors.rail
      : preset.colors.rail;
  const surface = isLight
    ? '#f4f4f8'
    : customized
      ? colors.surface
      : preset.colors.surface;
  const rawAccent = customized ? colors.accent : preset.colors.accent;
  const accent = isLight
    ? ensureContrast(rawAccent, '#ffffff', 4.5)
    : rawAccent;
  const presence = customized ? colors.presence : preset.colors.presence;

  const surfaceElevated = isLight
    ? '#ffffff'
    : customized
      ? adjustHex(surface, -0.04)
      : preset.surfaceElevated;
  const bar = isLight
    ? '#ebebf2'
    : customized
      ? adjustHex(surface, -0.07)
      : preset.bar;
  const control = isLight
    ? '#e6e6ef'
    : customized
      ? adjustHex(surface, 0.05)
      : preset.control;
  const input = isLight
    ? '#ffffff'
    : customized
      ? adjustHex(surface, 0.08)
      : preset.input;
  const border = isLight
    ? '#c7c7d6'
    : customized
      ? adjustHex(surface, 0.14)
      : preset.border;
  const deep = adjustHex(rail, -0.02);
  const presenceStrong = adjustHex(presence, -0.2);

  const textPrimary = isLight ? '#18181b' : preset.textPrimary;
  const textSecondary = isLight ? '#27272a' : preset.textSecondary;
  const textMuted = isLight ? '#52525b' : preset.textMuted;

  return {
    bg: {
      rail,
      app: isLight ? '#f8f8fb' : adjustHex(surface, -0.03),
      surface,
      surfaceElevated,
      surfaceGlass: hexToRgba(surfaceElevated, 0.94),
      bar,
      barGlass: hexToRgba(bar, 0.96),
      control,
      controlHover: adjustHex(control, isLight ? -0.06 : 0.06),
      input,
      inputHover: adjustHex(input, isLight ? -0.03 : 0.05),
      tooltip: isLight ? '#ffffff' : deep,
      zoom: hexToRgba(bar, 0.92),
      pill: isLight ? 'rgba(24, 24, 27, 0.08)' : hexToRgba(deep, 0.72),
      pillDark: isLight ? 'rgba(24, 24, 27, 0.14)' : hexToRgba(deep, 0.82),
      focus: hexToRgba(isLight ? '#ffffff' : deep, 0.94),
      tile: adjustHex(surface, isLight ? -0.02 : 0.03),
      avatarFace: control,
      hoverOverlay: isLight
        ? 'rgba(0, 0, 0, 0.05)'
        : 'rgba(255, 255, 255, 0.07)',
      activeOverlay: isLight
        ? 'rgba(0, 0, 0, 0.1)'
        : 'rgba(255, 255, 255, 0.12)',
    },
    border: {
      bar: border,
      subtle: isLight ? '#d0d0de' : adjustHex(border, 0.04),
      accent: isLight
        ? ensureContrast(accent, surface, 3.0)
        : adjustHex(accent, -0.15),
      glass: isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.11)',
    },
    text: {
      primary: textPrimary,
      body: textSecondary,
      secondary: textSecondary,
      muted: textMuted,
      subtle: textMuted,
      placeholder: isLight ? '#6b7280' : adjustHex(textMuted, -0.14),
      icon: textSecondary,
      iconIdle: isLight ? '#52525b' : adjustHex(textMuted, -0.18),
      disabled: isLight ? '#71717a' : '#5c6396',
    },
    accent: {
      main: accent,
      hover: adjustHex(accent, isLight ? -0.08 : 0.08),
      active: adjustHex(accent, -0.18),
      strong: isLight
        ? ensureContrast(accent, '#ffffff', 5.0)
        : adjustHex(accent, -0.08),
      chip: isLight ? hexToRgba(accent, 0.14) : adjustHex(accent, -0.24),
      disabled: isLight ? '#d4d4df' : adjustHex(border, 0.02),
      link: isLight
        ? ensureContrast(accent, '#ffffff', 4.5)
        : adjustHex(accent, 0.2),
      mentionBg: hexToRgba(accent, isLight ? 0.14 : 0.22),
      borderSoft: hexToRgba(accent, 0.65),
      glow: hexToRgba(accent, 0.32),
    },
    presence: {
      available: isLight ? ensureContrast(presence, surface, 3.0) : presence,
      soft: hexToRgba(presence, 0.16),
      border: hexToRgba(presence, 0.45),
      strong: presenceStrong,
      callOnBg: isLight
        ? hexToRgba(presence, 0.16)
        : adjustHex(presence, -0.42),
      callOnIcon: isLight
        ? ensureContrast(presence, '#ffffff', 4.5)
        : adjustHex(presence, 0.24),
      callOffBg: isLight ? '#fee2e2' : '#55212f',
      callOffIcon: isLight ? '#b91c1c' : '#ffb3bf',
      zonePillBg: hexToRgba(presenceStrong, 0.85),
      infoText: isLight
        ? ensureContrast(presence, '#ffffff', 4.5)
        : adjustHex(presence, 0.18),
      glow: hexToRgba(presence, 0.28),
    },
    feedback: {
      dangerBg: isLight
        ? 'rgba(220, 38, 38, 0.12)'
        : 'rgba(255, 107, 129, 0.15)',
      dangerBorder: isLight
        ? 'rgba(220, 38, 38, 0.36)'
        : 'rgba(255, 107, 129, 0.38)',
      dangerText: isLight ? '#b91c1c' : '#ff9aa8',
      warningBg: isLight
        ? 'rgba(217, 119, 6, 0.12)'
        : 'rgba(241, 196, 15, 0.14)',
      warningBorder: isLight
        ? 'rgba(217, 119, 6, 0.36)'
        : 'rgba(241, 196, 15, 0.36)',
    },
    shadows: {
      xs: '0 2px 6px rgba(4, 6, 20, 0.24)',
      sm: '0 4px 14px rgba(4, 6, 20, 0.32)',
      md: '0 10px 26px rgba(4, 6, 20, 0.44)',
      lg: '0 16px 40px rgba(4, 6, 20, 0.56)',
      xl: '0 24px 64px rgba(2, 4, 16, 0.68)',
      focus: `0 0 0 3px ${hexToRgba(accent, 0.32)}`,
      innerHighlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.07)',
    },
    gradient: {
      server: customized
        ? `linear-gradient(135deg, ${adjustHex(accent, -0.15)} 0%, ${accent} 55%, ${presence} 100%)`
        : preset.serverGradient,
    },
    radii: RADII,
    spacing: SPACING,
    blur: BLUR,
    sizes: SIZES,
    fontSizes: FONT_SIZES,
    typography: TYPOGRAPHY,
    motion: MOTION,
    zIndex: Z_INDEX,
  };
};
