import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  Eye,
  GripVertical,
  Hash,
  Lock,
  MessageSquare,
  PenLine,
  Plus,
  Save,
  Trash2,
  UserCog,
} from 'lucide-react';
import { useState, type DragEvent, type FormEvent } from 'react';
import {
  Accordion,
  Button,
  Separator,
  Spinner,
  Text,
  XStack,
  YStack,
} from 'tamagui';

import { workspaceApi } from '@/app/api';
import type {
  ManagedAccount,
  ManagedChannel,
} from '@/features/workspace/api/workspaceApi';
import {
  ACCOUNT_TIERS,
  ACCOUNT_TIER_COLORS,
  ACCOUNT_TIER_LABELS,
  errorMessage,
  type AccountTier,
  type Session,
} from '@/shared/domain';
import { useI18n } from '@/shared/i18n';
import {
  ActionButton,
  ConfirmDialog,
  EmptyState,
  StatusBadge,
  SurfaceCard,
  TextField,
  ToggleSwitch,
} from '@/shared/ui/tamagui';

type Props = {
  session: Session;
  activeServerId: string;
  canSeeMembers: boolean;
  channels: ManagedChannel[];
  accounts: ManagedAccount[];
  loading: boolean;
  onChannelsChange: (
    updater: (prev: ManagedChannel[]) => ManagedChannel[],
  ) => void;
  onError: (msg: string) => void;
  onNotify: (msg: string) => void;
};

const isAllTiers = (tiers: readonly AccountTier[]): boolean =>
  ACCOUNT_TIERS.every((tier) => tiers.includes(tier));

const isAllParticipantsWrite = (ch: ManagedChannel): boolean =>
  ch.viewTiers.every((tier) => ch.writeTiers.includes(tier));

const toggleTierIn = (
  list: AccountTier[],
  tier: AccountTier,
): AccountTier[] => {
  if (tier === 'master') return list;
  const has = list.includes(tier);
  const next = has ? list.filter((x) => x !== tier) : [...list, tier];
  return next.includes('master') ? next : ['master', ...next];
};

const setChannelMemberAccess = (
  ch: ManagedChannel,
  email: string,
  mode: 'default' | 'allow' | 'block',
): ManagedChannel => {
  const allowed = ch.allowedEmails.filter((e) => e !== email);
  const blocked = ch.blockedEmails.filter((e) => e !== email);
  if (mode === 'allow') allowed.push(email);
  if (mode === 'block') blocked.push(email);
  return { ...ch, allowedEmails: allowed, blockedEmails: blocked };
};

function ModeToggle({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    danger?: boolean;
  }>;
  onChange: (next: string) => void;
}) {
  return (
    <XStack
      padding={3}
      borderRadius="$md"
      backgroundColor="$bgBar"
      borderWidth={1}
      borderColor="$borderSubtle"
      gap="$1"
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <Button
            key={opt.id}
            paddingHorizontal="$2.5"
            paddingVertical="$1"
            minHeight={28}
            borderRadius="$sm"
            borderWidth={0}
            backgroundColor={
              active ? (opt.danger ? '$danger' : '$accent') : 'transparent'
            }
            cursor="pointer"
            onPress={() => onChange(opt.id)}
          >
            <XStack alignItems="center" gap="$1.5">
              {opt.icon ?? null}
              <Text
                fontFamily="$body"
                fontSize="$2"
                fontWeight="600"
                color={active ? '#ffffff' : '$textSecondary'}
              >
                {opt.label}
              </Text>
            </XStack>
          </Button>
        );
      })}
    </XStack>
  );
}

