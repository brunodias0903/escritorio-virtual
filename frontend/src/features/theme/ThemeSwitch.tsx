import type { ThemeMode } from './themeStore';
import styles from './ThemeSwitch.module.css';

type Props = {
  mode: ThemeMode;
  label: string;
  onToggle: (nextMode: ThemeMode) => void;
};

/**
 * Seletor estilo iOS (Sol à esquerda / Lua minguante à direita) com animações
 * de brilho solar no modo claro e estrelas cintilando no modo escuro.
 */
export function ThemeSwitch({ mode, label, onToggle }: Props) {
  const isDark = mode === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={label}
      className={`${styles.track} ${isDark ? styles.trackDark : styles.trackLight}`}
      onClick={(event) => {
        event.stopPropagation();
        onToggle(isDark ? 'light' : 'dark');
      }}
    >
      <span
        className={`${styles.thumb} ${isDark ? styles.thumbDark : ''}`}
        aria-hidden={true}
      />

      <span className={styles.iconSlot} aria-hidden={true}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className={`${styles.sunSvg} ${!isDark ? styles.sunActive : styles.sunInactive}`}
        >
          <circle cx="12" cy="12" r="4.2" fill="currentColor" />
          <path
            d="M12 2.2v2.4M12 19.4v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.2 12h2.4M19.4 12h2.4M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>

      <span className={styles.iconSlot} aria-hidden={true}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className={`${styles.moonSvg} ${isDark ? styles.moonActive : styles.moonInactive}`}
        >
          {/* Lua crescente/minguante */}
          <path
            d="M15.8 4.2a7.9 7.9 0 1 0 4.6 13.7A6.4 6.4 0 0 1 15.8 4.2Z"
            fill="currentColor"
          />
          {/* Estrelinhas que surgem no modo escuro */}
          <circle
            cx="18.2"
            cy="5.6"
            r="1.15"
            fill="#fde68a"
            className={`${styles.star} ${styles.star1}`}
          />
          <circle
            cx="20.8"
            cy="9.2"
            r="0.85"
            fill="#fde68a"
            className={`${styles.star} ${styles.star2}`}
          />
          <circle
            cx="16.2"
            cy="9.8"
            r="0.7"
            fill="#ffffff"
            className={`${styles.star} ${styles.star3}`}
          />
        </svg>
      </span>
    </button>
  );
}
