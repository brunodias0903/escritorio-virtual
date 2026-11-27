import {
  Armchair,
  Ban,
  Check,
  CircleDot,
  Clock,
  Crown,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Tags,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Button, Separator, Spinner, Text, XStack, YStack } from 'tamagui';

import { workspaceApi } from '@/app/api';
import type { ManagedAccount } from '@/features/workspace/api/workspaceApi';
import { useServerStore } from '@/features/workspace/model/serverStore';
import {
  ACCOUNT_TIER_COLORS,
  ACCOUNT_TIER_LABELS,
  ASSIGNABLE_TIERS,
  effectiveTiersOf,
  errorMessage,
  getMap,
  type AccountTier,
  type MapId,
  type ModerationAction,
  type Session,
} from '@/shared/domain';
import { useI18n } from '@/shared/i18n';
import {
  ActionButton,
  ConfirmDialog,
  EmptyState,
  IconButton,
  SelectField,
  StatusBadge,
  SurfaceCard,
  TextField,
} from '@/shared/ui/tamagui';

type MemberFilter = 'all' | 'online' | 'desk' | 'moderated';

type PendingModeration = {
  account: ManagedAccount;
  action: 'kick' | 'restrict' | 'ban' | 'remove';
};

const DURATION_OPTIONS = [
  { value: '15', label: '15 minutos' },
  { value: '60', label: '1 hora' },
  { value: '1440', label: '24 horas' },
  { value: '10080', label: '7 dias' },
] as const;

const STATUS_DOT_COLORS: Record<ManagedAccount['status'], string> = {
  available: '#31e0c1',
  busy: '#ff6b81',
  coffee: '#e07a4b',
  lunch: '#f39c12',
  away: '#f1c40f',
  offline: '#6b7280',
};

const safeMapName = (mapId: string | null): string => {
  if (!mapId) return '';
  try {
    return getMap(mapId as MapId).name;
  } catch {
    return mapId;
  }
};

type Props = {
  session: Session;
  isMaster: boolean;
  canSeeMembers: boolean;
  accounts: ManagedAccount[];
  loading: boolean;
  onRefresh: () => void;
  onAccountsChange: (
    updater: (prev: ManagedAccount[]) => ManagedAccount[],
  ) => void;
  onError: (msg: string) => void;
  onNotify: (msg: string) => void;
};

