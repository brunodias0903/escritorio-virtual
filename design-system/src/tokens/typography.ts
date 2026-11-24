/**
 * Sistema tipográfico oficial do Design System (DM Sans como família padrão).
 * Compartilhado entre Web (CSS) e futuro Mobile (React Native).
 */

export const FONT_FAMILIES = {
  /** Fonte padrão de interface e leitura contínua. */
  sans: "'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  /** Fonte para títulos de destaque, cabeçalhos e marca. */
  display:
    "'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  /** Fonte monoespaçada para códigos, hexadecimais e atalhos. */
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  /** Nome da família para consumo em React Native. */
  nativeSans: 'DMSans',
} as const;

export const FONT_SIZES = {
  '2xs': 10,
  xs: 11,
  sm: 12,
  base: 13,
  md: 14,
  lg: 16,
  xl: 18,
  '2xl': 22,
  '3xl': 28,
  '4xl': 36,
} as const;

export const FONT_WEIGHTS = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

export const LINE_HEIGHTS = {
  none: 1,
  tight: 1.15,
  snug: 1.3,
  normal: 1.48,
  relaxed: 1.6,
} as const;

export const LETTER_SPACINGS = {
  tighter: '-0.03em',
  tight: '-0.02em',
  snug: '-0.01em',
  normal: '0em',
  wide: '0.02em',
  wider: '0.06em',
} as const;

export type TextStyleToken = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: string;
  textTransform?: 'uppercase' | 'none';
};

/**
 * Escala semântica de tipografia:
 * define hierarquia consistente entre títulos, corpo, rótulos e microtextos.
 */
export const TEXT_STYLES = {
  display: {
    fontFamily: FONT_FAMILIES.display,
    fontSize: FONT_SIZES['4xl'],
    fontWeight: FONT_WEIGHTS.extrabold,
    lineHeight: 1.08,
    letterSpacing: LETTER_SPACINGS.tighter,
  },
  headingLg: {
    fontFamily: FONT_FAMILIES.display,
    fontSize: 20,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: LINE_HEIGHTS.tight,
    letterSpacing: LETTER_SPACINGS.tight,
  },
  headingMd: {
    fontFamily: FONT_FAMILIES.display,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 1.25,
    letterSpacing: '-0.015em',
  },
  headingSm: {
    fontFamily: FONT_FAMILIES.sans,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: LINE_HEIGHTS.snug,
    letterSpacing: LETTER_SPACINGS.snug,
  },
  body: {
    fontFamily: FONT_FAMILIES.sans,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACINGS.normal,
  },
  bodyMedium: {
    fontFamily: FONT_FAMILIES.sans,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: 1.44,
    letterSpacing: LETTER_SPACINGS.normal,
  },
  bodySm: {
    fontFamily: FONT_FAMILIES.sans,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: 1.45,
    letterSpacing: LETTER_SPACINGS.normal,
  },
  label: {
    fontFamily: FONT_FAMILIES.sans,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    lineHeight: LINE_HEIGHTS.snug,
    letterSpacing: '0.005em',
  },
  caption: {
    fontFamily: FONT_FAMILIES.sans,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: 1.35,
    letterSpacing: '0.01em',
  },
  overline: {
    fontFamily: FONT_FAMILIES.sans,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 1.2,
    letterSpacing: LETTER_SPACINGS.wider,
    textTransform: 'uppercase',
  },
  micro: {
    fontFamily: FONT_FAMILIES.sans,
    fontSize: FONT_SIZES['2xs'],
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 1.2,
    letterSpacing: LETTER_SPACINGS.wide,
  },
} as const satisfies Record<string, TextStyleToken>;

export type TypographyTokens = {
  families: typeof FONT_FAMILIES;
  sizes: typeof FONT_SIZES;
  weights: typeof FONT_WEIGHTS;
  lineHeights: typeof LINE_HEIGHTS;
  letterSpacings: typeof LETTER_SPACINGS;
  styles: typeof TEXT_STYLES;
};

export const TYPOGRAPHY: TypographyTokens = {
  families: FONT_FAMILIES,
  sizes: FONT_SIZES,
  weights: FONT_WEIGHTS,
  lineHeights: LINE_HEIGHTS,
  letterSpacings: LETTER_SPACINGS,
  styles: TEXT_STYLES,
};
