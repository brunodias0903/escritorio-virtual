import {
  BLUR,
  FONT_FAMILIES,
  FONT_SIZES,
  FONT_WEIGHTS,
  LETTER_SPACINGS,
  LINE_HEIGHTS,
  MOTION,
  RADII,
  SIZES,
  SPACING,
  TEXT_STYLES,
  THEME_PRESETS,
  TYPOGRAPHY,
  Z_INDEX,
  applyThemeCssVariables,
  contrastRatio,
  findPreset,
  resolveThemeTokens,
} from '@design-system';
import { describe, expect, it } from 'vitest';

describe('Design System (@voffice/design-system)', () => {
  it('define DM Sans como fonte padrão e expõe escala tipográfica completa', () => {
    expect(FONT_FAMILIES.sans).toContain('DM Sans');
    expect(FONT_FAMILIES.display).toContain('DM Sans');
    expect(FONT_FAMILIES.nativeSans).toBe('DMSans');

    expect(TYPOGRAPHY.sizes).toEqual(FONT_SIZES);
    expect(TYPOGRAPHY.weights).toEqual(FONT_WEIGHTS);
    expect(TYPOGRAPHY.lineHeights).toEqual(LINE_HEIGHTS);
    expect(TYPOGRAPHY.letterSpacings).toEqual(LETTER_SPACINGS);
    expect(TEXT_STYLES.display.fontSize).toBeGreaterThan(
      TEXT_STYLES.headingLg.fontSize,
    );
    expect(TEXT_STYLES.headingMd.fontSize).toBeGreaterThan(
      TEXT_STYLES.body.fontSize,
    );
    expect(TEXT_STYLES.overline.textTransform).toBe('uppercase');
  });

  it('expõe tokens de movimento, elevação, raios, espaçamento e dimensões', () => {
    expect(MOTION.durations.smooth).toBeGreaterThan(MOTION.durations.fast);
    expect(MOTION.easings.emphasized).toContain('cubic-bezier');
    expect(RADII['3xl']).toBe(20);
    expect(BLUR.md).toBe(12);
    expect(SIZES.railWidth).toBe(60);
    expect(SPACING[4]).toBe(16);
    expect(Z_INDEX.modal).toBeGreaterThan(Z_INDEX.panelOverlay);
  });

  it('resolve tokens completos para todos os presets e para tema customizado', () => {
    for (const preset of THEME_PRESETS) {
      const tokens = resolveThemeTokens(preset.id, preset.colors, false);
      expect(tokens.typography.families.sans).toContain('DM Sans');
      expect(tokens.motion.durations.smooth).toBe(MOTION.durations.smooth);
      expect(tokens.shadows.xl).toContain('rgba');
      expect(tokens.shadows.focus).toContain('0 0 0 3px');
      expect(tokens.bg.surfaceGlass).toContain('rgba');
      expect(tokens.feedback.dangerBg).toContain('rgba');
    }

    const base = findPreset('default');
    const custom = resolveThemeTokens(
      'default',
      { ...base.colors, accent: '#ff5500' },
      true,
    );
    expect(custom.accent.main).toBe('#ff5500');
    expect(custom.gradient.server).toContain('#ff5500');
  });

  it('garante contraste WCAG AA (>= 4.5:1) em todos os presets nos modos claro e escuro', () => {
    for (const preset of THEME_PRESETS) {
      for (const mode of ['light', 'dark'] as const) {
        const tokens = resolveThemeTokens(
          preset.id,
          preset.colors,
          false,
          mode,
        );
        expect(
          contrastRatio(tokens.text.primary, tokens.bg.surface),
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(tokens.text.primary, tokens.bg.control),
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(tokens.text.primary, tokens.bg.input),
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(tokens.text.muted, tokens.bg.surfaceElevated),
        ).toBeGreaterThanOrEqual(4.5);

        if (mode === 'light') {
          expect(
            contrastRatio('#ffffff', tokens.accent.main),
          ).toBeGreaterThanOrEqual(4.5);
          expect(
            contrastRatio(tokens.accent.link, tokens.bg.surfaceElevated),
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it('aplica variáveis CSS de cores, tipografia, movimento e sombras em :root', () => {
    const applied: Record<string, string> = {};
    const prevDocument = globalThis.document;
    globalThis.document = {
      documentElement: {
        style: {
          setProperty: (name: string, value: string) => {
            applied[name] = value;
          },
        },
      },
    } as unknown as Document;

    try {
      const preset = findPreset('default');
      const tokens = resolveThemeTokens('default', preset.colors, false);
      applyThemeCssVariables(tokens);

      expect(applied['--font-sans']).toContain('DM Sans');
      expect(applied['--text-md']).toBe('14px');
      expect(applied['--motion-smooth']).toBe('280ms');
      expect(applied['--ease-emphasized']).toBe(MOTION.easings.emphasized);
      expect(applied['--shadow-xl']).toBe(tokens.shadows.xl);
      expect(applied['--radius-3xl']).toBe('20px');
      expect(applied['--blur-md']).toBe('12px');
    } finally {
      globalThis.document = prevDocument;
    }
  });
});
