import { MOBILE_NAV_TABS, type MobileNavTab } from '@design-system';

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
import { Icon } from '@/shared/ui/Icon';

import type { PersonRow } from '../../model/people';
import { FaceAvatar } from '../FaceAvatar';
import { PeoplePanel } from '../PeoplePanel';
import styles from './MobileBottomNav.module.css';

const STATUS_COLORS: Record<Status, string> = {
  available: 'var(--status-available)',
  busy: 'var(--status-busy)',
  away: 'var(--status-away)',
};

type Props = {
  activeTab: MobileNavTab;
  onSelectTab: (tab: MobileNavTab) => void;
  serverName: string;
  floorName: string;
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
 * Navegação nativa mobile (Bottom Navigation no retrato, Rail lateral compacta na paisagem)
 * + telas em tela cheia de Chat e Pessoas com mini-barra de chamada ativa.
 */
export function MobileBottomNav({
  activeTab,
  onSelectTab,
  serverName,
  floorName,
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
  onOpenServerSettings,
  onExit,
  send,
  inActiveCall,
  callLabel,
  micOn,
  onToggleMic,
}: Props) {
  const { t } = useI18n();
  const canConfigureServer =
    Boolean(onOpenServerSettings) &&
    canManageServer(
      session.user.tier ?? (session.user.admin ? 'admin' : 'tester'),
    );
  const myAppearance = appearance ?? defaultAppearance(session.user.email);
  const chatBadge =
    mentions > 0 ? `@${mentions}` : unread > 0 ? String(unread) : undefined;

  const showOverlayPage = activeTab === 'chat' || activeTab === 'people';

  return (
    <>
      {showOverlayPage ? (
        <section
          className={styles.pageSheet}
          aria-label={activeTab === 'chat' ? 'Chat' : 'Pessoas'}
        >
          <header className={styles.sheetHeader}>
            <div className={styles.sheetTitleGroup}>
              <span className={styles.serverName}>{serverName}</span>
              <span className={styles.floorBadge}>{floorName}</span>
            </div>
            <div className={styles.sheetActions}>
              {canConfigureServer ? (
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label={t('sidebar.serverSettings')}
                  onClick={onOpenServerSettings}
                >
                  <Icon name="settings" size={16} color="var(--text-icon)" />
                </button>
              ) : null}
              <button
                type="button"
                className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                aria-label="Sair da conta"
                onClick={onExit}
              >
                <Icon name="exit" size={16} color="#ff9aa8" />
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
                  {callLabel ?? 'Em chamada'} · Toque para ver o mapa
                </span>
              </button>
              <button
                type="button"
                className={`${styles.callStripMic} ${micOn ? styles.callStripMicOn : ''}`}
                aria-label={micOn ? 'Desligar microfone' : 'Ligar microfone'}
                onClick={onToggleMic}
              >
                <Icon
                  name={micOn ? 'mic' : 'micOff'}
                  size={15}
                  color={micOn ? 'var(--call-on-icon)' : 'var(--call-off-icon)'}
                />
              </button>
            </div>
          ) : null}

          <div className={styles.sheetBody}>
            {activeTab === 'chat' ? (
              <SlackChatView
                send={send}
                expanded={false}
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
              <span className={styles.navIconWrap}>
                {item.id === 'account' ? (
                  <>
                    <FaceAvatar appearance={myAppearance} size={24} />
                    <span
                      className={styles.statusDot}
                      style={{ backgroundColor: STATUS_COLORS[status] }}
                    />
                  </>
                ) : (
                  <Icon
                    name={
                      item.id === 'map'
                        ? 'desk'
                        : item.id === 'chat'
                          ? 'chat'
                          : 'people'
                    }
                    size={20}
                    color={isActive ? '#ffffff' : 'var(--text-muted)'}
                  />
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
