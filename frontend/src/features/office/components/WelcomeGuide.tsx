import { useState } from 'react';

import styles from './WelcomeGuide.module.css';

const STORAGE_KEY = 'voffice:welcome:v1';

const wasDismissed = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return true;
  }
};

/** Mini-guia discreto exibido apenas na primeira visita ao escritório. */
export function WelcomeGuide() {
  const [open, setOpen] = useState(() => !wasDismissed());

  if (!open) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignora
    }
    setOpen(false);
  };

  return (
    <aside
      className={styles.card}
      aria-label="Dicas rápidas do escritório"
      data-scroll-lock="true"
    >
      <div className={styles.header}>
        <h3 className={styles.title}>Bem-vindo ao Escritório 👋</h3>
        <button
          type="button"
          aria-label="Fechar dicas"
          className={styles.closeBtn}
          onClick={dismiss}
        >
          ✕
        </button>
      </div>
      <ul className={styles.list}>
        <li className={styles.item}>
          <span className={styles.bullet} aria-hidden="true">
            🧭
          </span>
          <span>
            <b>Clique no chão</b> ou use <b>WASD / setas</b> para andar até uma
            mesa ou sala.
          </span>
        </li>
        <li className={styles.item}>
          <span className={styles.bullet} aria-hidden="true">
            🪑
          </span>
          <span>
            <b>Passe o mouse sobre sua mesa</b> para mover, bloquear ou
            personalizar.
          </span>
        </li>
        <li className={styles.item}>
          <span className={styles.bullet} aria-hidden="true">
            🎙️
          </span>
          <span>
            <b>Segure o mouse (~2s)</b> no fone, microfone ou câmera para trocar
            dispositivos e ver preview.
          </span>
        </li>
      </ul>
      <button type="button" className={styles.cta} onClick={dismiss}>
        Entendi
      </button>
    </aside>
  );
}
