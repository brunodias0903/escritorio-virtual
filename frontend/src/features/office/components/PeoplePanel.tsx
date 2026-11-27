import { X } from 'lucide-react';

import {
  ACCOUNT_TIER_COLORS,
  ACCOUNT_TIER_LABELS,
  PERSON_STATUS_LABELS,
  defaultAppearance,
  getMap,
  type DeskInfo,
} from '@/shared/domain';
import { Icon, type IconName } from '@/shared/ui/Icon';

import { PERSON_STATUS_COLORS, type PersonRow } from '../model/people';
import { FaceAvatar } from './FaceAvatar';
import styles from './PeoplePanel.module.css';

type Props = {
  me: PersonRow | null;
  others: PersonRow[];
  /** Quantas pessoas estão online (qualquer status, menos offline). */
  online: number;
  query: string;
  onQuery: (query: string) => void;
  onGoToDesk: (desk: DeskInfo) => void;
  onHoverDesk?: (desk: DeskInfo | null) => void;
  /** Abre a conversa direta com a pessoa (pelo e-mail). */
  onMessage: (email: string) => void;
  onClose: () => void;
  /** Embutido na sidebar esquerda: oculta o cabeçalho duplicado. */
  embedded?: boolean;
};

function Action({
  icon,
  label,
  text,
  disabled = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  icon: IconName;
  label: string;
  text: string;
  disabled?: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={styles.action}
    >
      <Icon
        name={icon}
        size={16}
        color={disabled ? 'var(--text-disabled)' : 'var(--text-primary)'}
      />
      <span className={styles.actionText}>{text}</span>
    </button>
  );
}

function Row({
  row,
  self,
  onGoToDesk,
  onHoverDesk,
  onMessage,
}: {
  row: PersonRow;
  self: boolean;
  onGoToDesk: (desk: DeskInfo) => void;
  onHoverDesk?: (desk: DeskInfo | null) => void;
  onMessage: (email: string) => void;
}) {
  const { person, desk } = row;
  const offline = person.status === 'offline';
  const where = person.map ? ` · ${getMap(person.map).name}` : '';
  const meta = [person.role, person.nickname && `@${person.nickname}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={`${styles.row} ${offline ? styles.rowOffline : ''}`}>
      <div className={styles.person}>
        <div className={styles.avatarWrap}>
          <FaceAvatar
            appearance={person.appearance ?? defaultAppearance(person.email)}
            size={36}
          />
          <span
            className={styles.statusDot}
            style={{ backgroundColor: PERSON_STATUS_COLORS[person.status] }}
          />
        </div>
        <div className={styles.info}>
          <span className={styles.name}>
            {self ? `${person.name} (você)` : person.name}
          </span>
          {person.tier ? (
            <div className={styles.roles}>
              <span
                className={styles.primaryRole}
                style={{
                  borderColor: `${ACCOUNT_TIER_COLORS[person.tier]}66`,
                  backgroundColor: `${ACCOUNT_TIER_COLORS[person.tier]}22`,
                }}
              >
                <span
                  className={styles.roleDot}
                  style={{ backgroundColor: ACCOUNT_TIER_COLORS[person.tier] }}
                />
                {ACCOUNT_TIER_LABELS[person.tier]}
              </span>
              {(person.secondaryTiers ?? []).map((sec) => (
                <span key={sec} className={styles.secondaryRole}>
                  <span
                    className={styles.roleDot}
                    style={{ backgroundColor: ACCOUNT_TIER_COLORS[sec] }}
                  />
                  {ACCOUNT_TIER_LABELS[sec]}
                </span>
              ))}
            </div>
          ) : null}
          {meta ? <span className={styles.detail}>{meta}</span> : null}
          <span className={styles.detail}>
            {PERSON_STATUS_LABELS[person.status]}
            {where}
          </span>
        </div>
      </div>
      <div className={styles.actions}>
        <Action
          icon="desk"
          label={
            desk
              ? self
                ? 'Ir até a minha mesa'
                : `Ir até a mesa de ${person.name}`
              : `${person.name} não tem mesa adotada`
          }
          text={desk ? (self ? 'Minha mesa' : 'Ir à mesa') : 'Sem mesa'}
          disabled={!desk}
          onClick={() => desk && onGoToDesk(desk)}
          onMouseEnter={() => desk && onHoverDesk?.(desk)}
          onMouseLeave={() => onHoverDesk?.(null)}
        />
        {!self ? (
          <Action
            icon="chat"
            label={`Mandar mensagem para ${person.name}`}
            text="Mensagem"
            onClick={() => onMessage(person.email)}
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * Pessoas, no mesmo lugar do chat: eu no topo, uma linha, e os outros
 * (online primeiro). A busca acha pelo nome, nickname, e-mail ou cargo.
 */
export function PeoplePanel({
  me,
  others,
  online,
  query,
  onQuery,
  onGoToDesk,
  onHoverDesk,
  onMessage,
  onClose,
  embedded = false,
}: Props) {
  return (
    <aside className={styles.panel} aria-label="Lista de pessoas">
      {!embedded ? (
        <div className={styles.header}>
          <h2 className={styles.title}>Pessoas · {online} online</h2>
          <button
            type="button"
            aria-label="Fechar a lista de pessoas"
            onClick={onClose}
            className={styles.close}
          >
            <X size={15} aria-hidden={true} />
          </button>
        </div>
      ) : null}
      <div className={styles.search}>
        <Icon name="search" size={16} color="#8888aa" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Buscar por nome, nickname, e-mail ou cargo"
          className={styles.searchInput}
          autoCapitalize="none"
          autoCorrect="off"
          aria-label="Buscar pessoas"
        />
        {query ? (
          <button
            type="button"
            aria-label="Limpar a busca"
            onClick={() => onQuery('')}
            className={styles.clear}
          >
            <X size={13} aria-hidden={true} />
          </button>
        ) : null}
      </div>
      <div className={styles.list}>
        {me ? (
          <Row
            row={me}
            self
            onGoToDesk={onGoToDesk}
            onHoverDesk={onHoverDesk}
            onMessage={onMessage}
          />
        ) : null}
        <div className={styles.divider} />
        {others.length === 0 ? (
          <p className={styles.empty}>
            {query ? 'Ninguém encontrado.' : 'Ninguém mais por aqui ainda.'}
          </p>
        ) : (
          others.map((row) => (
            <Row
              key={row.person.email}
              row={row}
              self={false}
              onGoToDesk={onGoToDesk}
              onHoverDesk={onHoverDesk}
              onMessage={onMessage}
            />
          ))
        )}
      </div>
    </aside>
  );
}
