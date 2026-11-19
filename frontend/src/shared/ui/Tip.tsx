import { useState, type ReactNode } from 'react';

import styles from './Tip.module.css';

type Props = {
  /** Texto do balão. */
  label: string;
  /** Esconde o balão (ex.: com um menu aberto em cima do botão). */
  disabled?: boolean;
  children: ReactNode;
};

/** Balão que aparece em cima do botão quando o ponteiro passa por ele. */
export function Tip({ label, disabled = false, children }: Props) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className={styles.anchor}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      {children}
      {hover && !disabled ? (
        <div className={styles.bubbleRow} role="tooltip">
          <div className={styles.bubble}>
            <span className={styles.text}>{label}</span>
          </div>
          <div className={styles.arrow} />
        </div>
      ) : null}
    </div>
  );
}
