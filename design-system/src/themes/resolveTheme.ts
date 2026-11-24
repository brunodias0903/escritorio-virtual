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
import { adjustHex, hexToRgba } from './colorMath';
import { findPreset, type ThemeColors, type ThemePresetId } from './presets';

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
    zonePillBg: string;
    infoText: string;
    glow: string;
  };
  feedback: {
    dangerBg: string;
    dangerBorder: string;
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
): ResolvedThemeTokens => {
  const preset = findPreset(presetId);

  const rail = customized ? colors.rail : preset.colors.rail;
  const surface = customized ? colors.surface : preset.colors.surface;
  const accent = customized ? colors.accent : preset.colors.accent;
  const presence = customized ? colors.presence : preset.colors.presence;

  const surfaceElevated = customized
    ? adjustHex(surface, -0.04)
    : preset.surfaceElevated;
  const bar = customized ? adjustHex(surface, -0.07) : preset.bar;
  const control = customized ? adjustHex(surface, 0.05) : preset.control;
  const input = customized ? adjustHex(surface, 0.08) : preset.input;
  const border = customized ? adjustHex(surface, 0.14) : preset.border;
  const deep = adjustHex(rail, -0.02);
  const presenceStrong = adjustHex(presence, -0.2);

  return {
    bg: {
      rail,
      app: adjustHex(surface, -0.03),
      surface,
      surfaceElevated,
      surfaceGlass: hexToRgba(surfaceElevated, 0.9),
      bar,
      barGlass: hexToRgba(bar, 0.94),
      control,
      controlHover: adjustHex(control, 0.06),
      input,
      inputHover: adjustHex(input, 0.05),
      tooltip: deep,
      zoom: hexToRgba(bar, 0.92),
      pill: hexToRgba(deep, 0.72),
      pillDark: hexToRgba(deep, 0.82),
      focus: hexToRgba(deep, 0.94),
      tile: adjustHex(surface, 0.03),
      avatarFace: control,
      hoverOverlay: 'rgba(255, 255, 255, 0.07)',
      activeOverlay: 'rgba(255, 255, 255, 0.12)',
    },
    border: {
      bar: border,
      subtle: adjustHex(border, 0.04),
      accent: adjustHex(accent, -0.15),
      glass: 'rgba(255, 255, 255, 0.11)',
    },
    text: {
      primary: preset.textPrimary,
      body: preset.textSecondary,
      secondary: preset.textSecondary,
      muted: preset.textMuted,
      subtle: preset.textMuted,
      placeholder: adjustHex(preset.textMuted, -0.14),
      icon: preset.textSecondary,
      iconIdle: adjustHex(preset.textMuted, -0.18),
    },
    accent: {
      main: accent,
      hover: adjustHex(accent, 0.08),
      active: adjustHex(accent, -0.18),
      strong: adjustHex(accent, -0.08),
      chip: adjustHex(accent, -0.24),
      disabled: adjustHex(border, 0.02),
      link: adjustHex(accent, 0.2),
      mentionBg: hexToRgba(accent, 0.22),
      borderSoft: hexToRgba(accent, 0.65),
      glow: hexToRgba(accent, 0.32),
    },
    presence: {
      available: presence,
      soft: hexToRgba(presence, 0.16),
      border: hexToRgba(presence, 0.45),
      strong: presenceStrong,
      callOnBg: adjustHex(presence, -0.42),
      callOnIcon: adjustHex(presence, 0.24),
      zonePillBg: hexToRgba(presenceStrong, 0.85),
      infoText: adjustHex(presence, 0.18),
      glow: hexToRgba(presence, 0.28),
    },
    feedback: {
      dangerBg: 'rgba(255, 107, 129, 0.15)',
      dangerBorder: 'rgba(255, 107, 129, 0.38)',
      warningBg: 'rgba(241, 196, 15, 0.14)',
      warningBorder: 'rgba(241, 196, 15, 0.36)',
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
