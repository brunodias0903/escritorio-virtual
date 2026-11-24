import { useI18n } from '@/shared/i18n';
import { Icon } from '@/shared/ui/Icon';
import { Tip } from '@/shared/ui/Tip';

import styles from './ZoomControls.module.css';

type Props = {
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onOpenHelp?: () => void;
};

/** Aproximar/afastar a câmera + botão `?` de ajuda e feedback logo abaixo. */
export function ZoomControls({
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
  onOpenHelp,
}: Props) {
  const { t } = useI18n();

  return (
    <div className={styles.stack}>
      <div className={styles.container}>
        <button
          type="button"
          aria-label={t('zoom.in')}
          disabled={!canZoomIn}
          onClick={onZoomIn}
          className={styles.button}
        >
          <Icon name="plus" size={20} />
        </button>
        <div className={styles.divider} />
        <button
          type="button"
          aria-label={t('zoom.out')}
          disabled={!canZoomOut}
          onClick={onZoomOut}
          className={styles.button}
        >
          <Icon name="minus" size={20} />
        </button>
      </div>

      {onOpenHelp ? (
        <Tip label={t('help.button')} placement="top-end">
          <button
            type="button"
            aria-label={t('help.button')}
            onClick={onOpenHelp}
            className={styles.helpButton}
          >
            ?
          </button>
        </Tip>
      ) : null}
    </div>
  );
}
