import { useState, type ReactNode } from 'react';

import styles from './Tip.module.css';

type Props = {
  /** Texto do balão. */
  label: string;
  /** Esconde o balão (ex.: com um menu aberto em cima do botão). */
  disabled?: boolean;
  /** Onde abrir o balão em relação ao botão. */
  placement?: 'top' | 'top-start' | 'top-end' | 'right';
  children: ReactNode;
};

/** Balão que aparece próximo ao botão quando o ponteiro passa por ele. */
export function Tip({
  label,
  disabled = false,
  placement = 'top',
  children,
}: Props) {
  const [hover, setHover] = useState(false);
  const placementClass =
    placement === 'right'
      ? styles.right
      : placement === 'top-start'
        ? styles.topStart
        : placement === 'top-end'
          ? styles.topEnd
          : '';

  return (
    <div
      className={styles.anchor}
      onPointerEnter={(event) => {
        if (event.pointerType === 'touch') return;
        setHover(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'touch') return;
        setHover(false);
      }}
    >
      {children}
      {hover && !disabled ? (
        <div className={`${styles.bubbleRow} ${placementClass}`} role="tooltip">
          {placement === 'right' ? <div className={styles.arrowLeft} /> : null}
          <div className={styles.bubble}>
            <span className={styles.text}>{label}</span>
          </div>
          {placement !== 'right' ? <div className={styles.arrow} /> : null}
        </div>
      ) : null}
    </div>
  );
}
