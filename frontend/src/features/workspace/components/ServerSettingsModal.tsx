import {
  AlertCircle,
  Hash,
  Link2,
  Settings,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { workspaceApi } from '@/app/api';
import type {
  ManagedAccount,
  ManagedChannel,
  ServerInvite,
} from '@/features/workspace/api/workspaceApi';
import { useServerStore } from '@/features/workspace/model/serverStore';
import {
  canManageMembers,
  canModerateAccounts,
  effectiveTiersOf,
  errorMessage,
  type Session,
} from '@/shared/domain';
import { useI18n } from '@/shared/i18n';
import {
  ModalFrame,
  SettingsShell,
  SurfaceCard,
  type SettingsNavItem,
} from '@/shared/ui/tamagui';

import { ChannelsTab } from './server-settings/ChannelsTab';
import { GeneralTab } from './server-settings/GeneralTab';
import {
  InvitesTab,
  type InvitedEmailEntry,
} from './server-settings/InvitesTab';
import { MembersTab } from './server-settings/MembersTab';

type Props = {
  session: Session;
  onClose: () => void;
  onNotify: (msg: string) => void;
};

type Tab = 'members' | 'channels' | 'invites' | 'general';

/**
 * Painel administrativo do servidor reconstruído com Tamagui (`Dialog`, `Tabs`,
 * `Accordion`, `Select`, `Switch`, `AlertDialog`) e ícones Lucide.
 */
export function ServerSettingsModal({ session, onClose, onNotify }: Props) {
  const { t } = useI18n();
  const settings = useServerStore((s) => s.settings);
  const activeServerId = useServerStore((s) => s.activeServerId);

  const actorTiers = effectiveTiersOf(
    session.user.tier ?? (session.user.admin ? 'admin' : 'tester'),
    session.user.secondaryTiers,
  );
  const isMaster = canModerateAccounts(actorTiers);
  const canSeeMembers = canManageMembers(actorTiers);

  const [tab, setTab] = useState<Tab>(canSeeMembers ? 'members' : 'general');
  const [error, setError] = useState('');

  const [accounts, setAccounts] = useState<ManagedAccount[]>([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const [channels, setChannels] = useState<ManagedChannel[]>([]);
  const [channelsLoaded, setChannelsLoaded] = useState(false);

  const [invites, setInvites] = useState<ServerInvite[]>([]);
  const [invitedEmails, setInvitedEmails] = useState<InvitedEmailEntry[]>([]);
  const [invitesLoaded, setInvitesLoaded] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (tab !== 'channels' || channelsLoaded) return;
    let alive = true;
    void workspaceApi
      .listChannels(session.token, activeServerId)
      .then((res) => {
        if (!alive) return;
        setChannelsLoaded(true);
        if (res.ok) setChannels(res.data.channels);
        else setError(errorMessage(res.error));
      });
    return () => {
      alive = false;
    };
  }, [tab, channelsLoaded, session.token, activeServerId]);

  useEffect(() => {
    if ((tab !== 'members' && tab !== 'channels') || !canSeeMembers) return;
    if (tab === 'channels' && accountsLoaded) return;
    let alive = true;
    void workspaceApi
      .listAccounts(session.token, activeServerId)
      .then((res) => {
        if (!alive) return;
        setAccountsLoaded(true);
        if (res.ok) setAccounts(res.data.accounts);
        else setError(errorMessage(res.error));
      });
    return () => {
      alive = false;
    };
  }, [
    tab,
    canSeeMembers,
    session.token,
    refreshTick,
    accountsLoaded,
    activeServerId,
  ]);

  useEffect(() => {
    if (tab !== 'invites' || invitesLoaded) return;
    let alive = true;
    void Promise.all([
      workspaceApi.listServerInvites(session.token, activeServerId),
      workspaceApi.listInvitedEmails(session.token, activeServerId),
    ]).then(([res, emailRes]) => {
      if (!alive) return;
      setInvitesLoaded(true);
      setNowMs(Date.now());
      if (res.ok) setInvites(res.data.invites);
      else setError(errorMessage(res.error));
      if (emailRes.ok) setInvitedEmails(emailRes.data.emails);
    });
    return () => {
      alive = false;
    };
  }, [tab, invitesLoaded, session.token, activeServerId]);

  const activeChannelsCount = channels.filter((c) => !c.archived).length;
  const activeInvitesCount = invites.filter(
    (inv) =>
      !inv.revoked &&
      (inv.expiresAt === null || nowMs <= inv.expiresAt) &&
      (inv.maxUses === null || inv.uses < inv.maxUses),
  ).length;

  const navItems: SettingsNavItem<Tab>[] = [
    ...(canSeeMembers
      ? [
          {
            id: 'members' as const,
            label: t('server.tab.moderation'),
            icon: <Users size={16} aria-hidden={true} />,
            badge: accountsLoaded ? accounts.length : undefined,
          },
        ]
      : []),
    {
      id: 'channels',
      label: t('server.tab.channels'),
      icon: <Hash size={16} aria-hidden={true} />,
      badge: channelsLoaded ? activeChannelsCount : undefined,
    },
    {
      id: 'invites',
      label: 'Acesso e convites',
      icon: <Link2 size={16} aria-hidden={true} />,
      badge:
        invitesLoaded && activeInvitesCount > 0
          ? activeInvitesCount
          : undefined,
    },
    {
      id: 'general',
      label: t('server.tab.general'),
      icon: <SlidersHorizontal size={16} aria-hidden={true} />,
    },
  ];

  const sidebarHeader = (
    <XStack
      alignItems="center"
      gap="$2.5"
      paddingHorizontal="$1.5"
      paddingVertical="$1"
    >
      <YStack
        width={34}
        height={34}
        borderRadius="$lg"
        overflow="hidden"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
        borderWidth={1}
        borderColor="$accentBorderSoft"
        style={{ background: 'var(--server-gradient)' }}
      >
        {settings.icon ? (
          <img
            src={settings.icon}
            alt={settings.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Text
            fontFamily="$heading"
            fontSize="$4"
            fontWeight="800"
            color="#ffffff"
          >
            {(settings.name.trim()[0] ?? 'S').toUpperCase()}
          </Text>
        )}
      </YStack>
      <YStack flex={1} minWidth={0}>
        <Text
          fontFamily="$heading"
          fontSize="$3"
          fontWeight="700"
          color="$textPrimary"
          numberOfLines={1}
        >
          {settings.name || 'Setter'}
        </Text>
        <Text fontFamily="$body" fontSize="$1" color="$textMuted">
          Administração
        </Text>
      </YStack>
    </XStack>
  );

  const errorBanner = error ? (
    <SurfaceCard
      variant="danger"
      padding="$3"
      flexDirection="row"
      alignItems="center"
      gap="$2.5"
    >
      <AlertCircle size={16} color="var(--danger-text)" aria-hidden={true} />
      <Text fontFamily="$body" fontSize="$3" color="$dangerText" flex={1}>
        {error}
      </Text>
    </SurfaceCard>
  ) : null;

  return (
    <ModalFrame
      title={t('server.title')}
      subtitle={t('server.subtitle')}
      icon={
        <Settings size={18} color="var(--accent-link)" aria-hidden={true} />
      }
      maxWidth={920}
      height="min(680px, 86dvh)"
      maxHeight="86dvh"
      noPadding
      bodyScroll={false}
      onClose={onClose}
    >
      <SettingsShell
        activeTab={tab}
        onTabChange={(next) => {
          setTab(next);
          setError('');
        }}
        items={navItems}
        sidebarHeader={sidebarHeader}
        banner={errorBanner}
      >
        {tab === 'members' ? (
          <MembersTab
            session={session}
            isMaster={isMaster}
            canSeeMembers={canSeeMembers}
            accounts={accounts}
            loading={!accountsLoaded}
            onRefresh={() => {
              setAccountsLoaded(false);
              setRefreshTick((n) => n + 1);
            }}
            onAccountsChange={setAccounts}
            onError={setError}
            onNotify={onNotify}
          />
        ) : tab === 'channels' ? (
          <ChannelsTab
            session={session}
            activeServerId={activeServerId}
            canSeeMembers={canSeeMembers}
            channels={channels}
            accounts={accounts}
            loading={!channelsLoaded}
            onChannelsChange={setChannels}
            onError={setError}
            onNotify={onNotify}
          />
        ) : tab === 'invites' ? (
          <InvitesTab
            session={session}
            activeServerId={activeServerId}
            invites={invites}
            invitedEmails={invitedEmails}
            loading={!invitesLoaded}
            nowMs={nowMs}
            onInvitesChange={setInvites}
            onInvitedEmailsChange={setInvitedEmails}
            onError={setError}
            onNotify={onNotify}
          />
        ) : (
          <GeneralTab
            session={session}
            activeServerId={activeServerId}
            onClose={onClose}
            onError={setError}
            onNotify={onNotify}
          />
        )}
      </SettingsShell>
    </ModalFrame>
  );
}
