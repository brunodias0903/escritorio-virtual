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
    '--bg-bar': tokens.bg.bar,
    '--bg-bar-glass': tokens.bg.barGlass,
    '--bg-control': tokens.bg.control,
    '--bg-input': tokens.bg.input,
    '--bg-input-hover': tokens.bg.inputHover,
    '--bg-tooltip': tokens.bg.tooltip,
    '--bg-zoom': tokens.bg.zoom,
    '--bg-pill': tokens.bg.pill,
    '--bg-pill-dark': tokens.bg.pillDark,
    '--bg-focus': tokens.bg.focus,
    '--bg-tile': tokens.bg.tile,
    '--bg-avatar-face': tokens.bg.avatarFace,

    '--border-bar': tokens.border.bar,
    '--border-subtle': tokens.border.subtle,
    '--border-accent': tokens.border.accent,

    '--text-primary': tokens.text.primary,
    '--text-body': tokens.text.body,
    '--text-secondary': tokens.text.secondary,
    '--text-muted': tokens.text.muted,
    '--text-subtle': tokens.text.subtle,
    '--text-placeholder': tokens.text.placeholder,
    '--text-icon': tokens.text.icon,
    '--text-icon-idle': tokens.text.iconIdle,

    '--accent': tokens.accent.main,
    '--accent-hover': tokens.accent.hover,
    '--accent-active': tokens.accent.active,
    '--accent-strong': tokens.accent.strong,
    '--accent-chip': tokens.accent.chip,
    '--accent-disabled': tokens.accent.disabled,
    '--accent-link': tokens.accent.link,
    '--accent-mention-bg': tokens.accent.mentionBg,
    '--accent-border-soft': tokens.accent.borderSoft,

    '--status-available': tokens.presence.available,
    '--presence-soft': tokens.presence.soft,
    '--presence-border': tokens.presence.border,
    '--presence-strong': tokens.presence.strong,
    '--call-on-bg': tokens.presence.callOnBg,
    '--call-on-icon': tokens.presence.callOnIcon,
    '--zone-pill-bg': tokens.presence.zonePillBg,
    '--info-text': tokens.presence.infoText,

    '--server-gradient': tokens.gradient.server,
  };

  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
};