export function MembersTab({
  session,
  isMaster,
  canSeeMembers,
  accounts,
  loading,
  onRefresh,
  onAccountsChange,
  onError,
  onNotify,
}: Props) {
  const { t } = useI18n();
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('all');
  const [query, setQuery] = useState('');
  const [busyEmail, setBusyEmail] = useState<string | null>(null);

  // Editor de cargos inline (1 principal + secundários)
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [draftPrimaryTier, setDraftPrimaryTier] =
    useState<AccountTier>('tester');
  const [draftSecondaryTiers, setDraftSecondaryTiers] = useState<AccountTier[]>(
    [],
  );
  const [draftRoleTitle, setDraftRoleTitle] = useState('');

  // Diálogo dedicado de moderação / confirmação
  const [pendingMod, setPendingMod] = useState<PendingModeration | null>(null);
  const [modReason, setModReason] = useState('');
  const [restrictMinutes, setRestrictMinutes] = useState('60');

  const assignableForActor: readonly AccountTier[] = isMaster
    ? ASSIGNABLE_TIERS
    : ASSIGNABLE_TIERS.filter((tier) => tier !== 'admin');

  const onlineTotal = accounts.filter((a) => a.online).length;
  const withDeskTotal = accounts.filter((a) => a.desk !== null).length;
  const moderatedTotal = accounts.filter(
    (a) => a.bannedAt !== null || a.restrictedUntil !== null,
  ).length;

  const filteredAccounts = accounts.filter((acc) => {
    if (memberFilter === 'online' && !acc.online) return false;
    if (memberFilter === 'desk' && acc.desk === null) return false;
    if (
      memberFilter === 'moderated' &&
      acc.bannedAt === null &&
      acc.restrictedUntil === null
    ) {
      return false;
    }
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const allRoleLabels = [acc.tier, ...acc.secondaryTiers]
      .map((tier) => ACCOUNT_TIER_LABELS[tier].toLowerCase())
      .join(' ');
    return (
      acc.fullName.toLowerCase().includes(q) ||
      acc.nickname.toLowerCase().includes(q) ||
      acc.email.toLowerCase().includes(q) ||
      acc.role.toLowerCase().includes(q) ||
      allRoleLabels.includes(q)
    );
  });

  const openRoleEditor = (acc: ManagedAccount) => {
    if (editingEmail === acc.email) {
      setEditingEmail(null);
      return;
    }
    setEditingEmail(acc.email);
    setDraftPrimaryTier(acc.tier);
    setDraftSecondaryTiers(
      acc.secondaryTiers.filter((s) => s !== acc.tier && s !== 'master'),
    );
    setDraftRoleTitle(acc.role);
    onError('');
  };

  const selectPrimaryTier = (nextPrimary: AccountTier) => {
    setDraftPrimaryTier(nextPrimary);
    setDraftSecondaryTiers((prev) =>
      prev.filter((item) => item !== nextPrimary),
    );
  };

  const toggleSecondaryTier = (tier: AccountTier) => {
    if (tier === draftPrimaryTier || tier === 'master') return;
    setDraftSecondaryTiers((prev) =>
      prev.includes(tier) ? prev.filter((x) => x !== tier) : [...prev, tier],
    );
  };

  const activeServerId = useServerStore((s) => s.activeServerId);

  const handleSaveRoles = async (email: string) => {
    setBusyEmail(email);
    onError('');
    const res = await workspaceApi.updateAccountRoles(
      session.token,
      email,
      {
        tier: draftPrimaryTier,
        secondaryTiers: draftSecondaryTiers.filter(
          (s) => s !== draftPrimaryTier,
        ),
        role: draftRoleTitle.trim(),
      },
      activeServerId,
    );
    setBusyEmail(null);
    if (!res.ok) {
      onError(errorMessage(res.error));
      return;
    }
    const updated = res.data.account;
    onAccountsChange((prev) =>
      prev.map((a) => (a.email === email ? updated : a)),
    );
    setEditingEmail(null);
    onNotify(t('server.moderation.roles.saved'));
  };

  const handleModerateAccount = async (
    email: string,
    action: ModerationAction,
    reason?: string,
    durationMinutes?: number,
  ) => {
    setBusyEmail(email);
    onError('');
    const trimmedReason = reason?.trim() ?? '';
    const res = await workspaceApi.moderateAccount(session.token, email, {
      action,
      ...(trimmedReason ? { reason: trimmedReason } : {}),
      ...(action === 'restrict' && durationMinutes ? { durationMinutes } : {}),
    });
    setBusyEmail(null);
    setPendingMod(null);
    setModReason('');
    if (!res.ok) {
      onError(errorMessage(res.error));
      return;
    }
    if (action === 'remove') {
      onAccountsChange((prev) => prev.filter((a) => a.email !== email));
      if (editingEmail === email) setEditingEmail(null);
    } else if (res.data.account) {
      const updated = res.data.account;
      onAccountsChange((prev) =>
        prev.map((a) => (a.email === email ? updated : a)),
      );
    }
    const doneKeys = {
      ban: 'server.moderation.done.ban',
      unban: 'server.moderation.done.unban',
      kick: 'server.moderation.done.kick',
      restrict: 'server.moderation.done.restrict',
      unrestrict: 'server.moderation.done.unrestrict',
      remove: 'server.moderation.done.remove',
    } as const;
    onNotify(t(doneKeys[action]));
  };

  const handleReleaseDesk = async (email: string) => {
    setBusyEmail(email);
    onError('');
    const res = await workspaceApi.releaseAccountDesk(session.token, email);
    setBusyEmail(null);
    if (!res.ok) {
      onError(errorMessage(res.error));
      return;
    }
    onAccountsChange((prev) =>
      prev.map((a) => (a.email === email ? { ...a, desk: null } : a)),
    );
    onNotify(t('server.moderation.done.releaseDesk'));
  };

  const filterOptions: Array<{
    id: MemberFilter;
    label: string;
    count: number;
    icon: React.ReactNode;
  }> = [
    {
      id: 'all',
      label: t('server.moderation.filter.all'),
      count: accounts.length,
      icon: <Users size={13} aria-hidden={true} />,
    },
    {
      id: 'online',
      label: t('server.moderation.filter.online'),
      count: onlineTotal,
      icon: <CircleDot size={13} color="#31e0c1" aria-hidden={true} />,
    },
    {
      id: 'desk',
      label: t('server.moderation.filter.withDesk'),
      count: withDeskTotal,
      icon: <Armchair size={13} aria-hidden={true} />,
    },
    ...(moderatedTotal > 0
      ? [
          {
            id: 'moderated' as const,
            label: t('server.moderation.filter.moderated'),
            count: moderatedTotal,
            icon: (
              <ShieldAlert
                size={13}
                color="var(--danger-text)"
                aria-hidden={true}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <YStack gap="$4">
      <XStack
        alignItems="flex-start"
        justifyContent="space-between"
        gap="$3"
        flexWrap="wrap"
      >
        <YStack flex={1} gap="$1" minWidth={200}>
          <Text
            fontFamily="$heading"
            fontSize="$6"
            fontWeight="700"
            color="$textPrimary"
          >
            {t('server.tab.moderation')}
          </Text>
          <Text fontFamily="$body" fontSize="$3" color="$textMuted">
            {t('server.moderation.hint')}
          </Text>
        </YStack>
        <IconButton
          icon={<RefreshCw size={15} aria-hidden={true} />}
          aria-label={t('server.moderation.refresh')}
          title={t('server.moderation.refresh')}
          onPress={onRefresh}
        />
      </XStack>

      <YStack gap="$2.5">
        <XStack gap="$2" flexWrap="wrap" alignItems="center">
          {filterOptions.map((opt) => {
            const active = memberFilter === opt.id;
            return (
              <Button
                key={opt.id}
                paddingHorizontal="$3"
                paddingVertical="$1.5"
                minHeight={32}
                borderRadius="$pill"
                backgroundColor={active ? '$accentChip' : '$bgSurface'}
                borderColor={active ? '$accentBorderSoft' : '$borderSubtle'}
                borderWidth={1}
                cursor="pointer"
                onPress={() => setMemberFilter(opt.id)}
              >
                <XStack alignItems="center" gap="$1.5">
                  {opt.icon}
                  <Text
                    fontFamily="$body"
                    fontSize="$2"
                    fontWeight={active ? '700' : '600'}
                    color={active ? '$textPrimary' : '$textSecondary'}
                  >
                    {opt.label}
                  </Text>
                  <Text
                    fontFamily="$body"
                    fontSize="$1"
                    fontWeight="700"
                    color={active ? '$accentLink' : '$textMuted'}
                  >
                    {opt.count}
                  </Text>
                </XStack>
              </Button>
            );
          })}
        </XStack>

        <TextField
          id="server-members-search"
          compact
          value={query}
          onChangeText={setQuery}
          placeholder={t('server.moderation.search')}
          leadingIcon={
            <Search size={15} color="var(--text-muted)" aria-hidden={true} />
          }
        />
      </YStack>

      {loading ? (
        <XStack
          alignItems="center"
          justifyContent="center"
          padding="$6"
          gap="$2"
        >
          <Spinner size="small" color="$accent" />
          <Text fontFamily="$body" fontSize="$3" color="$textMuted">
            {t('common.loading')}
          </Text>
        </XStack>
      ) : filteredAccounts.length === 0 ? (
        <EmptyState
          icon={
            <Users size={20} color="var(--text-muted)" aria-hidden={true} />
          }
          title={t('server.moderation.empty')}
          description="Tente ajustar o filtro ou pesquisar por outro nome, e-mail ou cargo."
        />
      ) : (
        <YStack gap="$2.5">
          {filteredAccounts.map((acc) => {
            const isSelf = acc.email === session.user.email;
            const targetTiers = effectiveTiersOf(acc.tier, acc.secondaryTiers);
            const isTargetMaster = targetTiers.includes('master');
            const isTargetAdmin = targetTiers.includes('admin');
            const canEditRoles =
              !isSelf && !isTargetMaster && (isMaster || !isTargetAdmin);
            const canReleaseDesk =
              acc.desk !== null && (isMaster || !isTargetMaster);
            const canModerateTarget =
              canSeeMembers &&
              !isSelf &&
              !isTargetMaster &&
              (isMaster || !isTargetAdmin);
            const isBanned = acc.bannedAt !== null;
            const isRestricted = acc.restrictedUntil !== null;
            const busy = busyEmail === acc.email;
            const isEditing = editingEmail === acc.email;

            return (
              <SurfaceCard key={acc.email} padding="$3.5" gap="$3">
                <XStack
                  alignItems="flex-start"
                  justifyContent="space-between"
                  gap="$3"
                  flexWrap="wrap"
                >
                  <XStack alignItems="center" gap="$3" flex={1} minWidth={220}>
                    <YStack position="relative" flexShrink={0}>
                      <YStack
                        width={40}
                        height={40}
                        borderRadius="$pill"
                        backgroundColor="$bgControl"
                        borderWidth={1}
                        borderColor="$borderSubtle"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Text
                          fontFamily="$heading"
                          fontSize="$4"
                          fontWeight="700"
                          color="$textPrimary"
                        >
                          {(acc.fullName.trim()[0] ?? 'U').toUpperCase()}
                        </Text>
                      </YStack>
                      <YStack
                        position="absolute"
                        right={-1}
                        bottom={-1}
                        width={11}
                        height={11}
                        borderRadius="$pill"
                        backgroundColor={STATUS_DOT_COLORS[acc.status]}
                        borderWidth={2}
                        borderColor="$bgSurface"
                      />
                    </YStack>

                    <YStack flex={1} gap="$0.5" minWidth={0}>
                      <XStack alignItems="center" gap="$2" flexWrap="wrap">
                        <Text
                          fontFamily="$heading"
                          fontSize="$4"
                          fontWeight="700"
                          color="$textPrimary"
                        >
                          {acc.fullName}
                        </Text>
                        {isSelf ? (
                          <StatusBadge tone="accent">Você</StatusBadge>
                        ) : null}
                      </XStack>
                      <Text
                        fontFamily="$body"
                        fontSize="$2"
                        color="$textMuted"
                        numberOfLines={2}
                      >
                        @{acc.nickname} · {acc.email}
                        {acc.role ? ` · ${acc.role}` : ''}
                        {' · '}
                        {acc.online
                          ? `${t('server.moderation.online')}${acc.map ? ` (${safeMapName(acc.map)})` : ''}`
                          : t('server.moderation.offline')}
                      </Text>
                    </YStack>
                  </XStack>

                  <XStack gap="$1.5" flexWrap="wrap" alignItems="center">
                    <StatusBadge
                      tone={
                        isBanned
                          ? 'danger'
                          : isRestricted
                            ? 'warning'
                            : 'success'
                      }
                    >
                      {isBanned
                        ? t('server.moderation.status.banned')
                        : isRestricted
                          ? t('server.moderation.status.restricted')
                          : t('server.moderation.status.active')}
                    </StatusBadge>
                    {acc.desk ? (
                      <StatusBadge
                        tone="accent"
                        icon={<Armchair size={12} aria-hidden={true} />}
                      >
                        {acc.desk.label || acc.desk.deskId}
                      </StatusBadge>
                    ) : null}
                  </XStack>
                </XStack>

                <XStack gap="$1.5" flexWrap="wrap" alignItems="center">
                  <XStack
                    alignItems="center"
                    gap="$1.5"
                    paddingHorizontal="$2.5"
                    paddingVertical="$1"
                    borderRadius="$pill"
                    borderWidth={1}
                    style={{
                      borderColor: `${ACCOUNT_TIER_COLORS[acc.tier]}88`,
                      backgroundColor: `${ACCOUNT_TIER_COLORS[acc.tier]}22`,
                    }}
                  >
                    {acc.tier === 'master' ? (
                      <Crown
                        size={12}
                        color={ACCOUNT_TIER_COLORS[acc.tier]}
                        aria-hidden={true}
                      />
                    ) : (
                      <Shield
                        size={12}
                        color={ACCOUNT_TIER_COLORS[acc.tier]}
                        aria-hidden={true}
                      />
                    )}
                    <Text
                      fontFamily="$body"
                      fontSize="$2"
                      fontWeight="700"
                      color="$textPrimary"
                    >
                      {ACCOUNT_TIER_LABELS[acc.tier]}
                    </Text>
                  </XStack>

                  {acc.secondaryTiers.map((sec) => (
                    <StatusBadge
                      key={sec}
                      tone="neutral"
                      dotColor={ACCOUNT_TIER_COLORS[sec]}
                    >
                      {ACCOUNT_TIER_LABELS[sec]}
                    </StatusBadge>
                  ))}
                </XStack>

                {isBanned && acc.banReason ? (
                  <Text fontFamily="$body" fontSize="$2" color="$dangerText">
                    {t('server.moderation.status.banned')}: {acc.banReason}
                  </Text>
                ) : null}
                {!isBanned && isRestricted && acc.restrictionReason ? (
                  <Text fontFamily="$body" fontSize="$2" color="$warningText">
                    {t('server.moderation.status.restricted')}:{' '}
                    {acc.restrictionReason}
                  </Text>
                ) : null}

                {isEditing && canEditRoles ? (
                  <SurfaceCard variant="elevated" padding="$3.5" gap="$3">
                    <YStack gap="$2">
                      <XStack alignItems="center" gap="$1.5">
                        <ShieldCheck
                          size={14}
                          color="var(--accent-link)"
                          aria-hidden={true}
                        />
                        <Text
                          fontFamily="$body"
                          fontSize="$3"
                          fontWeight="700"
                          color="$textSecondary"
                        >
                          {t('server.moderation.roles.primary')}
                        </Text>
                      </XStack>
                      <XStack flexWrap="wrap" gap="$1.5">
                        {assignableForActor.map((tier) => {
                          const active = draftPrimaryTier === tier;
                          return (
                            <Button
                              key={tier}
                              paddingHorizontal="$2.5"
                              paddingVertical="$1.5"
                              minHeight={30}
                              borderRadius="$pill"
                              borderWidth={1}
                              backgroundColor="$bgControl"
                              borderColor="$borderSubtle"
                              cursor="pointer"
                              style={
                                active
                                  ? {
                                      borderColor: `${ACCOUNT_TIER_COLORS[tier]}bb`,
                                      backgroundColor: `${ACCOUNT_TIER_COLORS[tier]}2c`,
                                    }
                                  : undefined
                              }
                              onPress={() => selectPrimaryTier(tier)}
                            >
                              <XStack alignItems="center" gap="$1.5">
                                <YStack
                                  width={7}
                                  height={7}
                                  borderRadius="$pill"
                                  backgroundColor={ACCOUNT_TIER_COLORS[tier]}
                                />
                                <Text
                                  fontFamily="$body"
                                  fontSize="$2"
                                  fontWeight={active ? '700' : '500'}
                                  color={
                                    active ? '$textPrimary' : '$textSecondary'
                                  }
                                >
                                  {ACCOUNT_TIER_LABELS[tier]}
                                </Text>
                              </XStack>
                            </Button>
                          );
                        })}
                      </XStack>
                    </YStack>

                    <Separator
                      flex={0}
                      width="100%"
                      borderColor="$borderSubtle"
                    />

                    <YStack gap="$2">
                      <Text
                        fontFamily="$body"
                        fontSize="$3"
                        fontWeight="700"
                        color="$textSecondary"
                      >
                        {t('server.moderation.roles.secondary')}
                      </Text>
                      <Text fontFamily="$body" fontSize="$2" color="$textMuted">
                        {t('server.moderation.roles.secondaryHint')}
                      </Text>
                      <XStack flexWrap="wrap" gap="$1.5">
                        {assignableForActor
                          .filter((tier) => tier !== draftPrimaryTier)
                          .map((tier) => {
                            const active = draftSecondaryTiers.includes(tier);
                            return (
                              <Button
                                key={tier}
                                paddingHorizontal="$2.5"
                                paddingVertical="$1.5"
                                minHeight={30}
                                borderRadius="$pill"
                                borderWidth={1}
                                backgroundColor="$bgControl"
                                borderColor="$borderSubtle"
                                cursor="pointer"
                                style={
                                  active
                                    ? {
                                        borderColor: `${ACCOUNT_TIER_COLORS[tier]}99`,
                                        backgroundColor: `${ACCOUNT_TIER_COLORS[tier]}22`,
                                      }
                                    : undefined
                                }
                                onPress={() => toggleSecondaryTier(tier)}
                              >
                                <XStack alignItems="center" gap="$1.5">
                                  {active ? (
                                    <Check
                                      size={12}
                                      color={ACCOUNT_TIER_COLORS[tier]}
                                      aria-hidden={true}
                                    />
                                  ) : (
                                    <Plus
                                      size={12}
                                      color="var(--text-muted)"
                                      aria-hidden={true}
                                    />
                                  )}
                                  <Text
                                    fontFamily="$body"
                                    fontSize="$2"
                                    fontWeight={active ? '700' : '500'}
                                    color={
                                      active ? '$textPrimary' : '$textSecondary'
                                    }
                                  >
                                    {ACCOUNT_TIER_LABELS[tier]}
                                  </Text>
                                </XStack>
                              </Button>
                            );
                          })}
                      </XStack>
                    </YStack>

                    <TextField
                      id={`role-title-${acc.email}`}
                      compact
                      label={t('server.moderation.roles.jobTitle')}
                      value={draftRoleTitle}
                      onChangeText={setDraftRoleTitle}
                      maxLength={60}
                      placeholder="Ex.: Tech Lead, QA, UI/UX"
                    />

                    <XStack justifyContent="flex-end" gap="$2">
                      <ActionButton
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        onPress={() => setEditingEmail(null)}
                      >
                        {t('common.cancel')}
                      </ActionButton>
                      <ActionButton
                        size="sm"
                        loading={busy}
                        onPress={() => void handleSaveRoles(acc.email)}
                      >
                        {t('server.moderation.roles.save')}
                      </ActionButton>
                    </XStack>
                  </SurfaceCard>
                ) : null}

                {canEditRoles || canReleaseDesk || canModerateTarget ? (
                  <>
                    <Separator
                      flex={0}
                      width="100%"
                      borderColor="$borderSubtle"
                    />
                    <XStack gap="$2" flexWrap="wrap" alignItems="center">
                      {canEditRoles ? (
                        <ActionButton
                          variant={isEditing ? 'primary' : 'secondary'}
                          size="sm"
                          disabled={busy}
                          icon={<Tags size={13} aria-hidden={true} />}
                          onPress={() => openRoleEditor(acc)}
                        >
                          {t('server.moderation.roles.edit')}
                        </ActionButton>
                      ) : null}

                      {canReleaseDesk ? (
                        <ActionButton
                          variant="secondary"
                          size="sm"
                          disabled={busy}
                          icon={<Armchair size={13} aria-hidden={true} />}
                          onPress={() => void handleReleaseDesk(acc.email)}
                        >
                          {t('server.moderation.action.releaseDesk')}
                        </ActionButton>
                      ) : null}

                      {canModerateTarget ? (
                        <>
                          {!isBanned ? (
                            <>
                              <ActionButton
                                variant="secondary"
                                size="sm"
                                disabled={busy}
                                icon={<UserX size={13} aria-hidden={true} />}
                                onPress={() => {
                                  setModReason('');
                                  setPendingMod({
                                    account: acc,
                                    action: 'kick',
                                  });
                                }}
                              >
                                {t('server.moderation.action.kick')}
                              </ActionButton>
                              {isRestricted ? (
                                <ActionButton
                                  variant="secondary"
                                  size="sm"
                                  disabled={busy}
                                  icon={
                                    <UserCheck size={13} aria-hidden={true} />
                                  }
                                  onPress={() =>
                                    void handleModerateAccount(
                                      acc.email,
                                      'unrestrict',
                                    )
                                  }
                                >
                                  {t('server.moderation.action.unrestrict')}
                                </ActionButton>
                              ) : (
                                <ActionButton
                                  variant="warning"
                                  size="sm"
                                  disabled={busy}
                                  icon={<Clock size={13} aria-hidden={true} />}
                                  onPress={() => {
                                    setModReason('');
                                    setRestrictMinutes('60');
                                    setPendingMod({
                                      account: acc,
                                      action: 'restrict',
                                    });
                                  }}
                                >
                                  {t('server.moderation.action.restrict')}
                                </ActionButton>
                              )}
                              <ActionButton
                                variant="danger"
                                size="sm"
                                disabled={busy}
                                icon={<Ban size={13} aria-hidden={true} />}
                                onPress={() => {
                                  setModReason('');
                                  setPendingMod({
                                    account: acc,
                                    action: 'ban',
                                  });
                                }}
                              >
                                {t('server.moderation.action.ban')}
                              </ActionButton>
                            </>
                          ) : (
                            <ActionButton
                              variant="secondary"
                              size="sm"
                              disabled={busy}
                              icon={<UserCheck size={13} aria-hidden={true} />}
                              onPress={() =>
                                void handleModerateAccount(acc.email, 'unban')
                              }
                            >
                              {t('server.moderation.action.unban')}
                            </ActionButton>
                          )}

                          {isMaster ? (
                            <ActionButton
                              variant="danger"
                              size="sm"
                              disabled={busy}
                              icon={<Trash2 size={13} aria-hidden={true} />}
                              onPress={() => {
                                setModReason('');
                                setPendingMod({
                                  account: acc,
                                  action: 'remove',
                                });
                              }}
                            >
                              {t('server.moderation.action.remove')}
                            </ActionButton>
                          ) : null}
                        </>
                      ) : null}
                    </XStack>
                  </>
                ) : null}
              </SurfaceCard>
            );
          })}
        </YStack>
      )}

      {pendingMod ? (
        <ConfirmDialog
          open
          tone={
            pendingMod.action === 'ban' || pendingMod.action === 'remove'
              ? 'danger'
              : 'warning'
          }
          title={
            pendingMod.action === 'restrict'
              ? `Restringir ${pendingMod.account.fullName}`
              : pendingMod.action === 'ban'
                ? `Banir ${pendingMod.account.fullName}`
                : pendingMod.action === 'kick'
                  ? `Desconectar ${pendingMod.account.fullName}`
                  : `Remover conta de ${pendingMod.account.fullName}`
          }
          description={
            pendingMod.action === 'restrict'
              ? 'O membro ficará temporariamente bloqueado de acessar o servidor.'
              : pendingMod.action === 'ban'
                ? 'O acesso será bloqueado e a mesa ocupada será liberada automaticamente.'
                : pendingMod.action === 'kick'
                  ? 'A sessão ativa deste membro será encerrada imediatamente.'
                  : 'Esta ação remove permanentemente a conta e libera a mesa ocupada.'
          }
          confirmLabel={
            pendingMod.action === 'restrict'
              ? t('server.moderation.action.restrict')
              : pendingMod.action === 'ban'
                ? t('server.moderation.action.ban')
                : pendingMod.action === 'kick'
                  ? t('server.moderation.action.kick')
                  : t('server.moderation.action.confirmRemove')
          }
          loading={busyEmail === pendingMod.account.email}
          onCancel={() => setPendingMod(null)}
          onConfirm={() =>
            void handleModerateAccount(
              pendingMod.account.email,
              pendingMod.action,
              modReason,
              pendingMod.action === 'restrict'
                ? Number(restrictMinutes)
                : undefined,
            )
          }
        >
          {pendingMod.action === 'restrict' ? (
            <SelectField
              id="mod-restrict-duration"
              label={t('server.moderation.duration')}
              value={restrictMinutes}
              options={DURATION_OPTIONS}
              onValueChange={setRestrictMinutes}
            />
          ) : null}
          {pendingMod.action !== 'remove' ? (
            <TextField
              id="mod-reason-input"
              label={t('server.moderation.reason')}
              value={modReason}
              onChangeText={setModReason}
              maxLength={200}
              placeholder="Descreva brevemente o motivo (opcional)"
            />
          ) : null}
        </ConfirmDialog>
      ) : null}
    </YStack>
  );
}
