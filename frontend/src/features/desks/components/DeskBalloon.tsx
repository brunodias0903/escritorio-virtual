import type { DeskDef, DeskInfo } from '@/shared/domain';
import { Icon } from '@/shared/ui/Icon';
import { Tip } from '@/shared/ui/Tip';

import { capacityText, type DeskCardState } from '../model/deskCard';
import styles from './DeskBalloon.module.css';

type Props = {
  /** Posição horizontal projetada no container do mapa (px). */
  x: number;
  /** Posição vertical projetada no topo da mesa (px). */
  y: number;
  desk: DeskDef;
  info: DeskInfo | undefined;
  state: DeskCardState;
  /** Usuário está posicionado nesta mesa (libera adotar / devolver admin). */
  isStanding: boolean;
  /** Abre o balão abaixo da mesa (ex.: durante chamada para não colidir com câmeras). */
  placeBelow?: boolean;
  /** True quando expandido (hover ou toque); false para a pílula compacta ("Sua mesa" / "Mesa de ..."). */
  expanded: boolean;
  /** True durante a animação de minimizar antes de desmontar. */
  closing?: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onExpand: () => void;
  onCollapse: () => void;
  onAdopt: () => void;
  onMove: () => void;
  onToggleLock: () => void;
  onEdit: () => void;
  onRelease: () => void;
};

const firstName = (fullName: string): string =>
  fullName.trim().split(/\s+/)[0] || fullName;

/** Balão interativo sobre cada mesa, com pílula compacta e expansão estilo macOS no hover. */
export function DeskBalloon({
  x,
  y,
  desk,
  info,
  state,
  isStanding,
  placeBelow = false,
  expanded,
  closing = false,
  onMouseEnter,
  onMouseLeave,
  onExpand,
  onCollapse,
  onAdopt,
  onMove,
  onToggleLock,
  onEdit,
  onRelease,
}: Props) {
  const customLabel = info?.config.label.trim() ?? '';
  const compactTitle =
    state.kind === 'mine'
      ? 'Sua mesa'
      : state.kind === 'other'
        ? `Mesa de ${firstName(state.ownerName)}`
        : 'Mesa livre';

  const expandedTitle =
    customLabel ||
    (state.kind === 'mine'
      ? 'Sua mesa'
      : state.kind === 'other'
        ? `Mesa de ${firstName(state.ownerName)}`
        : desk.name);

  const occupancy = `${capacityText(state.people)} ${state.people === 1 ? 'pessoa' : 'pessoas'}`;
  const isLocked =
    (state.kind === 'mine' || state.kind === 'other') && state.locked;

  return (
    <div
      className={`${styles.anchor} ${placeBelow ? styles.anchorBelow : ''}`}
      style={{ left: x, top: y }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        if (!expanded) {
          onExpand();
          return;
        }
        const target = event.target as HTMLElement | null;
        if (!target?.closest('button')) {
          onCollapse();
        }
      }}
    >
      <div
        className={[
          styles.balloon,
          state.kind === 'mine' ? styles.balloonMine : '',
          expanded ? styles.expanded : styles.compact,
          closing ? styles.balloonClosing : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {!expanded ? (
          <div className={styles.compactRow}>
            {isLocked ? (
              <span className={styles.compactLockDot} aria-label="Bloqueada" />
            ) : null}
            <span className={styles.compactLabel}>{compactTitle}</span>
            <span className={styles.expandHint} aria-hidden="true">
              <Icon name="chevronUp" size={11} color="#9aa6db" />
            </span>
          </div>
        ) : (
          <div className={styles.expandedBody}>
            <div className={styles.header}>
              <span className={styles.title}>{expandedTitle}</span>
              <span className={styles.occupancy}>
                <Icon name="people" size={12} color="#cbd3f5" />
                {occupancy}
              </span>
            </div>

            {state.kind === 'mine' ? (
              <span className={styles.subtitle}>
                {customLabel ? `Sua mesa · ${desk.name}` : desk.name}
                {state.locked ? ' · bloqueada (só você)' : ''}
              </span>
            ) : state.kind === 'other' ? (
              <>
                <span className={styles.subtitle}>
                  {state.ownerName}
                  {state.ownerRole ? ` · ${state.ownerRole}` : ''}
                </span>
                {state.locked ? (
                  <span className={styles.lockedBadge}>
                    <Icon name="lock" size={11} color="#ff99a8" />
                    Bloqueada pelo dono
                  </span>
                ) : null}
              </>
            ) : (
              <span className={styles.subtitle}>
                {state.canAdopt
                  ? 'Disponível para adotar'
                  : 'Livre · você já tem uma mesa'}
              </span>
            )}

            {state.kind === 'mine' ? (
              <div className={styles.actions}>
                <Tip label="Mover mesa">
                  <button
                    type="button"
                    className={styles.iconBtn}
                    aria-label="Mover mesa"
                    onClick={onMove}
                  >
                    <Icon name="move" size={15} />
                  </button>
                </Tip>
                <Tip
                  label={state.locked ? 'Desbloquear mesa' : 'Bloquear mesa'}
                >
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${state.locked ? styles.iconBtnLocked : ''}`}
                    aria-label={
                      state.locked ? 'Desbloquear mesa' : 'Bloquear mesa'
                    }
                    aria-pressed={state.locked}
                    onClick={onToggleLock}
                  >
                    <Icon name={state.locked ? 'unlock' : 'lock'} size={15} />
                  </button>
                </Tip>
                <Tip label="Personalizar mesa">
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.iconBtnPrimary}`}
                    aria-label="Personalizar mesa"
                    onClick={onEdit}
                  >
                    <Icon name="pencil" size={15} />
                  </button>
                </Tip>
                <Tip label="Devolver mesa">
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                    aria-label="Devolver mesa"
                    onClick={onRelease}
                  >
                    <Icon name="undo" size={15} />
                  </button>
                </Tip>
              </div>
            ) : null}

            {state.kind === 'free' && state.canAdopt && isStanding ? (
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.adoptBtn}
                  onClick={onAdopt}
                >
                  Adotar esta mesa
                </button>
              </div>
            ) : null}

            {state.kind === 'other' && state.canRelease ? (
              <div className={styles.actions}>
                <Tip label="Remover mesa (administração)">
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                    aria-label="Remover mesa (administração)"
                    onClick={onRelease}
                  >
                    <Icon name="undo" size={15} />
                  </button>
                </Tip>
              </div>
            ) : null}
          </div>
        )}

        <div className={placeBelow ? styles.arrowTop : styles.arrow} />
      </div>
    </div>
  );
}
