import { useEffect, useRef, useState, type PointerEvent } from 'react';

import { SlackChatView } from '@/features/chat/components/SlackChatView';
import type { OfficeSend } from '@/pages/office/routeMessage';
import {
  canManageServer,
  defaultAppearance,
  type Appearance,
  type DeskInfo,
  type Session,
  type Status,
} from '@/shared/domain';
import { useI18n } from '@/shared/i18n';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { Tip } from '@/shared/ui/Tip';

import type { PersonRow } from '../model/people';
import { FaceAvatar } from './FaceAvatar';
import { PeoplePanel } from './PeoplePanel';
import styles from './WorkspaceSidebar.module.css';

export type SidebarTab = 'chat' | 'people';

const MIN_WIDTH = 280;
const MAX_WIDTH = 520;
const DEFAULT_WIDTH = 340;

const STATUS_COLORS: Record<Status, string> = {
  available: 'var(--status-available)',
  busy: 'var(--status-busy)',
  away: 'var(--status-away)',
};

type Props = {
  /** Nome do servidor/workspace ativo (padrão: Setter). */
  serverName: string;
  /** Ícone/foto customizada do servidor (opcional). */
  serverIcon?: string | null;
  /** Nome do andar/sala atual no mapa. */
  floorName: string;
  session: Session;
  status: Status;
  appearance: Appearance | undefined;
  /** Tela larga: sidebar encaixa à esquerda do mapa com redimensionamento. */
  wide: boolean;
  open: boolean;
  tab: SidebarTab;
  unread: number;
  mentions: number;
  online: number;
  peopleMe: PersonRow | null;
  peopleOthers: PersonRow[];
  peopleQuery: string;
  onPeopleQuery: (query: string) => void;
  onSelectTab: (tab: SidebarTab) => void;
  onToggleOpen: () => void;
  onClose: () => void;
  onGoToDesk: (desk: DeskInfo) => void;
  onOpenDm: (email: string) => void;
  accountOpen?: boolean;
  onOpenAccount: () => void;
  onOpenServerSettings?: () => void;
  onExit: () => void;
  onNotify: (text: string) => void;
  send: OfficeSend;
};

function RailButton({
  icon,
  label,
  active,
  danger = false,
  badge,
  badgeAlert = false,
  onClick,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  danger?: boolean;
  badge?: string;
  badgeAlert?: boolean;
  onClick: () => void;
}) {
  return (
    <Tip label={label} placement="right">
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={`${styles.railBtn} ${active ? styles.railBtnActive : ''} ${danger ? styles.railBtnDanger : ''}`}
      >
        <Icon
          name={icon}
          size={20}
          color={danger ? '#ff9aa8' : active ? '#ffffff' : 'var(--text-icon)'}
        />
        {badge ? (
          <span
            className={`${styles.badge} ${badgeAlert ? styles.badgeAlert : ''}`}
          >
            {badge}
          </span>
        ) : null}
      </button>
    </Tip>
  );
}

/**
 * Sidebar esquerda inspirada no Slack + Discord:
 * - Rail fixa com servidor + Chat + Pessoas no topo, e Temas + Perfil (avatar) + Recolher + Sair na base;
 * - Painel expansível e redimensionável, com modo amplo em 2 colunas para o chat no desktop.
 */
