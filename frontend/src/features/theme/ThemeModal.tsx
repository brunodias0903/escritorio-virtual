import { useEffect, useId } from 'react';

import { Button } from '@/shared/ui/Button';

import styles from './ThemeModal.module.css';
import { THEME_PRESETS, useThemeStore, type ThemeColors } from './themeStore';

type Props = {
  onClose: () => void;
};

const COLOR_FIELDS: Array<{ key: keyof ThemeColors; label: string }> = [
  { key: 'rail', label: 'Barra lateral' },
  { key: 'surface', label: 'Painéis e menus' },
  { key: 'accent', label: 'Cor de destaque' },
  { key: 'presence', label: 'Presença / Online' },
];

/**
 * Modal de personalização da interface:
 * permite escolher um tema pronto (Cósmico, Modo Arcade, Reino da Floresta, Ordem Estelar)
 * ou ativar o modo Customizado para ajustar livremente as cores principais.
 */
export function ThemeModal({ onClose }: Props) {
  const titleId = useId();
  const presetId = useThemeStore((s) => s.presetId);
  const colors = useThemeStore((s) => s.colors);
  const customized = useThemeStore((s) => s.customized);
  const selectPreset = useThemeStore((s) => s.selectPreset);
  const enableCustom = useThemeStore((s) => s.enableCustom);
  const setColor = useThemeStore((s) => s.setColor);
  const reset = useThemeStore((s) => s.reset);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-scroll-lock="true"
    >
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <h2 id={titleId} className={styles.title}>
              Aparência e temas
            </h2>
            <span className={styles.subtitle}>
              Escolha um tema pronto ou personalize as cores da sua interface
            </span>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            className={styles.closeBtn}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <div>
            <h3 className={styles.sectionTitle}>Temas</h3>
            <div className={styles.presetGrid}>
              {THEME_PRESETS.map((preset) => {
                const active = preset.id === presetId && !customized;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={active}
                    className={`${styles.presetCard} ${active ? styles.presetCardActive : ''}`}
                    onClick={() => selectPreset(preset.id)}
                  >
                    <div className={styles.presetTop}>
                      <span className={styles.presetName}>
                        <span aria-hidden="true">{preset.badge}</span>
                        <span>{preset.name}</span>
                      </span>
                      <div className={styles.swatchRow} aria-hidden="true">
                        <span
                          className={styles.swatchDot}
                          style={{ backgroundColor: preset.colors.rail }}
                        />
                        <span
                          className={styles.swatchDot}
                          style={{ backgroundColor: preset.colors.surface }}
                        />
                        <span
                          className={styles.swatchDot}
                          style={{ backgroundColor: preset.colors.accent }}
                        />
                        <span
                          className={styles.swatchDot}
                          style={{ backgroundColor: preset.colors.presence }}
                        />
                      </div>
                    </div>
                    <span className={styles.presetDesc}>{preset.subtitle}</span>
                  </button>
                );
              })}

              <button
                type="button"
                aria-pressed={customized}
                className={`${styles.presetCard} ${styles.presetCardFull} ${customized ? styles.presetCardActive : ''}`}
                onClick={enableCustom}
              >
                <div className={styles.presetTop}>
                  <span className={styles.presetName}>
                    <span aria-hidden="true">🎨</span>
                    <span>Customizado</span>
                  </span>
                  <div className={styles.swatchRow} aria-hidden="true">
                    <span
                      className={styles.swatchDot}
                      style={{ backgroundColor: colors.rail }}
                    />
                    <span
                      className={styles.swatchDot}
                      style={{ backgroundColor: colors.surface }}
                    />
                    <span
                      className={styles.swatchDot}
                      style={{ backgroundColor: colors.accent }}
                    />
                    <span
                      className={styles.swatchDot}
                      style={{ backgroundColor: colors.presence }}
                    />
                  </div>
                </div>
                <span className={styles.presetDesc}>
                  Escolha manualmente as cores da barra lateral, painéis,
                  destaque e presença.
                </span>
              </button>
            </div>
          </div>

          {customized ? (
            <div>
              <h3 className={styles.sectionTitle}>Cores personalizadas</h3>
              <div className={styles.customGrid}>
                {COLOR_FIELDS.map(({ key, label }) => (
                  <label key={key} className={styles.colorField}>
                    <span className={styles.colorMeta}>
                      <span className={styles.colorLabel}>{label}</span>
                      <span className={styles.colorHex}>{colors[key]}</span>
                    </span>
                    <input
                      type="color"
                      value={colors[key]}
                      aria-label={label}
                      className={styles.colorInput}
                      onChange={(event) => setColor(key, event.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.resetBtn} onClick={reset}>
            Restaurar padrão
          </button>
          <Button title="Concluir" onClick={onClose} />
        </div>
      </div>
    </div>
  );
}
