import { useState } from 'react';
import { createPortal } from 'react-dom';

import {
  ACCESSIBILITY_NEEDS,
  ACCESSIBILITY_NEED_LABELS,
  COLORBLIND_MODES,
  type AccessibilityNeed,
  type AccessibilityPrefs,
  type ColorblindMode,
} from '@/shared/domain';

import styles from './AccessibilityModal.module.css';
import {
  recommendedPrefsForNeeds,
  useAccessibilityStore,
} from './accessibilityStore';

const COLORBLIND_LABELS: Record<ColorblindMode, string> = {
  none: 'Desativado',
  protanopia: 'Protanopia (vermelho)',
  deuteranopia: 'Deuteranopia (verde)',
  tritanopia: 'Tritanopia (azul)',
};

type Props = {
  initialNeeds: AccessibilityNeed[];
  onSave: (
    needs: AccessibilityNeed[],
    prefs: AccessibilityPrefs,
  ) => Promise<void>;
  onClose: () => void;
};

/**
 * Painel de Acessibilidade (WCAG / LBI):
 * Permite ativar recursos reais em tempo real e registrar necessidades privadas (LGPD Art. 11).
 */
export function AccessibilityModal({ initialNeeds, onSave, onClose }: Props) {
  const prefs = useAccessibilityStore((s) => s.prefs);
  const setPrefs = useAccessibilityStore((s) => s.setPrefs);
  const reset = useAccessibilityStore((s) => s.reset);
  const [needs, setNeeds] = useState<AccessibilityNeed[]>(initialNeeds);
  const [saving, setSaving] = useState(false);

  const toggleNeed = (need: AccessibilityNeed) => {
    setNeeds((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need],
    );
  };

  const applyRecommended = () => {
    const rec = recommendedPrefsForNeeds(needs, prefs);
    setPrefs(rec);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(needs, useAccessibilityStore.getState().prefs);
    setSaving(false);
    onClose();
  };

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Recursos de acessibilidade"
      data-scroll-lock="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>♿ Acessibilidade & Inclusão</h2>
            <p className={styles.subtitle}>
              Ajuste a interface em tempo real para o seu conforto visual,
              auditivo, motor e cognitivo.
            </p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            aria-label="Fechar"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Recursos ativos na tela</h3>

            <label className={styles.toggleRow}>
              <div>
                <strong>Alto contraste e foco reforçado</strong>
                <span>
                  Aumenta o contraste de bordas, textos e navegação por teclado.
                </span>
              </div>
              <input
                type="checkbox"
                checked={prefs.highContrast}
                onChange={(e) => setPrefs({ highContrast: e.target.checked })}
              />
            </label>

            <label className={styles.toggleRow}>
              <div>
                <strong>Reduzir animações e movimento</strong>
                <span>
                  Desativa transições, pulsações e giro 3D (conforto sensorial).
                </span>
              </div>
              <input
                type="checkbox"
                checked={prefs.reducedMotion}
                onChange={(e) => setPrefs({ reducedMotion: e.target.checked })}
              />
            </label>

            <label className={styles.toggleRow}>
              <div>
                <strong>Texto ampliado</strong>
                <span>
                  Aumenta o tamanho base dos textos em toda a interface.
                </span>
              </div>
              <input
                type="checkbox"
                checked={prefs.largeText}
                onChange={(e) => setPrefs({ largeText: e.target.checked })}
              />
            </label>

            <label className={styles.toggleRow}>
              <div>
                <strong>Leitura facilitada (dislexia / TDAH)</strong>
                <span>Amplia espaçamento entre letras, palavras e linhas.</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.dyslexiaFont}
                onChange={(e) => setPrefs({ dyslexiaFont: e.target.checked })}
              />
            </label>

            <label className={styles.toggleRow}>
              <div>
                <strong>Alertas visuais para mensagens e menções</strong>
                <span>
                  Exibe avisos visuais destacados além de notificações sonoras.
                </span>
              </div>
              <input
                type="checkbox"
                checked={prefs.visualAlerts}
                onChange={(e) => setPrefs({ visualAlerts: e.target.checked })}
              />
            </label>

            <label className={styles.selectRow}>
              <span>Filtro para daltonismo</span>
              <select
                value={prefs.colorblindMode}
                onChange={(e) =>
                  setPrefs({ colorblindMode: e.target.value as ColorblindMode })
                }
                className={styles.select}
              >
                {COLORBLIND_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {COLORBLIND_LABELS[mode]}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Necessidades de acessibilidade (opcional e privado)
            </h3>
            <p className={styles.privacyNote}>
              🔒 Informação estritamente privada (LGPD Art. 11) — nunca exibida
              publicamente a outros usuários. Serve apenas para sugerir os
              melhores recursos para você.
            </p>
            <div className={styles.chips}>
              {ACCESSIBILITY_NEEDS.map((need) => {
                const active = needs.includes(need);
                return (
                  <button
                    key={need}
                    type="button"
                    aria-pressed={active}
                    className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                    onClick={() => toggleNeed(need)}
                  >
                    {active ? '✓ ' : ''}
                    {ACCESSIBILITY_NEED_LABELS[need]}
                  </button>
                );
              })}
            </div>
            {needs.length > 0 ? (
              <button
                type="button"
                className={styles.suggestBtn}
                onClick={applyRecommended}
              >
                ✨ Ativar recursos recomendados para minhas seleções
              </button>
            ) : null}
          </section>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={() => {
              reset();
              setNeeds([]);
            }}
          >
            Restaurar padrão
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? 'Salvando…' : 'Salvar na conta'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