function TierChips({
  selected,
  allowed,
  onToggle,
}: {
  selected: readonly AccountTier[];
  allowed?: readonly AccountTier[];
  onToggle: (tier: AccountTier) => void;
}) {
  return (
    <XStack flexWrap="wrap" gap="$1.5">
      {ACCOUNT_TIERS.map((tier) => {
        const canUse = !allowed || allowed.includes(tier);
        const active = canUse && selected.includes(tier);
        const disabled = tier === 'master' || !canUse;
        return (
          <Button
            key={tier}
            disabled={disabled}
            paddingHorizontal="$2.5"
            paddingVertical="$1.5"
            minHeight={28}
            borderRadius="$pill"
            borderWidth={1}
            backgroundColor="$bgControl"
            borderColor="$borderSubtle"
            opacity={disabled ? 0.45 : 1}
            cursor={disabled ? 'not-allowed' : 'pointer'}
            style={
              active
                ? {
                    borderColor: ACCOUNT_TIER_COLORS[tier],
                    backgroundColor: `${ACCOUNT_TIER_COLORS[tier]}24`,
                  }
                : undefined
            }
            onPress={() => onToggle(tier)}
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
                color={active ? '$textPrimary' : '$textSecondary'}
              >
                {ACCOUNT_TIER_LABELS[tier]}
              </Text>
            </XStack>
          </Button>
        );
      })}
    </XStack>
  );
}

