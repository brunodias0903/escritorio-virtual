import { SIZES } from '@design-system';
import { useEffect, useRef, useState, type PointerEvent } from 'react';

import { SlackChatView } from '@/features/chat/components/SlackChatView';
import type { OfficeSend } from '@/pages/office/routeMessage';
import {
  canCreateServer,
  canManageServer,
  defaultAppearance,
  effectiveTiersOf,
  type Appearance,
  type DeskInfo,
  type Session,
  type Status,
  type WorkspaceServer,
} from '@/shared/domain';
import { useI18n } from '@/shared/i18n';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { Tip } from '@/shared/ui/Tip';

import type { PersonRow } from '../model/people';
import { FaceAvatar } from './FaceAvatar';
import { PeoplePanel } from './PeoplePanel';
import styles from './WorkspaceSidebar.module.css';

export type SidebarTab = 'channels' | 'people';

const MIN_WIDTH = SIZES.sidebarMin;
const MAX_WIDTH = SIZES.sidebarMax;
const DEFAULT_WIDTH = SIZES.sidebarDefault;

const STATUS_COLORS: Record<Status, string> = {
  available: 'var(--status-available)',
  busy: 'var(--status-busy)',
  coffee: '#e07a4b',
  lunch: '#f39c12',
  away: 'var(--status-away)',
};

