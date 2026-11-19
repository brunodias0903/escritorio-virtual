import { Icon } from '@/shared/ui/Icon';

import styles from './ZoomControls.module.css';

type Props = {
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

/** Aproximar e afastar a câmera: um par de botões no canto direito, acima da barra. */
export function ZoomControls({
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
}: Props) {
  return (
    <div className={styles.container}>
      <button
        type="button"
        aria-label="Aproximar"
        disabled={!canZoomIn}
        onClick={onZoomIn}
        className={styles.button}
      >
        <Icon name="plus" size={20} />
      </button>
      <div className={styles.divider} />
      <button
        type="button"
        aria-label="Afastar"
        disabled={!canZoomOut}
        onClick={onZoomOut}
        className={styles.button}
      >
        <Icon name="minus" size={20} />
      </button>
    </div>
  );
}
