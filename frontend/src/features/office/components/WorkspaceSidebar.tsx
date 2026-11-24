import { SIZES } from '@design-system';
import { useEffect, useRef, useState, type PointerEvent } from 'react';

import { SlackChatView } from '@/features/chat/components/SlackChatView';
import type { OfficeSend } from '@/pages/office/routeMessage';
import {
  canManageServer,
  defaultAppearance,
  effectiveTiersOf,
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

export type SidebarTab = 'channels' | 'dms' | 'people';

const MIN_WIDTH = SIZES.sidebarMin;
const MAX_WIDTH = SIZES.sidebarMax;
const DEFAULT_WIDTH = SIZES.sidebarDefault;

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
            color={danger ? '#ff9aa8' : active ? '#ffffff' : 'var(--text-icon)'}
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
  onOpenDm,
  accountOpen = false,
  onOpenAccount,
  onOpenServerSettings,
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
  const [chatExpanded, setChatExpanded] = useState(false);
  const dragging = useRef(false);

  const isChatTab = tab === 'channels' || tab === 'dms';
  const isWideChat = wide && open && isChatTab && chatExpanded;
  const targetWidth = isWideChat
    ? 'min(860px, calc(100vw - 96px))'
    : `${width}px`;

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

  const channelsBadge =
    channelMentions > 0
      ? `@${channelMentions}`
      : channelUnread > 0
        ? String(channelUnread)
        : undefined;
  const dmBadge =
    dmMentions > 0
      ? `@${dmMentions}`
      : dmUnread > 0
        ? String(dmUnread)
        : undefined;

  const myAppearance = appearance ?? defaultAppearance(session.user.email);
  const channelsActive = open && tab === 'channels';
  const headerLabel =
    tab === 'dms'
      ? 'Mensagens diretas'
      : tab === 'people'
        ? 'Pessoas'
        : serverName;

  const rail = (
    <nav className={styles.rail} aria-label="Servidores e navegação">
      {/* Topo: servidor (canais), mensagens diretas e pessoas */}
      <div className={styles.railGroup}>
        <Tip label={`${serverName} · Canais do servidor`} placement="right">
          <button
            type="button"
            aria-label={`${serverName} — Canais do servidor`}
            aria-pressed={channelsActive}
            className={`${styles.serverBadge} ${channelsActive ? styles.serverBadgeOpen : ''}`}
            onClick={() => onSelectTab('channels')}
          >
            <span
              className={`${styles.serverPill} ${channelsActive ? styles.serverPillActive : ''}`}
              aria-hidden="true"
            />
            {serverIcon ? (
              <img
                src={serverIcon}
                alt={serverName}
                className={styles.serverIconImg}
              />
            ) : (
              <span className={styles.serverLetter}>
                {serverName.charAt(0).toUpperCase()}
              </span>
            )}
            {channelsBadge ? (
              <span
                className={`${styles.badge} ${channelMentions > 0 ? styles.badgeAlert : ''}`}
              >
                {channelsBadge}
              </span>
            ) : null}
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
          label="Mensagens diretas"
          active={open && tab === 'dms'}
          badge={dmBadge}
          badgeAlert={dmMentions > 0}
          onClick={() => onSelectTab('dms')}
        />
        <RailButton
          icon="people"
          label={`Pessoas (${online} online)`}
          active={open && tab === 'people'}
          badge={online > 0 ? String(online) : undefined}
          onClick={() => onSelectTab('people')}
        />
        {canConfigureServer && onOpenServerSettings ? (
          <RailButton
            icon="settings"
            label={t('sidebar.serverSettings')}
            active={false}
            onClick={onOpenServerSettings}
          />
        ) : null}
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
            {wide && isChatTab ? (
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

        <div key={tab} className={styles.body}>
          {isChatTab ? (
            <SlackChatView
              send={send}
              section={tab === 'dms' ? 'dms' : 'channels'}
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