type Props = {
  /** Nome do servidor/workspace ativo (padrão: Setter). */
  serverName: string;
  /** Ícone/foto customizada do servidor (opcional). */
  serverIcon?: string | null;
  servers?: WorkspaceServer[];
  activeServerId?: string;
  onSelectServer?: (id: string) => void;
  session: Session;
  status: Status;
  appearance: Appearance | undefined;
  /** Tela larga: sidebar encaixa à esquerda do mapa com redimensionamento. */
  wide: boolean;
  open: boolean;
  tab: SidebarTab;
  channelUnread: number;
  channelMentions: number;
  dmUnread: number;
  dmMentions: number;
  online: number;
  peopleMe: PersonRow | null;
  peopleOthers: PersonRow[];
  peopleQuery: string;
  onPeopleQuery: (query: string) => void;
  onSelectTab: (tab: SidebarTab) => void;
  onToggleOpen: () => void;
  onClose: () => void;
  onGoToDesk: (desk: DeskInfo) => void;
  onHoverDesk?: (desk: DeskInfo | null) => void;
  onOpenDm: (email: string) => void;
  accountOpen?: boolean;
  onOpenAccount: () => void;
  onOpenServerSettings?: () => void;
  onOpenCreateServer?: () => void;
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
  rotated = false,
  onClick,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  danger?: boolean;
  badge?: string;
  badgeAlert?: boolean;
  rotated?: boolean;
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
        <span
          className={`${styles.railIconWrap} ${rotated ? styles.railIconRotated : ''}`}
        >
          <Icon
            name={icon}
            size={20}
            color={
              danger
                ? 'var(--danger-text)'
                : active
                  ? '#ffffff'
                  : 'var(--text-icon)'
            }
          />
        </span>
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
 * - Ícone do servidor abre a aba de canais do servidor;
 * - Botão de mensagens abre exclusivamente as Mensagens diretas (DMs);
 * - Painel expansível e redimensionável com animações fluidas de abertura, recolhimento e 2 colunas.
 */
export function WorkspaceSidebar({
  serverName,
  serverIcon,
  servers = [],
  activeServerId = 'default',
  onSelectServer,
  session,
  status,
  appearance,
  wide,
  open,
  tab,
  channelUnread,
  channelMentions,
  dmUnread,
  dmMentions,
  online,
  peopleMe,
  peopleOthers,
  peopleQuery,
  onPeopleQuery,
  onSelectTab,
  onToggleOpen,
  onClose,
  onGoToDesk,
  onHoverDesk,
  onOpenDm,
  accountOpen = false,
  onOpenAccount,
  onOpenServerSettings,
  onOpenCreateServer,
  onExit,
  onNotify,
  send,
}: Props) {
  const { t } = useI18n();
  const userTiers = effectiveTiersOf(
    session.user.tier ?? (session.user.admin ? 'admin' : 'tester'),
    session.user.secondaryTiers,
  );
  const canConfigureServer =
    Boolean(onOpenServerSettings) && canManageServer(userTiers);
  const [width, setWidth] = useState<number>(DEFAULT_WIDTH);
  const [resizing, setResizing] = useState(false);
  const dragging = useRef(false);

  const isChatTab = tab === 'channels';
  const isWideChat = wide && open && isChatTab;
  const targetWidth = isWideChat ? 'clamp(520px, 46vw, 760px)' : `${width}px`;

  useEffect(() => {
    const onMove = (event: globalThis.PointerEvent) => {
      if (!dragging.current) return;
      const next = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, event.clientX - SIZES.railWidth),
      );
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

  const startResize = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragging.current = true;
    setResizing(true);
    document.body.style.cursor = 'col-resize';
  };

  const totalMentions = channelMentions + dmMentions;
  const totalUnread = channelUnread + dmUnread;
  const serverBadge =
    totalMentions > 0
      ? `@${totalMentions}`
      : totalUnread > 0
        ? String(totalUnread)
        : undefined;

  const myAppearance = appearance ?? defaultAppearance(session.user.email);
  const headerLabel = tab === 'people' ? 'Pessoas' : serverName;
  const defaultServer = servers.find((s) => s.id === 'default');
  const defaultServerName =
    defaultServer?.name ??
    (activeServerId === 'default' ? serverName : 'Setter');
  const isDefaultSelected = activeServerId === 'default';

  const rail = (
    <nav className={styles.rail} aria-label="Servidores e navegação">
      {/* Topo: servidor (canais e DMs) e pessoas */}
      <div className={styles.railGroup}>
        <Tip label={defaultServerName} placement="right">
          <button
            type="button"
            aria-label={`Servidor ${defaultServerName}`}
            aria-pressed={isDefaultSelected}
            className={`${styles.serverBadge} ${isDefaultSelected ? styles.serverBadgeOpen : ''}`}
            onClick={() => {
              if (!isDefaultSelected) onSelectServer?.('default');
              onSelectTab('channels');
            }}
          >
            <span
              className={`${styles.serverPill} ${isDefaultSelected ? styles.serverPillActive : ''}`}
              aria-hidden="true"
            />
            {isDefaultSelected && serverIcon ? (
              <img
                src={serverIcon}
                alt={defaultServerName}
                className={styles.serverIconImg}
              />
            ) : (
              <span className={styles.serverLetter}>
                {defaultServerName.charAt(0).toUpperCase()}
              </span>
            )}
            {isDefaultSelected && serverBadge ? (
              <span
                className={`${styles.badge} ${totalMentions > 0 ? styles.badgeAlert : ''}`}
              >
                {serverBadge}
              </span>
            ) : null}
          </button>
        </Tip>

        {servers
          .filter((srv) => srv.id !== 'default')
          .map((srv) => {
            const isSelected = srv.id === activeServerId;
            return (
              <Tip key={srv.id} label={srv.name} placement="right">
                <button
                  type="button"
                  aria-label={`Servidor ${srv.name}`}
                  aria-pressed={isSelected}
                  className={`${styles.serverBadge} ${isSelected ? styles.serverBadgeOpen : ''}`}
                  style={{ background: srv.accentColor }}
                  onClick={() => {
                    onSelectServer?.(srv.id);
                    onSelectTab('channels');
                  }}
                >
                  <span
                    className={`${styles.serverPill} ${isSelected ? styles.serverPillActive : ''}`}
                    aria-hidden="true"
                  />
                  <span className={styles.serverLetter}>
                    {srv.name.charAt(0).toUpperCase()}
                  </span>
                </button>
              </Tip>
            );
          })}

        <Tip
          label={
            canCreateServer(userTiers)
              ? 'Criar servidor ou entrar com convite'
              : 'Entrar em servidor com convite'
          }
          placement="right"
        >
          <button
            type="button"
            aria-label="Criar novo servidor"
            className={styles.addServerBtn}
            onClick={() => {
              if (onOpenCreateServer) {
                onOpenCreateServer();
              } else {
                onNotify('Criação de servidor indisponível neste contexto.');
              }
            }}
          >
            <Icon name="plus" size={16} color="var(--accent-link)" />
          </button>
        </Tip>

        <div className={styles.railDivider} />

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
          icon="chevronRight"
          label={open ? 'Recolher barra lateral' : 'Expandir barra lateral'}
          active={false}
          rotated={open}
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

  const drawerStyle = wide ? { width: open ? targetWidth : 0 } : undefined;

  const drawer = (
    <aside
      className={`${styles.drawer} ${open ? styles.drawerOpen : styles.drawerClosed} ${resizing ? styles.drawerResizing : ''} ${wide ? '' : styles.drawerMobile}`}
      style={drawerStyle}
      aria-label={`Painel ${headerLabel}`}
      aria-hidden={!open}
      inert={!open || undefined}
    >
      <div
        className={`${styles.drawerInner} ${open ? styles.drawerInnerOpen : styles.drawerInnerClosed}`}
        style={wide ? { width: targetWidth } : undefined}
      >
        <header className={styles.header}>
          <div className={styles.headerTitle}>
            <span className={styles.workspaceName}>{headerLabel}</span>
          </div>
          <div className={styles.headerActions}>
            {canConfigureServer && tab === 'channels' ? (
              <Tip label={t('sidebar.serverSettings')} placement="bottom-end">
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
            {!wide ? (
              <Tip label="Fechar painel" placement="bottom-end">
                <button
                  type="button"
                  className={styles.headerBtn}
                  aria-label="Fechar painel"
                  onClick={onClose}
                >
                  <Icon name="chevronLeft" size={17} color="var(--text-icon)" />
                </button>
              </Tip>
            ) : null}
          </div>
        </header>

        <div key={tab} className={styles.body}>
          {isChatTab ? (
            <SlackChatView
              send={send}
              section="all"
              expanded={isWideChat}
              userTier={userTiers[0] ?? 'tester'}
              userTiers={userTiers}
              token={session.token}
              onNotify={onNotify}
            />
          ) : (
            <PeoplePanel
              me={peopleMe}
              others={peopleOthers}
              online={online}
              query={peopleQuery}
              onQuery={onPeopleQuery}
              onGoToDesk={onGoToDesk}
              onHoverDesk={onHoverDesk}
              onMessage={onOpenDm}
              onClose={onClose}
              embedded
            />
          )}
        </div>
      </div>

      {wide && open && !isWideChat ? (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar barra lateral"
          onPointerDown={startResize}
          className={styles.resizeHandle}
        />
      ) : null}
    </aside>
  );

  if (!wide) {
    return (
      <div
        className={`${styles.mobileBackdrop} ${open ? styles.mobileBackdropOpen : styles.mobileBackdropClosed}`}
        aria-hidden={!open}
        inert={!open || undefined}
      >
        <div
          className={`${styles.mobileOverlay} ${open ? styles.mobileOverlayOpen : styles.mobileOverlayClosed}`}
        >
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