export function ChannelsTab({
  session,
  activeServerId,
  canSeeMembers,
  channels,
  accounts,
  loading,
  onChannelsChange,
  onError,
  onNotify,
}: Props) {
  const { t } = useI18n();
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [expandedMemberChannelId, setExpandedMemberChannelId] = useState<
    string | null
  >(null);
  const [busyChannelId, setBusyChannelId] = useState<string | null>(null);
  const [dragChannelId, setDragChannelId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagedChannel | null>(null);

  const [newName, setNewName] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newViewMode, setNewViewMode] = useState<'all' | 'specific'>('all');
  const [newViewTiers, setNewViewTiers] = useState<AccountTier[]>([
    ...ACCOUNT_TIERS,
  ]);
  const [newWriteMode, setNewWriteMode] = useState<'all' | 'specific'>('all');
  const [newWriteTiers, setNewWriteTiers] = useState<AccountTier[]>([
    ...ACCOUNT_TIERS,
  ]);

  const [viewModeMap, setViewModeMap] = useState<
    Record<string, 'all' | 'specific'>
  >({});
  const [writeModeMap, setWriteModeMap] = useState<
    Record<string, 'all' | 'specific'>
  >({});

  const resolveViewMode = (ch: ManagedChannel): 'all' | 'specific' =>
    viewModeMap[ch.id] ?? (isAllTiers(ch.viewTiers) ? 'all' : 'specific');

  const resolveWriteMode = (ch: ManagedChannel): 'all' | 'specific' =>
    writeModeMap[ch.id] ?? (isAllParticipantsWrite(ch) ? 'all' : 'specific');

  const handleCreateChannel = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusyChannelId('__new__');
    onError('');
    const viewTiers = newViewMode === 'all' ? [...ACCOUNT_TIERS] : newViewTiers;
    const writeTiers =
      newWriteMode === 'all'
        ? [...viewTiers]
        : newWriteTiers.filter((tier) => viewTiers.includes(tier));
    const res = await workspaceApi.createChannel(
      session.token,
      {
        name: newName.trim().toLowerCase(),
        topic: newTopic.trim(),
        viewTiers,
        writeTiers: writeTiers.includes('master')
          ? writeTiers
          : ['master', ...writeTiers],
        allowedEmails: [],
        blockedEmails: [],
      },
      activeServerId,
    );
    setBusyChannelId(null);
    if (!res.ok) {
      onError(errorMessage(res.error));
      return;
    }
    onChannelsChange((prev) => [...prev, res.data.channel]);
    setNewName('');
    setNewTopic('');
    setNewViewMode('all');
    setNewViewTiers([...ACCOUNT_TIERS]);
    setNewWriteMode('all');
    setNewWriteTiers([...ACCOUNT_TIERS]);
    setCreating(false);
    onNotify(t('server.channels.created'));
  };

  const handleSaveChannel = async (ch: ManagedChannel) => {
    setBusyChannelId(ch.id);
    onError('');
    const viewTiers =
      resolveViewMode(ch) === 'all' ? [...ACCOUNT_TIERS] : ch.viewTiers;
    const writeTiers =
      resolveWriteMode(ch) === 'all'
        ? [...viewTiers]
        : ch.writeTiers.filter((tier) => viewTiers.includes(tier));
    const res = await workspaceApi.updateChannel(
      session.token,
      ch.id,
      {
        topic: ch.topic,
        viewTiers,
        writeTiers: writeTiers.includes('master')
          ? writeTiers
          : ['master', ...writeTiers],
        allowedEmails: ch.allowedEmails,
        blockedEmails: ch.blockedEmails,
        archived: ch.archived,
      },
      activeServerId,
    );
    setBusyChannelId(null);
    if (!res.ok) {
      onError(errorMessage(res.error));
      return;
    }
    onChannelsChange((prev) =>
      prev.map((c) => (c.id === ch.id ? res.data.channel : c)),
    );
    onNotify(t('server.channels.updated'));
  };

  const commitReorder = async (nextActive: ManagedChannel[]) => {
    if (reordering) return;
    const prevSnapshot = channels;
    const archivedList = channels.filter((c) => c.archived);
    const orderedIds = [
      ...nextActive.map((c) => c.id),
      ...archivedList.map((c) => c.id),
    ];
    onChannelsChange(() => [
      ...nextActive.map((c, idx) => ({ ...c, position: idx })),
      ...archivedList,
    ]);
    setReordering(true);
    onError('');
    const res = await workspaceApi.reorderChannels(
      session.token,
      { channelIds: orderedIds },
      activeServerId,
    );
    setReordering(false);
    if (!res.ok) {
      onChannelsChange(() => prevSnapshot);
      onError(errorMessage(res.error));
      return;
    }
    onChannelsChange(() => res.data.channels);
    onNotify(t('server.channels.reordered'));
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, id: string) => {
    if (reordering) return;
    setDragChannelId(id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>, id: string) => {
    if (reordering || !dragChannelId || dragChannelId === id) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dropTargetId !== id) setDropTargetId(id);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault();
    const sourceId = dragChannelId || event.dataTransfer.getData('text/plain');
    setDragChannelId(null);
    setDropTargetId(null);
    if (reordering || !sourceId || sourceId === targetId) return;
    const activeList = channels.filter((c) => !c.archived);
    const fromIdx = activeList.findIndex((c) => c.id === sourceId);
    const toIdx = activeList.findIndex((c) => c.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const nextActive = [...activeList];
    const [moved] = nextActive.splice(fromIdx, 1);
    if (!moved) return;
    nextActive.splice(toIdx, 0, moved);
    void commitReorder(nextActive);
  };

  const handleToggleArchive = async (ch: ManagedChannel) => {
    setBusyChannelId(ch.id);
    onError('');
    const res = await workspaceApi.updateChannel(
      session.token,
      ch.id,
      { archived: !ch.archived },
      activeServerId,
    );
    setBusyChannelId(null);
    if (!res.ok) {
      onError(errorMessage(res.error));
      return;
    }
    onChannelsChange((prev) =>
      prev.map((c) => (c.id === ch.id ? res.data.channel : c)),
    );
    onNotify(t('server.channels.updated'));
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setBusyChannelId(target.id);
    onError('');
    const res = await workspaceApi.deleteChannel(
      session.token,
      target.id,
      activeServerId,
    );
    setBusyChannelId(null);
    setDeleteTarget(null);
    if (!res.ok) {
      onError(errorMessage(res.error));
      return;
    }
    onChannelsChange((prev) => prev.filter((c) => c.id !== target.id));
    onNotify(`Canal #${target.name} apagado.`);
  };

  const activeChannels = channels.filter((c) => !c.archived);
  const hasArchived = channels.some((c) => c.archived);
  const displayed = showArchived ? channels : activeChannels;
  const nonMasterAccounts = accounts.filter((a) => a.tier !== 'master');

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
            {t('server.tab.channels')}
          </Text>
          <Text fontFamily="$body" fontSize="$3" color="$textMuted">
            {t('server.channels.hint')}
          </Text>
        </YStack>
        <ActionButton
          size="sm"
          variant={creating ? 'secondary' : 'primary'}
          icon={creating ? undefined : <Plus size={14} aria-hidden={true} />}
          onPress={() => setCreating((prev) => !prev)}
        >
          {creating ? t('common.cancel') : t('server.channels.newTitle')}
        </ActionButton>
      </XStack>

      {creating ? (
        <SurfaceCard variant="elevated" padding="$4" gap="$3.5">
          <form
            onSubmit={(e) => void handleCreateChannel(e)}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <Text
              fontFamily="$heading"
              fontSize="$4"
              fontWeight="700"
              color="$textPrimary"
            >
              {t('server.channels.newTitle')}
            </Text>

            <XStack gap="$2.5" flexWrap="wrap">
              <YStack flex={1} minWidth={180}>
                <TextField
                  id="new-channel-name"
                  compact
                  label="Nome do canal"
                  value={newName}
                  onChangeText={setNewName}
                  placeholder={t('server.channels.newName')}
                  maxLength={30}
                  leadingIcon={
                    <Hash
                      size={14}
                      color="var(--text-muted)"
                      aria-hidden={true}
                    />
                  }
                />
              </YStack>
              <YStack flex={1.4} minWidth={220}>
                <TextField
                  id="new-channel-topic"
                  compact
                  label="Tópico (opcional)"
                  value={newTopic}
                  onChangeText={setNewTopic}
                  placeholder={t('server.channels.topic')}
                  maxLength={160}
                />
              </YStack>
            </XStack>

            <Separator flex={0} width="100%" borderColor="$borderSubtle" />

            <YStack gap="$2">
              <XStack
                alignItems="center"
                justifyContent="space-between"
                gap="$2"
                flexWrap="wrap"
              >
                <Text
                  fontFamily="$body"
                  fontSize="$3"
                  fontWeight="600"
                  color="$textSecondary"
                >
                  {t('server.channels.viewTiers')}
                </Text>
                <ModeToggle
                  value={newViewMode}
                  options={[
                    {
                      id: 'all',
                      label: t('server.channels.viewAll'),
                      icon: <Eye size={12} aria-hidden={true} />,
                    },
                    {
                      id: 'specific',
                      label: t('server.channels.viewRestricted'),
                      icon: <Lock size={12} aria-hidden={true} />,
                    },
                  ]}
                  onChange={(next) => {
                    const mode = next as 'all' | 'specific';
                    setNewViewMode(mode);
                    if (mode === 'all') {
                      setNewViewTiers([...ACCOUNT_TIERS]);
                      if (newWriteMode === 'all') {
                        setNewWriteTiers([...ACCOUNT_TIERS]);
                      }
                    }
                  }}
                />
              </XStack>
              {newViewMode === 'specific' ? (
                <TierChips
                  selected={newViewTiers}
                  onToggle={(tier) => {
                    const nextView = toggleTierIn(newViewTiers, tier);
                    setNewViewTiers(nextView);
                    setNewWriteTiers((prev) =>
                      newWriteMode === 'all'
                        ? [...nextView]
                        : prev.filter((x) => nextView.includes(x)),
                    );
                  }}
                />
              ) : null}
            </YStack>

            <YStack gap="$2">
              <XStack
                alignItems="center"
                justifyContent="space-between"
                gap="$2"
                flexWrap="wrap"
              >
                <Text
                  fontFamily="$body"
                  fontSize="$3"
                  fontWeight="600"
                  color="$textSecondary"
                >
                  {t('server.channels.writeTiers')}
                </Text>
                <ModeToggle
                  value={newWriteMode}
                  options={[
                    {
                      id: 'all',
                      label: t('server.channels.writeAll'),
                      icon: <MessageSquare size={12} aria-hidden={true} />,
                    },
                    {
                      id: 'specific',
                      label: t('server.channels.writeRestricted'),
                      icon: <PenLine size={12} aria-hidden={true} />,
                    },
                  ]}
                  onChange={(next) => {
                    const mode = next as 'all' | 'specific';
                    setNewWriteMode(mode);
                    if (mode === 'all') {
                      setNewWriteTiers(
                        newViewMode === 'all'
                          ? [...ACCOUNT_TIERS]
                          : [...newViewTiers],
                      );
                    }
                  }}
                />
              </XStack>
              {newWriteMode === 'specific' ? (
                <TierChips
                  selected={newWriteTiers}
                  allowed={newViewMode === 'all' ? undefined : newViewTiers}
                  onToggle={(tier) =>
                    setNewWriteTiers((prev) => toggleTierIn(prev, tier))
                  }
                />
              ) : null}
            </YStack>

            <XStack justifyContent="flex-end" gap="$2">
              <ActionButton
                type="button"
                variant="secondary"
                size="sm"
                onPress={() => setCreating(false)}
              >
                {t('common.cancel')}
              </ActionButton>
              <ActionButton
                type="submit"
                size="sm"
                loading={busyChannelId === '__new__'}
                disabled={!newName.trim()}
                icon={<Plus size={14} aria-hidden={true} />}
              >
                {t('common.create')}
              </ActionButton>
            </XStack>
          </form>
        </SurfaceCard>
      ) : null}

      {hasArchived ? (
        <XStack
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="$3.5"
          paddingVertical="$2.5"
          borderRadius="$lg"
          backgroundColor="$bgSurface"
          borderWidth={1}
          borderColor="$borderSubtle"
        >
          <Text fontFamily="$body" fontSize="$3" color="$textSecondary">
            {t('server.channels.showArchived')}
          </Text>
          <ToggleSwitch
            checked={showArchived}
            onCheckedChange={setShowArchived}
            ariaLabel={t('server.channels.showArchived')}
          />
        </XStack>
      ) : null}

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
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={<Hash size={20} color="var(--text-muted)" aria-hidden={true} />}
          title="Nenhum canal encontrado"
          description="Crie o primeiro canal para organizar as conversas da equipe."
        />
      ) : (
        <Accordion type="single" collapsible gap="$2.5">
          {displayed.map((ch) => {
            const viewMode = resolveViewMode(ch);
            const writeMode = resolveWriteMode(ch);
            const isPrivate =
              viewMode === 'specific' && !isAllTiers(ch.viewTiers);
            const overridesCount =
              ch.allowedEmails.length + ch.blockedEmails.length;
            const membersOpen = expandedMemberChannelId === ch.id;
            const busy = busyChannelId === ch.id;
            const canDrag = !ch.archived && activeChannels.length > 1 && !busy;
            const isDragging = dragChannelId === ch.id;
            const isDropTarget = dropTargetId === ch.id;

            return (
              <div
                key={ch.id}
                draggable={canDrag}
                onDragStart={(e) => {
                  if (canDrag) handleDragStart(e, ch.id);
                }}
                onDragOver={(e) => {
                  if (canDrag) handleDragOver(e, ch.id);
                }}
                onDragLeave={() => {
                  if (dropTargetId === ch.id) setDropTargetId(null);
                }}
                onDrop={(e) => {
                  if (canDrag) handleDrop(e, ch.id);
                }}
                onDragEnd={() => {
                  setDragChannelId(null);
                  setDropTargetId(null);
                }}
                style={{
                  opacity: isDragging ? 0.55 : 1,
                  borderRadius: 14,
                  boxShadow: isDropTarget
                    ? '0 -2px 0 0 var(--accent)'
                    : undefined,
                  transition: 'opacity 140ms ease, box-shadow 120ms ease',
                }}
              >
                <Accordion.Item
                  value={ch.id}
                  borderRadius="$xl"
                  borderWidth={1}
                  borderColor={isDropTarget ? '$accent' : '$borderSubtle'}
                  backgroundColor="$bgSurface"
                  overflow="hidden"
                >
                  <XStack
                    alignItems="center"
                    justifyContent="space-between"
                    paddingHorizontal="$3.5"
                    paddingVertical="$2.5"
                    gap="$2"
                  >
                    {!ch.archived && activeChannels.length > 1 ? (
                      <span
                        aria-hidden="true"
                        title="Arraste para reordenar"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          color: 'var(--text-muted)',
                          cursor: isDragging ? 'grabbing' : 'grab',
                          flexShrink: 0,
                          padding: '2px 0',
                        }}
                      >
                        <GripVertical size={15} aria-hidden={true} />
                      </span>
                    ) : null}

                    <Accordion.Trigger
                      flex={1}
                      backgroundColor="transparent"
                      borderWidth={0}
                      padding={0}
                      flexDirection="row"
                      alignItems="center"
                      justifyContent="space-between"
                      gap="$2.5"
                    >
                      {({ open }: { open: boolean }) => (
                        <>
                          <XStack
                            alignItems="center"
                            gap="$2.5"
                            flex={1}
                            minWidth={0}
                          >
                            <YStack
                              width={30}
                              height={30}
                              borderRadius="$md"
                              backgroundColor="$bgControl"
                              alignItems="center"
                              justifyContent="center"
                              flexShrink={0}
                            >
                              {isPrivate ? (
                                <Lock
                                  size={14}
                                  color="var(--accent-link)"
                                  aria-hidden={true}
                                />
                              ) : (
                                <Hash
                                  size={14}
                                  color="var(--text-secondary)"
                                  aria-hidden={true}
                                />
                              )}
                            </YStack>
                            <YStack flex={1} minWidth={0}>
                              <XStack
                                alignItems="center"
                                gap="$2"
                                flexWrap="wrap"
                              >
                                <Text
                                  fontFamily="$heading"
                                  fontSize="$4"
                                  fontWeight="700"
                                  color="$textPrimary"
                                >
                                  {ch.name}
                                </Text>
                                {ch.archived ? (
                                  <StatusBadge tone="neutral">
                                    Arquivado
                                  </StatusBadge>
                                ) : null}
                                {isPrivate ? (
                                  <StatusBadge tone="accent">
                                    Privado
                                  </StatusBadge>
                                ) : null}
                              </XStack>
                              {ch.topic ? (
                                <Text
                                  fontFamily="$body"
                                  fontSize="$2"
                                  color="$textMuted"
                                  numberOfLines={1}
                                >
                                  {ch.topic}
                                </Text>
                              ) : null}
                            </YStack>
                          </XStack>

                          <ChevronDown
                            size={16}
                            color="var(--text-muted)"
                            aria-hidden={true}
                            style={{
                              transform: open
                                ? 'rotate(180deg)'
                                : 'rotate(0deg)',
                              transition: 'transform 160ms ease',
                              flexShrink: 0,
                            }}
                          />
                        </>
                      )}
                    </Accordion.Trigger>
                  </XStack>

                  <Accordion.Content
                    backgroundColor="$bgSurface"
                    paddingHorizontal="$4"
                    paddingTop="$1"
                    paddingBottom="$4"
                  >
                    <YStack gap="$3.5">
                      <Separator
                        flex={0}
                        width="100%"
                        borderColor="$borderSubtle"
                      />

                      <TextField
                        id={`channel-topic-${ch.id}`}
                        compact
                        label="Tópico do canal"
                        value={ch.topic}
                        maxLength={160}
                        placeholder={t('server.channels.topic')}
                        onChangeText={(value) =>
                          onChannelsChange((prev) =>
                            prev.map((c) =>
                              c.id === ch.id ? { ...c, topic: value } : c,
                            ),
                          )
                        }
                      />

                      {/* Quem pode ver */}
                      <YStack gap="$2">
                        <XStack
                          alignItems="center"
                          justifyContent="space-between"
                          gap="$2"
                          flexWrap="wrap"
                        >
                          <Text
                            fontFamily="$body"
                            fontSize="$3"
                            fontWeight="600"
                            color="$textSecondary"
                          >
                            {t('server.channels.viewTiers')}
                          </Text>
                          <ModeToggle
                            value={viewMode}
                            options={[
                              {
                                id: 'all',
                                label: t('server.channels.viewAll'),
                                icon: <Eye size={12} aria-hidden={true} />,
                              },
                              {
                                id: 'specific',
                                label: t('server.channels.viewRestricted'),
                                icon: <Lock size={12} aria-hidden={true} />,
                              },
                            ]}
                            onChange={(next) => {
                              const mode = next as 'all' | 'specific';
                              setViewModeMap((m) => ({ ...m, [ch.id]: mode }));
                              if (mode === 'all') {
                                onChannelsChange((prev) =>
                                  prev.map((c) =>
                                    c.id === ch.id
                                      ? {
                                          ...c,
                                          viewTiers: [...ACCOUNT_TIERS],
                                          writeTiers:
                                            writeMode === 'all'
                                              ? [...ACCOUNT_TIERS]
                                              : c.writeTiers,
                                        }
                                      : c,
                                  ),
                                );
                              }
                            }}
                          />
                        </XStack>

                        {viewMode === 'specific' ? (
                          <TierChips
                            selected={ch.viewTiers}
                            onToggle={(tier) =>
                              onChannelsChange((prev) =>
                                prev.map((c) => {
                                  if (c.id !== ch.id) return c;
                                  const nextView = toggleTierIn(
                                    c.viewTiers,
                                    tier,
                                  );
                                  const nextWrite =
                                    writeMode === 'all'
                                      ? [...nextView]
                                      : c.writeTiers.filter((x) =>
                                          nextView.includes(x),
                                        );
                                  return {
                                    ...c,
                                    viewTiers: nextView,
                                    writeTiers: nextWrite.includes('master')
                                      ? nextWrite
                                      : ['master', ...nextWrite],
                                  };
                                }),
                              )
                            }
                          />
                        ) : null}
                      </YStack>

                      {/* Quem pode escrever */}
                      <YStack gap="$2">
                        <XStack
                          alignItems="center"
                          justifyContent="space-between"
                          gap="$2"
                          flexWrap="wrap"
                        >
                          <Text
                            fontFamily="$body"
                            fontSize="$3"
                            fontWeight="600"
                            color="$textSecondary"
                          >
                            {t('server.channels.writeTiers')}
                          </Text>
                          <ModeToggle
                            value={writeMode}
                            options={[
                              {
                                id: 'all',
                                label: t('server.channels.writeAll'),
                                icon: (
                                  <MessageSquare size={12} aria-hidden={true} />
                                ),
                              },
                              {
                                id: 'specific',
                                label: t('server.channels.writeRestricted'),
                                icon: <PenLine size={12} aria-hidden={true} />,
                              },
                            ]}
                            onChange={(next) => {
                              const mode = next as 'all' | 'specific';
                              setWriteModeMap((m) => ({ ...m, [ch.id]: mode }));
                              if (mode === 'all') {
                                onChannelsChange((prev) =>
                                  prev.map((c) =>
                                    c.id === ch.id
                                      ? {
                                          ...c,
                                          writeTiers:
                                            viewMode === 'all'
                                              ? [...ACCOUNT_TIERS]
                                              : [...c.viewTiers],
                                        }
                                      : c,
                                  ),
                                );
                              }
                            }}
                          />
                        </XStack>

                        {writeMode === 'specific' ? (
                          <>
                            <TierChips
                              selected={ch.writeTiers}
                              allowed={
                                viewMode === 'all' ? undefined : ch.viewTiers
                              }
                              onToggle={(tier) =>
                                onChannelsChange((prev) =>
                                  prev.map((c) =>
                                    c.id === ch.id
                                      ? {
                                          ...c,
                                          writeTiers: toggleTierIn(
                                            c.writeTiers,
                                            tier,
                                          ),
                                        }
                                      : c,
                                  ),
                                )
                              }
                            />
                            {viewMode === 'specific' ? (
                              <Text
                                fontFamily="$body"
                                fontSize="$2"
                                color="$textMuted"
                              >
                                {t('server.channels.noViewHint')}
                              </Text>
                            ) : null}
                          </>
                        ) : null}
                      </YStack>

                      {/* Exceções individuais */}
                      {canSeeMembers && nonMasterAccounts.length > 0 ? (
                        <YStack gap="$2">
                          <Button
                            backgroundColor="$bgControl"
                            borderColor="$borderSubtle"
                            borderWidth={1}
                            borderRadius="$lg"
                            paddingHorizontal="$3"
                            paddingVertical="$2"
                            justifyContent="space-between"
                            cursor="pointer"
                            onPress={() =>
                              setExpandedMemberChannelId((prev) =>
                                prev === ch.id ? null : ch.id,
                              )
                            }
                          >
                            <XStack
                              alignItems="center"
                              justifyContent="space-between"
                              width="100%"
                              gap="$2"
                            >
                              <XStack alignItems="center" gap="$2">
                                <UserCog
                                  size={14}
                                  color="var(--text-secondary)"
                                  aria-hidden={true}
                                />
                                <Text
                                  fontFamily="$body"
                                  fontSize="$3"
                                  fontWeight="600"
                                  color="$textSecondary"
                                >
                                  {t('server.channels.memberAccess')}
                                </Text>
                                {overridesCount > 0 ? (
                                  <StatusBadge tone="accent">
                                    {overridesCount}
                                  </StatusBadge>
                                ) : null}
                              </XStack>
                              <ChevronDown
                                size={14}
                                color="var(--text-muted)"
                                aria-hidden={true}
                                style={{
                                  transform: membersOpen
                                    ? 'rotate(180deg)'
                                    : 'rotate(0deg)',
                                  transition: 'transform 140ms ease',
                                }}
                              />
                            </XStack>
                          </Button>

                          {membersOpen ? (
                            <YStack
                              gap="$2"
                              padding="$2.5"
                              borderRadius="$lg"
                              backgroundColor="$bgSurfaceElevated"
                              borderWidth={1}
                              borderColor="$borderSubtle"
                              maxHeight={220}
                              overflow="scroll"
                            >
                              {nonMasterAccounts.map((acc) => {
                                const currentMode = ch.blockedEmails.includes(
                                  acc.email,
                                )
                                  ? 'block'
                                  : ch.allowedEmails.includes(acc.email)
                                    ? 'allow'
                                    : 'default';
                                return (
                                  <XStack
                                    key={acc.email}
                                    alignItems="center"
                                    justifyContent="space-between"
                                    gap="$2"
                                    flexWrap="wrap"
                                    paddingVertical="$1"
                                  >
                                    <YStack flex={1} minWidth={160}>
                                      <Text
                                        fontFamily="$body"
                                        fontSize="$3"
                                        fontWeight="600"
                                        color="$textPrimary"
                                      >
                                        {acc.fullName}
                                      </Text>
                                      <Text
                                        fontFamily="$body"
                                        fontSize="$2"
                                        color="$textMuted"
                                      >
                                        {ACCOUNT_TIER_LABELS[acc.tier]} ·{' '}
                                        {acc.email}
                                      </Text>
                                    </YStack>
                                    <ModeToggle
                                      value={currentMode}
                                      options={[
                                        {
                                          id: 'default',
                                          label: t(
                                            'server.channels.memberDefault',
                                          ),
                                        },
                                        {
                                          id: 'allow',
                                          label: t(
                                            'server.channels.memberAllow',
                                          ),
                                        },
                                        {
                                          id: 'block',
                                          label: t(
                                            'server.channels.memberBlock',
                                          ),
                                          danger: true,
                                        },
                                      ]}
                                      onChange={(next) =>
                                        onChannelsChange((prev) =>
                                          prev.map((c) =>
                                            c.id === ch.id
                                              ? setChannelMemberAccess(
                                                  c,
                                                  acc.email,
                                                  next as
                                                    | 'default'
                                                    | 'allow'
                                                    | 'block',
                                                )
                                              : c,
                                          ),
                                        )
                                      }
                                    />
                                  </XStack>
                                );
                              })}
                            </YStack>
                          ) : null}
                        </YStack>
                      ) : null}

                      <Separator
                        flex={0}
                        width="100%"
                        borderColor="$borderSubtle"
                      />

                      <XStack
                        alignItems="center"
                        justifyContent="space-between"
                        gap="$2"
                        flexWrap="wrap"
                      >
                        <XStack alignItems="center" gap="$2" flexWrap="wrap">
                          <ActionButton
                            variant="secondary"
                            size="sm"
                            disabled={busy}
                            icon={
                              ch.archived ? (
                                <ArchiveRestore size={14} aria-hidden={true} />
                              ) : (
                                <Archive size={14} aria-hidden={true} />
                              )
                            }
                            onPress={() => void handleToggleArchive(ch)}
                          >
                            {ch.archived
                              ? t('server.channels.restore')
                              : t('server.channels.archive')}
                          </ActionButton>

                          {ch.name !== 'geral' ? (
                            <ActionButton
                              variant="danger"
                              size="sm"
                              disabled={busy}
                              icon={<Trash2 size={14} aria-hidden={true} />}
                              onPress={() => setDeleteTarget(ch)}
                            >
                              Apagar canal
                            </ActionButton>
                          ) : null}
                        </XStack>

                        <ActionButton
                          size="sm"
                          loading={busy}
                          icon={<Save size={14} aria-hidden={true} />}
                          onPress={() => void handleSaveChannel(ch)}
                        >
                          {t('common.save')}
                        </ActionButton>
                      </XStack>
                    </YStack>
                  </Accordion.Content>
                </Accordion.Item>
              </div>
            );
          })}
        </Accordion>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget ? `Apagar #${deleteTarget.name}?` : ''}
        description={
          deleteTarget
            ? `O canal #${deleteTarget.name} e todas as mensagens enviadas nele serão removidos permanentemente deste servidor.`
            : ''
        }
        tone="danger"
        confirmLabel="Apagar canal"
        loading={deleteTarget !== null && busyChannelId === deleteTarget.id}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </YStack>
  );
}
