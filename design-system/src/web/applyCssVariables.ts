import type { ResolvedThemeTokens } from '../themes/resolveTheme';

/**
 * Adaptador Web: aplica todos os tokens do Design System em `:root` como variáveis CSS.
 * No mobile (React Native), os componentes consomem `ResolvedThemeTokens` diretamente.
 */
export const applyThemeCssVariables = (tokens: ResolvedThemeTokens): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  const vars: Record<string, string> = {
    '--bg-rail': tokens.bg.rail,
    '--bg-app': tokens.bg.app,
    '--bg-surface': tokens.bg.surface,
    '--bg-surface-elevated': tokens.bg.surfaceElevated,
    '--bg-surface-glass': tokens.bg.surfaceGlass,
    '--bg-bar': tokens.bg.bar,
    '--bg-bar-glass': tokens.bg.barGlass,
    '--bg-control': tokens.bg.control,
    '--bg-control-hover': tokens.bg.controlHover,
    '--bg-input': tokens.bg.input,
    '--bg-input-hover': tokens.bg.inputHover,
    '--bg-tooltip': tokens.bg.tooltip,
    '--bg-zoom': tokens.bg.zoom,
    '--bg-pill': tokens.bg.pill,
    '--bg-pill-dark': tokens.bg.pillDark,
    '--bg-focus': tokens.bg.focus,
    '--bg-tile': tokens.bg.tile,
    '--bg-avatar-face': tokens.bg.avatarFace,
    '--bg-hover-overlay': tokens.bg.hoverOverlay,
    '--bg-active-overlay': tokens.bg.activeOverlay,

    '--border-bar': tokens.border.bar,
    '--border-subtle': tokens.border.subtle,
    '--border-accent': tokens.border.accent,
    '--border-glass': tokens.border.glass,

    '--text-primary': tokens.text.primary,
    '--text-body': tokens.text.body,
    '--text-secondary': tokens.text.secondary,
    '--text-muted': tokens.text.muted,
    '--text-subtle': tokens.text.subtle,
    '--text-placeholder': tokens.text.placeholder,
    '--text-icon': tokens.text.icon,
    '--text-icon-idle': tokens.text.iconIdle,
    '--text-disabled': tokens.text.disabled ?? '#5c6396',

    '--accent': tokens.accent.main,
    '--accent-hover': tokens.accent.hover,
    '--accent-active': tokens.accent.active,
    '--accent-strong': tokens.accent.strong,
    '--accent-chip': tokens.accent.chip,
    '--accent-disabled': tokens.accent.disabled,
    '--accent-link': tokens.accent.link,
    '--accent-mention-bg': tokens.accent.mentionBg,
    '--accent-border-soft': tokens.accent.borderSoft,
    '--accent-glow': tokens.accent.glow,

    '--status-available': tokens.presence.available,
    '--presence-soft': tokens.presence.soft,
    '--presence-border': tokens.presence.border,
    '--presence-strong': tokens.presence.strong,
    '--presence-glow': tokens.presence.glow,
    '--call-on-bg': tokens.presence.callOnBg,
    '--call-on-icon': tokens.presence.callOnIcon,
    '--call-off-bg': tokens.presence.callOffBg ?? '#55212f',
    '--call-off-icon': tokens.presence.callOffIcon ?? '#ffb3bf',
    '--zone-pill-bg': tokens.presence.zonePillBg,
    '--info-text': tokens.presence.infoText,

    '--danger-bg': tokens.feedback.dangerBg,
    '--danger-border': tokens.feedback.dangerBorder,
    '--danger-text': tokens.feedback.dangerText ?? '#ff9aa8',
    '--warning-bg': tokens.feedback.warningBg,
    '--warning-border': tokens.feedback.warningBorder,

    '--shadow-xs': tokens.shadows.xs,
    '--shadow-sm': tokens.shadows.sm,
    '--shadow-md': tokens.shadows.md,
    '--shadow-lg': tokens.shadows.lg,
    '--shadow-xl': tokens.shadows.xl,
    '--shadow-focus': tokens.shadows.focus,
    '--shadow-inner': tokens.shadows.innerHighlight,

    '--server-gradient': tokens.gradient.server,

    /* Tipografia */
    '--font-sans': tokens.typography.families.sans,
    '--font-display': tokens.typography.families.display,
    '--font-mono': tokens.typography.families.mono,

    '--text-2xs': `${tokens.typography.sizes['2xs']}px`,
    '--text-xs': `${tokens.typography.sizes.xs}px`,
    '--text-sm': `${tokens.typography.sizes.sm}px`,
    '--text-base': `${tokens.typography.sizes.base}px`,
    '--text-md': `${tokens.typography.sizes.md}px`,
    '--text-lg': `${tokens.typography.sizes.lg}px`,
    '--text-xl': `${tokens.typography.sizes.xl}px`,
    '--text-2xl': `${tokens.typography.sizes['2xl']}px`,
    '--text-3xl': `${tokens.typography.sizes['3xl']}px`,
    '--text-4xl': `${tokens.typography.sizes['4xl']}px`,

    '--font-regular': String(tokens.typography.weights.regular),
    '--font-medium': String(tokens.typography.weights.medium),
    '--font-semibold': String(tokens.typography.weights.semibold),
    '--font-bold': String(tokens.typography.weights.bold),
    '--font-extrabold': String(tokens.typography.weights.extrabold),

    '--leading-none': String(tokens.typography.lineHeights.none),
    '--leading-tight': String(tokens.typography.lineHeights.tight),
    '--leading-snug': String(tokens.typography.lineHeights.snug),
    '--leading-normal': String(tokens.typography.lineHeights.normal),
    '--leading-relaxed': String(tokens.typography.lineHeights.relaxed),

    '--tracking-tighter': tokens.typography.letterSpacings.tighter,
    '--tracking-tight': tokens.typography.letterSpacings.tight,
    '--tracking-snug': tokens.typography.letterSpacings.snug,
    '--tracking-normal': tokens.typography.letterSpacings.normal,
    '--tracking-wide': tokens.typography.letterSpacings.wide,
    '--tracking-wider': tokens.typography.letterSpacings.wider,

    /* Movimento */
    '--motion-instant': `${tokens.motion.durations.instant}ms`,
    '--motion-fast': `${tokens.motion.durations.fast}ms`,
    '--motion-normal': `${tokens.motion.durations.normal}ms`,
    '--motion-smooth': `${tokens.motion.durations.smooth}ms`,
    '--motion-slow': `${tokens.motion.durations.slow}ms`,

    '--ease-standard': tokens.motion.easings.standard,
    '--ease-emphasized': tokens.motion.easings.emphasized,
    '--ease-exit': tokens.motion.easings.exit,
    '--ease-spring': tokens.motion.easings.spring,

    /* Raios e blur */
    '--radius-xs': `${tokens.radii.xs}px`,
    '--radius-sm': `${tokens.radii.sm}px`,
    '--radius-md': `${tokens.radii.md}px`,
    '--radius-lg': `${tokens.radii.lg}px`,
    '--radius-xl': `${tokens.radii.xl}px`,
    '--radius-2xl': `${tokens.radii['2xl']}px`,
    '--radius-3xl': `${tokens.radii['3xl']}px`,
    '--radius-pill': `${tokens.radii.pill}px`,

    '--blur-sm': `${tokens.blur.sm}px`,
    '--blur-md': `${tokens.blur.md}px`,
    '--blur-lg': `${tokens.blur.lg}px`,
  };

  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
};