export function WorkspaceSidebar({
  serverName,
  serverIcon,
  floorName,
  session,
  status,
  appearance,
  wide,
  open,
  tab,
  unread,
  mentions,
  online,
  peopleMe,
  peopleOthers,
  peopleQuery,
  onPeopleQuery,
  onSelectTab,
  onToggleOpen,
  onClose,
  onGoToDesk,
  onOpenDm,
  accountOpen = false,
  onOpenAccount,
  onOpenServerSettings,
  onExit,
  onNotify,
  send,
}: Props) {
  const { t } = useI18n();
  const canConfigureServer =
    Boolean(onOpenServerSettings) &&
    canManageServer(
      session.user.tier ?? (session.user.admin ? 'admin' : 'tester'),
    );
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [resizing, setResizing] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const dragging = useRef(false);

  const isWideChat = wide && open && tab === 'chat' && chatExpanded;

  useEffect(() => {
    const onMove = (event: globalThis.PointerEvent) => {
      if (!dragging.current) return;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, event.clientX - 60));
      setWidth(next);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      setResizing(false);
      document.body.style.cursor = '';
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  useEffect(() => {
    if (!isWideChat) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setChatExpanded(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isWideChat]);

  const startResize = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    setChatExpanded(false);
    dragging.current = true;
    setResizing(true);
    document.body.style.cursor = 'col-resize';
  };

  const chatBadge =
    mentions > 0 ? `@${mentions}` : unread > 0 ? String(unread) : undefined;

  const myAppearance = appearance ?? defaultAppearance(session.user.email);

  const rail = (
    <nav className={styles.rail} aria-label="Servidores e navegação">
      {/* Topo: servidor e abas de comunicação */}
      <div className={styles.railGroup}>
        <Tip label={`${serverName} · Servidor atual`} placement="right">
          <button
            type="button"
            aria-label={`Servidor ${serverName}`}
            className={styles.serverBadge}
            onClick={onToggleOpen}
          >
            <span className={styles.serverPill} aria-hidden="true" />
            {serverIcon ? (
              <img
                src={serverIcon}
                alt={serverName}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: 'inherit',
                }}
              />
            ) : (
              <span className={styles.serverLetter}>
                {serverName.charAt(0).toUpperCase()}
              </span>
            )}
          </button>
        </Tip>

        {session.user.admin ? (
          <Tip label="Novo servidor (disponível na Fase 3)" placement="right">
            <button
              type="button"
              aria-label="Criar novo servidor"
              className={styles.addServerBtn}
              onClick={() =>
                onNotify(
                  'Criação de novos servidores e convites chega na próxima etapa (Fase 3).',
                )
              }
            >
              <Icon name="plus" size={16} color="var(--accent-link)" />
            </button>
          </Tip>
        ) : null}

        <div className={styles.railDivider} />

        <RailButton
          icon="chat"
          label="Canais e mensagens"
          active={open && tab === 'chat'}
          badge={chatBadge}
          badgeAlert={mentions > 0}
          onClick={() => onSelectTab('chat')}
        />
        <RailButton
          icon="people"
          label={`Pessoas (${online} online)`}
          active={open && tab === 'people'}
          badge={online > 0 ? String(online) : undefined}
          onClick={() => onSelectTab('people')}
        />
      </div>

      {/* Rodapé: perfil com avatar, recolher barra e sair */}
      <div className={styles.railGroup}>
        <Tip label="Perfil e conta" placement="right">
          <button
            type="button"
            aria-label="Perfil e conta"
            aria-pressed={accountOpen}
            onClick={onOpenAccount}
            className={`${styles.avatarRailBtn} ${accountOpen ? styles.avatarRailBtnActive : ''}`}
          >
            <FaceAvatar appearance={myAppearance} size={32} />
            <span
              className={styles.avatarStatusDot}
              style={{ backgroundColor: STATUS_COLORS[status] }}
            />
          </button>
        </Tip>

        <div className={styles.railDivider} />

        <RailButton
          icon={open ? 'chevronLeft' : 'chevronRight'}
          label={open ? 'Recolher barra lateral' : 'Expandir barra lateral'}
          active={false}
          onClick={onToggleOpen}
        />
        <RailButton
          icon="exit"
          label="Sair"
          active={false}
          danger
          onClick={onExit}
        />
      </div>
    </nav>
  );

  const drawerStyle = wide
    ? { width: isWideChat ? 'min(860px, calc(100vw - 96px))' : width }
    : undefined;

  const drawer = open ? (
    <aside
      className={`${styles.drawer} ${resizing ? styles.drawerResizing : ''} ${wide ? '' : styles.drawerMobile}`}
      style={drawerStyle}
      aria-label={`Painel ${serverName}`}
    >
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <span className={styles.workspaceName}>{serverName}</span>
          <span className={styles.floorTag}>{floorName}</span>
        </div>
        <div className={styles.headerActions}>
          {canConfigureServer ? (
            <Tip label={t('sidebar.serverSettings')} placement="top-end">
              <button
                type="button"
                className={styles.headerBtn}
                aria-label={t('sidebar.serverSettings')}
                onClick={onOpenServerSettings}
              >
                <Icon name="settings" size={16} color="var(--text-icon)" />
              </button>
            </Tip>
          ) : null}
          {wide && tab === 'chat' ? (
            <Tip
              label={
                chatExpanded
                  ? 'Reduzir visualização do chat'
                  : 'Expandir chat (2 colunas)'
              }
              placement="top-end"
            >
              <button
                type="button"
                className={`${styles.headerBtn} ${chatExpanded ? styles.headerBtnActive : ''}`}
                aria-label={chatExpanded ? 'Reduzir chat' : 'Expandir chat'}
                aria-pressed={chatExpanded}
                onClick={() => setChatExpanded((prev) => !prev)}
              >
                <Icon
                  name={chatExpanded ? 'shrink' : 'expand'}
                  size={15}
                  color="#ffffff"
                />
              </button>
            </Tip>
          ) : null}
          <Tip
            label={wide ? 'Recolher barra lateral' : 'Fechar painel'}
            placement="top-end"
          >
            <button
              type="button"
              className={styles.headerBtn}
              aria-label={wide ? 'Recolher barra lateral' : 'Fechar painel'}
              onClick={onClose}
            >
              <Icon name="chevronLeft" size={17} color="var(--text-icon)" />
            </button>
          </Tip>
        </div>
      </header>

      <div className={styles.body}>
        {tab === 'chat' ? (
          <SlackChatView
            send={send}
            expanded={isWideChat}
            userTier={
              session.user.tier ?? (session.user.admin ? 'admin' : 'tester')
            }
          />
        ) : (
          <PeoplePanel
            me={peopleMe}
            others={peopleOthers}
            online={online}
            query={peopleQuery}
            onQuery={onPeopleQuery}
            onGoToDesk={onGoToDesk}
            onMessage={onOpenDm}
            onClose={onClose}
            embedded
          />
        )}
      </div>

      {wide && !isWideChat ? (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar barra lateral"
          onPointerDown={startResize}
          className={styles.resizeHandle}
        />
      ) : null}
    </aside>
  ) : null;

  if (!wide) {
    if (!open) return null;
    return (
      <div className={styles.mobileBackdrop}>
        <div className={styles.mobileOverlay}>
          {rail}
          {drawer}
        </div>
        <button
          type="button"
          className={styles.mobileScrim}
          aria-label="Fechar menu lateral"
          onClick={onClose}
        />
      </div>
    );
  }

  return (
    <div className={styles.desktopShell}>
      {rail}
      {drawer}
    </div>
  );
}
