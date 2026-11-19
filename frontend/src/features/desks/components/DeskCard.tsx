import { Icon } from '@/shared/ui/Icon';

import { capacityText, type DeskCardState } from '../model/deskCard';
import styles from './DeskCard.module.css';

type Props = {
  state: DeskCardState;
  onAdopt: () => void;
  onEdit: () => void;
  onMove: () => void;
  onToggleLock: () => void;
  onRelease: () => void;
};

/** Cartão que aparece sobre a mesinha em que a pessoa está: adotar, mover, personalizar, bloquear ou devolver. */
export function DeskCard({
  state,
  onAdopt,
  onEdit,
  onMove,
  onToggleLock,
  onRelease,
}: Props) {
  const capacity = `${capacityText(state.people)} pessoas`;

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.text}>
          <span className={styles.title}>
            {state.kind === 'mine'
              ? `Sua mesa · ${state.name}`
              : state.kind === 'other'
                ? `Mesa de ${state.ownerName}${state.ownerRole ? ` (${state.ownerRole})` : ''} · ${state.name}`
                : `${state.name} · livre`}
          </span>
          <span className={styles.subtitle}>
            {capacity}
            {state.kind === 'mine' && state.locked
              ? ' · bloqueada (só você)'
              : ''}
            {state.kind === 'other'
              ? state.locked
                ? ' · bloqueada pelo dono'
                : ' · só quem adotou pode mudar'
              : ''}
            {state.kind === 'free' && !state.canAdopt
              ? ' · você já tem uma mesa'
              : ''}
          </span>
        </div>

        {state.kind === 'free' && state.canAdopt ? (
          <button
            type="button"
            className={`${styles.button} ${styles.primary}`}
            onClick={onAdopt}
          >
            Adotar esta mesa
          </button>
        ) : null}

        {state.kind === 'mine' ? (
          <>
            <button type="button" className={styles.button} onClick={onMove}>
              <Icon name="move" size={15} />
              <span>Mover</span>
            </button>
            <button
              type="button"
              className={`${styles.button} ${state.locked ? styles.locked : ''}`}
              aria-pressed={state.locked}
              onClick={onToggleLock}
            >
              <Icon name={state.locked ? 'unlock' : 'lock'} size={15} />
              <span>{state.locked ? 'Desbloquear' : 'Bloquear'}</span>
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              onClick={onEdit}
            >
              <Icon name="pencil" size={16} />
              <span>Personalizar</span>
            </button>
            <button type="button" className={styles.button} onClick={onRelease}>
              Devolver
            </button>
          </>
        ) : null}

        {state.kind === 'other' && state.canRelease ? (
          <button type="button" className={styles.button} onClick={onRelease}>
            Devolver (administração)
          </button>
        ) : null}
      </div>
    </div>
  );
}
