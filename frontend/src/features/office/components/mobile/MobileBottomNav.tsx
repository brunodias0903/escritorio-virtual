import { MOBILE_NAV_TABS, type MobileNavTab } from '@design-system';
import {
  Bell,
  Check,
  ChevronDown,
  Compass,
  LogOut,
  MessageSquare,
  Mic,
  MicOff,
  Palette,
  Plus,
  Settings,
  Users,
} from 'lucide-react';
import { useState } from 'react';

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
  type WorkspaceServer,
} from '@/shared/domain';
import { useI18n } from '@/shared/i18n';
import {
  canRequestNotificationPermission,
  requestNotificationPermission,
} from '@/shared/lib/pwaNotifications';

import type { PersonRow } from '../../model/people';
import { FaceAvatar } from '../FaceAvatar';
import { PeoplePanel } from '../PeoplePanel';
import styles from './MobileBottomNav.module.css';

const STATUS_COLORS: Record<Status, string> = {
  available: 'var(--status-available)',
  busy: 'var(--status-busy)',
  coffee: '#e07a4b',
  lunch: '#f39c12',
  away: 'var(--status-away)',
};

const STATUS_LABELS: Record<Status, string> = {
  available: 'Online',
  busy: 'Ocupado',
  coffee: 'Café',
  lunch: 'Almoço',
  away: 'Ausente',
};

type Props = {
  activeTab: MobileNavTab;
  onSelectTab: (tab: MobileNavTab) => void;
  serverName: string;
  servers?: WorkspaceServer[];
  activeServerId?: string;
  onSelectServer?: (serverId: string) => void;
  onCreateOrJoinServer?: () => void;
  session: Session;
  status: Status;
  appearance: Appearance | undefined;
  unread: number;
  mentions: number;
  online: number;
  peopleMe: PersonRow | null;
  peopleOthers: PersonRow[];
  peopleQuery: string;
  onPeopleQuery: (query: string) => void;
  onGoToDesk: (desk: DeskInfo) => void;
  onOpenDm: (email: string) => void;
  onOpenAccount: () => void;
  onOpenTheme?: () => void;
  onOpenServerSettings?: () => void;
  onExit: () => void;
  send: OfficeSend;
  /** Quando em chamada ativa e fora da aba Mapa, mostra mini-barra estilo Discord/Slack. */
  inActiveCall: boolean;
  callLabel: string | null;
  micOn: boolean;
  onToggleMic: () => void;
};

/**
 * Shell nativo mobile/PWA:
 * - Header flutuante no mapa com seletor de servidor, status, notificações e tema;
 * - Bottom sheet para alternância rápida entre servidores ou entrada por convite;
 * - Dock flutuante inferior com pílula ativa adaptada a temas claros e escuros;
 * - Telas em tela cheia de Chat e Pessoas com mini-barra de chamada ativa.
 */
export function MobileBottomNav({
  activeTab,
  onSelectTab,
  serverName,
  servers = [],
  activeServerId = 'default',
  onSelectServer,
  onCreateOrJoinServer,
  session,
  status,
  appearance,
  unread,
  mentions,
  online,
  peopleMe,
  peopleOthers,
  peopleQuery,
  onPeopleQuery,
  onGoToDesk,
  onOpenDm,
  onOpenAccount,
  onOpenTheme,
  onOpenServerSettings,
  onExit,
  send,
  inActiveCall,
  callLabel,
  micOn,
  onToggleMic,
}: Props) {
  const { t } = useI18n();
  const [serverSheetOpen, setServerSheetOpen] = useState(false);
  const [notifyAskable, setNotifyAskable] = useState(() =>
    canRequestNotificationPermission(),
  );

  const userTiers = effectiveTiersOf(
    session.user.tier ?? (session.user.admin ? 'admin' : 'tester'),
    session.user.secondaryTiers,
  );
  const canConfigureServer =
    Boolean(onOpenServerSettings) && canManageServer(userTiers);
  const myAppearance = appearance ?? defaultAppearance(session.user.email);
  const chatBadge =
    mentions > 0 ? `@${mentions}` : unread > 0 ? String(unread) : undefined;

  const showOverlayPage = activeTab === 'chat' || activeTab === 'people';
  const activeServer = servers.find((s) => s.id === activeServerId);

  const handleEnableNotifications = async () => {
    await requestNotificationPermission();
    setNotifyAskable(canRequestNotificationPermission());
  };

  return (
    <>
      {activeTab === 'map' ? (
        <header className={styles.mapTopBar} aria-label="Barra superior">
          <button
            type="button"
            className={styles.serverPill}
            onClick={() => setServerSheetOpen(true)}
            aria-label="Trocar servidor"
          >
            <span
              className={styles.serverDot}
              style={{
                backgroundColor: activeServer?.accentColor ?? 'var(--accent)',
              }}
            />
            <span className={styles.serverPillName}>{serverName}</span>
            <ChevronDown size={14} className={styles.serverChevron} />
          </button>

          <div className={styles.mapTopActions}>
            <div className={styles.statusChip} title={STATUS_LABELS[status]}>
              <span
                className={styles.statusChipDot}
                style={{ backgroundColor: STATUS_COLORS[status] }}
              />
              <span className={styles.statusChipText}>
                {STATUS_LABELS[status]}
              </span>
            </div>

            {notifyAskable ? (
              <button
                type="button"
                className={styles.topIconBtn}
                aria-label="Ativar notificações"
                title="Ativar notificações do app"
                onClick={() => void handleEnableNotifications()}
              >
                <Bell size={16} />
              </button>
            ) : null}

            {onOpenTheme ? (
              <button
                type="button"
                className={styles.topIconBtn}
                aria-label="Aparência e tema"
                onClick={onOpenTheme}
              >
                <Palette size={16} />
              </button>
            ) : null}
          </div>
        </header>
      ) : null}

      {showOverlayPage ? (
        <section
          className={styles.pageSheet}
          aria-label={activeTab === 'chat' ? 'Chat' : 'Pessoas'}
        >
          <header className={styles.sheetHeader}>
            <div className={styles.sheetTitleGroup}>
              <button
                type="button"
                className={styles.sheetServerBtn}
                onClick={() => setServerSheetOpen(true)}
              >
                <span
                  className={styles.serverDot}
                  style={{
                    backgroundColor:
                      activeServer?.accentColor ?? 'var(--accent)',
                  }}
                />
                <span className={styles.serverName}>{serverName}</span>
                <ChevronDown size={14} />
              </button>
              <span className={styles.sheetSubtitle}>
                {activeTab === 'chat'
                  ? 'Canais e mensagens'
                  : `${online} online agora`}
              </span>
            </div>
            <div className={styles.sheetActions}>
              {onOpenTheme ? (
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label="Aparência e tema"
                  onClick={onOpenTheme}
                >
                  <Palette size={16} />
                </button>
              ) : null}
              {canConfigureServer ? (
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label={t('sidebar.serverSettings')}
                  onClick={onOpenServerSettings}
                >
                  <Settings size={16} />
                </button>
              ) : null}
              <button
                type="button"
                className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                aria-label="Sair da conta"
                onClick={onExit}
              >
                <LogOut size={16} />
              </button>
            </div>
          </header>

          {inActiveCall ? (
            <div className={styles.activeCallStrip}>
              <button
                type="button"
                className={styles.callStripInfo}
                onClick={() => onSelectTab('map')}
              >
                <span className={styles.callPulse} aria-hidden="true" />
                <span className={styles.callStripText}>
                  {callLabel ?? 'Em chamada'} · Ver mapa
                </span>
              </button>
              <button
                type="button"
                className={`${styles.callStripMic} ${micOn ? styles.callStripMicOn : ''}`}
                aria-label={micOn ? 'Desligar microfone' : 'Ligar microfone'}
                onClick={onToggleMic}
              >
                {micOn ? <Mic size={15} /> : <MicOff size={15} />}
              </button>
            </div>
          ) : null}

          <div className={styles.sheetBody}>
            {activeTab === 'chat' ? (
              <SlackChatView
                send={send}
                section="all"
                expanded={false}
                userTier={userTiers[0] ?? 'tester'}
                userTiers={userTiers}
                token={session.token}
              />
            ) : (
              <PeoplePanel
                me={peopleMe}
                others={peopleOthers}
                online={online}
                query={peopleQuery}
                onQuery={onPeopleQuery}
                onGoToDesk={(desk) => {
                  onGoToDesk(desk);
                  onSelectTab('map');
                }}
                onMessage={(email) => {
                  onOpenDm(email);
                  onSelectTab('chat');
                }}
                onClose={() => onSelectTab('map')}
                embedded
              />
            )}
          </div>
        </section>
      ) : null}

      {serverSheetOpen ? (
        <div
          className={styles.sheetBackdrop}
          role="dialog"
          aria-modal="true"
          aria-label="Selecionar servidor"
          onClick={() => setServerSheetOpen(false)}
        >
          <div
            className={styles.serverDrawer}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.drawerHandle} aria-hidden="true" />
            <div className={styles.drawerHeader}>
              <span className={styles.drawerTitle}>Seus servidores</span>
              {canConfigureServer ? (
                <button
                  type="button"
                  className={styles.drawerActionBtn}
                  onClick={() => {
                    setServerSheetOpen(false);
                    onOpenServerSettings?.();
                  }}
                >
                  <Settings size={14} />
                  Configurar
                </button>
              ) : null}
            </div>
            <div className={styles.serverList}>
              {(servers.length > 0
                ? servers
                : [
                    {
                      id: 'default',
                      name: serverName,
                      accentColor: '#5b6cff',
                    },
                  ]
              ).map((srv) => {
                const selected = srv.id === activeServerId;
                return (
                  <button
                    key={srv.id}
                    type="button"
                    className={`${styles.serverRow} ${selected ? styles.serverRowActive : ''}`}
                    onClick={() => {
                      onSelectServer?.(srv.id);
                      setServerSheetOpen(false);
                    }}
                  >
                    <span
                      className={styles.serverAvatar}
                      style={{ backgroundColor: srv.accentColor }}
                    >
                      {srv.name.trim()[0]?.toUpperCase() ?? 'S'}
                    </span>
                    <span className={styles.serverRowName}>{srv.name}</span>
                    {selected ? (
                      <Check size={16} className={styles.serverCheck} />
                    ) : null}
                  </button>
                );
              })}
            </div>
            {onCreateOrJoinServer ? (
              <button
                type="button"
                className={styles.createServerBtn}
                onClick={() => {
                  setServerSheetOpen(false);
                  onCreateOrJoinServer();
                }}
              >
                <Plus size={16} />
                Criar ou entrar com convite
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <nav className={styles.navBar} aria-label="Navegação principal">
        {MOBILE_NAV_TABS.map((item) => {
          const isActive = item.id === activeTab;
          const badge =
            item.id === 'chat'
              ? chatBadge
              : item.id === 'people' && online > 0
                ? String(online)
                : undefined;

          return (
            <button
              key={item.id}
              type="button"
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                if (item.id === 'account') {
                  onOpenAccount();
                } else {
                  onSelectTab(item.id);
                }
              }}
            >
              <span
                className={`${styles.navIconWrap} ${isActive ? styles.navIconActive : ''}`}
              >
                {item.id === 'account' ? (
                  <>
                    <FaceAvatar appearance={myAppearance} size={22} />
                    <span
                      className={styles.statusDot}
                      style={{ backgroundColor: STATUS_COLORS[status] }}
                    />
                  </>
                ) : item.id === 'map' ? (
                  <Compass size={19} strokeWidth={isActive ? 2.4 : 1.9} />
                ) : item.id === 'chat' ? (
                  <MessageSquare size={19} strokeWidth={isActive ? 2.4 : 1.9} />
                ) : (
                  <Users size={19} strokeWidth={isActive ? 2.4 : 1.9} />
                )}
                {badge ? (
                  <span
                    className={`${styles.badge} ${item.id === 'chat' && mentions > 0 ? styles.badgeAlert : ''}`}
                  >
                    {badge}
                  </span>
                ) : null}
              </span>
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
