import { Copy, Link2, Plus, Trash2 } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';

import { workspaceApi } from '@/app/api';
import type {
  ManagedAccount,
  ManagedChannel,
  ServerInvite,
} from '@/features/workspace/api/workspaceApi';
import { useServerStore } from '@/features/workspace/model/serverStore';
import {
  ACCOUNT_TIERS,
  ACCOUNT_TIER_COLORS,
  ACCOUNT_TIER_LABELS,
  ASSIGNABLE_TIERS,
  canManageMembers,
  canModerateAccounts,
  effectiveTiersOf,
  errorMessage,
  getMap,
  type AccountTier,
  type MapId,
  type ModerationAction,
  type Session,
} from '@/shared/domain';
import { useI18n } from '@/shared/i18n';
import { compressProfilePhoto } from '@/shared/lib/photo';

import styles from './ServerSettingsModal.module.css';

type Props = {
  session: Session;
  onClose: () => void;
  onNotify: (msg: string) => void;
};

type Tab = 'members' | 'channels' | 'invites' | 'general';
type MemberFilter = 'all' | 'online' | 'desk' | 'moderated';

const DURATION_OPTIONS = [
  { minutes: 15, label: '15 min' },
  { minutes: 60, label: '1 hora' },
  { minutes: 1440, label: '24 horas' },
  { minutes: 10080, label: '7 dias' },
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

export function ServerSettingsModal({ session, onClose, onNotify }: Props) {
  const { t } = useI18n();
  const settings = useServerStore((s) => s.settings);
  const setSettings = useServerStore((s) => s.setSettings);
  const activeServerId = useServerStore((s) => s.activeServerId);

  const actorTiers = effectiveTiersOf(
    session.user.tier ?? (session.user.admin ? 'admin' : 'tester'),
    session.user.secondaryTiers,
  );
  const isMaster = canModerateAccounts(actorTiers);
  const canSeeMembers = canManageMembers(actorTiers);

  const [tab, setTab] = useState<Tab>(canSeeMembers ? 'members' : 'general');
  const [name, setName] = useState(settings.name);
  const [description, setDescription] = useState(settings.description);
  const [welcomeMessage, setWelcomeMessage] = useState(settings.welcomeMessage);
  const [allowPublicRegistration, setAllowPublicRegistration] = useState(
    settings.allowPublicRegistration,
  );
  const [icon, setIcon] = useState<string | null>(settings.icon);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [channels, setChannels] = useState<ManagedChannel[]>([]);
  const [channelsLoaded, setChannelsLoaded] = useState(false);
  const [showArchivedChannels, setShowArchivedChannels] = useState(false);
  const [expandedMemberChannelId, setExpandedMemberChannelId] = useState<
    string | null
  >(null);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelTopic, setNewChannelTopic] = useState('');
  const [newChannelViewMode, setNewChannelViewMode] = useState<
    'all' | 'specific'
  >('all');
  const [newChannelViewTiers, setNewChannelViewTiers] = useState<AccountTier[]>(
    [...ACCOUNT_TIERS],
  );
  const [newChannelWriteMode, setNewChannelWriteMode] = useState<
    'all' | 'specific'
  >('all');
  const [newChannelWriteTiers, setNewChannelWriteTiers] = useState<
    AccountTier[]
  >([...ACCOUNT_TIERS]);
  const [channelViewModeMap, setChannelViewModeMap] = useState<
    Record<string, 'all' | 'specific'>
  >({});
  const [channelWriteModeMap, setChannelWriteModeMap] = useState<
    Record<string, 'all' | 'specific'>
  >({});
  const [busyChannelId, setBusyChannelId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [accounts, setAccounts] = useState<ManagedAccount[]>([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('all');
  const [accountQuery, setAccountQuery] = useState('');
  const [modReason, setModReason] = useState('');
  const [restrictMinutes, setRestrictMinutes] = useState<number>(60);
  const [busyAccountEmail, setBusyAccountEmail] = useState<string | null>(null);
  const [confirmRemoveEmail, setConfirmRemoveEmail] = useState<string | null>(
    null,
  );

  // Estado do editor de cargos estilo Discord (1 cargo principal + secundários)
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [draftPrimaryTier, setDraftPrimaryTier] =
    useState<AccountTier>('tester');
  const [draftSecondaryTiers, setDraftSecondaryTiers] = useState<AccountTier[]>(
    [],
  );
  const [draftRoleTitle, setDraftRoleTitle] = useState('');

  const [invites, setInvites] = useState<ServerInvite[]>([]);
  const [invitesLoaded, setInvitesLoaded] = useState(false);
  const [invitedEmails, setInvitedEmails] = useState<
    Array<{
      serverId: string;
      email: string;
      invitedBy: string;
      createdAt: number;
    }>
  >([]);
  const [inviteEmailInput, setInviteEmailInput] = useState('');
  const [addingEmailInvite, setAddingEmailInvite] = useState(false);
  const [inviteMaxUses, setInviteMaxUses] = useState('');
  const [inviteExpiresInHours, setInviteExpiresInHours] = useState('24');
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [busyInviteCode, setBusyInviteCode] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const loadingChannels = tab === 'channels' && !channelsLoaded;
  const loadingAccounts = tab === 'members' && !accountsLoaded;
  const loadingInvites = tab === 'invites' && !invitesLoaded;

  const assignableForActor: readonly AccountTier[] = isMaster
    ? ASSIGNABLE_TIERS
    : ASSIGNABLE_TIERS.filter((tier) => tier !== 'admin');

  useEffect(() => {
    if (tab !== 'channels' || channelsLoaded) return;
    let alive = true;
    void workspaceApi.listChannels(session.token).then((res) => {
      if (!alive) return;
      setChannelsLoaded(true);
      if (res.ok) setChannels(res.data.channels);
      else setError(errorMessage(res.error));
    });
    return () => {
      alive = false;
    };
  }, [tab, channelsLoaded, session.token]);

  useEffect(() => {
    if ((tab !== 'members' && tab !== 'channels') || !canSeeMembers) return;
    if (tab === 'channels' && accountsLoaded) return;
    let alive = true;
    void workspaceApi.listAccounts(session.token).then((res) => {
      if (!alive) return;
      setAccountsLoaded(true);
      if (res.ok) setAccounts(res.data.accounts);
      else setError(errorMessage(res.error));
    });
    return () => {
      alive = false;
    };
  }, [tab, canSeeMembers, session.token, refreshTick, accountsLoaded]);

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

  const handleCreateInvite = async (e: FormEvent) => {
    e.preventDefault();
    setCreatingInvite(true);
    setError('');
    const maxUses = inviteMaxUses.trim()
      ? Math.max(1, Number.parseInt(inviteMaxUses, 10) || 1)
      : null;
    const expiresInHours = inviteExpiresInHours.trim()
      ? Math.max(1, Number.parseInt(inviteExpiresInHours, 10) || 1)
      : null;
    const res = await workspaceApi.createServerInvite(
      session.token,
      activeServerId,
      { maxUses, expiresInHours },
    );
    setCreatingInvite(false);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    setInvites((prev) => [res.data.invite, ...prev]);
    onNotify('Convite criado.');
  };

  const handleCopyInvite = async (code: string) => {
    try {
      await navigator.clipboard?.writeText(code);
      onNotify(`Código ${code} copiado.`);
    } catch {
      onNotify(`Código: ${code}`);
    }
  };

  const handleRevokeInvite = async (code: string) => {
    setBusyInviteCode(code);
    setError('');
    const res = await workspaceApi.revokeServerInvite(
      session.token,
      activeServerId,
      code,
    );
    setBusyInviteCode(null);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    setInvites((prev) =>
      prev.map((inv) => (inv.code === code ? { ...inv, revoked: true } : inv)),
    );
    onNotify('Convite revogado.');
  };

  const handleAddInvitedEmail = async (e: FormEvent) => {
    e.preventDefault();
    const email = inviteEmailInput.trim().toLowerCase();
    if (!email) return;
    setAddingEmailInvite(true);
    setError('');
    const res = await workspaceApi.addInvitedEmail(
      session.token,
      activeServerId,
      email,
    );
    setAddingEmailInvite(false);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    setInvitedEmails((prev) => [
      res.data.invite,
      ...prev.filter((item) => item.email !== res.data.invite.email),
    ]);
    setInviteEmailInput('');
    onNotify(`E-mail ${email} adicionado à lista de convites.`);
  };

  const handleRemoveInvitedEmail = async (email: string) => {
    setError('');
    const res = await workspaceApi.removeInvitedEmail(
      session.token,
      activeServerId,
      email,
    );
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    setInvitedEmails((prev) => prev.filter((item) => item.email !== email));
    onNotify(`Convite de ${email} removido.`);
  };

  const handleIconPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const dataUrl = await compressProfilePhoto(file);
      setIcon(dataUrl);
    } catch {
      setError('Não foi possível processar esta imagem.');
    }
    e.target.value = '';
  };

  const handleSaveGeneral = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await workspaceApi.updateServerSettings(session.token, {
      name: name.trim() || 'Setter',
      description: description.trim(),
      icon,
      welcomeMessage: welcomeMessage.trim(),
      allowPublicRegistration,
    });
    setSaving(false);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    setSettings(res.data);
    onNotify(t('server.saved'));
  };

  const isAllTiers = (tiers: readonly AccountTier[]): boolean =>
    ACCOUNT_TIERS.every((tier) => tiers.includes(tier));

  const isAllParticipantsWrite = (ch: ManagedChannel): boolean =>
    ch.viewTiers.every((tier) => ch.writeTiers.includes(tier));

  const resolveViewMode = (ch: ManagedChannel): 'all' | 'specific' =>
    channelViewModeMap[ch.id] ??
    (isAllTiers(ch.viewTiers) ? 'all' : 'specific');

  const resolveWriteMode = (ch: ManagedChannel): 'all' | 'specific' =>
    channelWriteModeMap[ch.id] ??
    (isAllParticipantsWrite(ch) ? 'all' : 'specific');

  const toggleTierIn = (
    list: AccountTier[],
    tier: AccountTier,
  ): AccountTier[] => {
    if (tier === 'master') return list; // Master sempre mantém acesso total
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

  const handleSaveChannel = async (ch: ManagedChannel) => {
    setBusyChannelId(ch.id);
    setError('');
    const viewTiers =
      resolveViewMode(ch) === 'all' ? [...ACCOUNT_TIERS] : ch.viewTiers;
    const writeTiers =
      resolveWriteMode(ch) === 'all'
        ? [...viewTiers]
        : ch.writeTiers.filter((tier) => viewTiers.includes(tier));
    const res = await workspaceApi.updateChannel(session.token, ch.id, {
      topic: ch.topic,
      viewTiers,
      writeTiers: writeTiers.includes('master')
        ? writeTiers
        : ['master', ...writeTiers],
      allowedEmails: ch.allowedEmails,
      blockedEmails: ch.blockedEmails,
      archived: ch.archived,
    });
    setBusyChannelId(null);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    setChannels((prev) =>
      prev.map((c) => (c.id === ch.id ? res.data.channel : c)),
    );
    onNotify(t('server.channels.updated'));
  };

  const handleMoveChannel = async (channelId: string, delta: -1 | 1) => {
    const activeList = channels.filter((c) => !c.archived);
    const idx = activeList.findIndex((c) => c.id === channelId);
    const target = idx + delta;
    if (idx < 0 || target < 0 || target >= activeList.length) return;
    const nextActive = [...activeList];
    const [moved] = nextActive.splice(idx, 1);
    if (!moved) return;
    nextActive.splice(target, 0, moved);
    const orderedIds = [
      ...nextActive.map((c) => c.id),
      ...channels.filter((c) => c.archived).map((c) => c.id),
    ];
    setBusyChannelId(channelId);
    setError('');
    const res = await workspaceApi.reorderChannels(session.token, {
      channelIds: orderedIds,
    });
    setBusyChannelId(null);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    setChannels(res.data.channels);
    onNotify(t('server.channels.reordered'));
  };

  const handleToggleArchiveChannel = async (ch: ManagedChannel) => {
    setBusyChannelId(ch.id);
    setError('');
    const res = await workspaceApi.updateChannel(session.token, ch.id, {
      archived: !ch.archived,
    });
    setBusyChannelId(null);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    setChannels((prev) =>
      prev.map((c) => (c.id === ch.id ? res.data.channel : c)),
    );
    onNotify(t('server.channels.updated'));
  };

  const handleCreateChannel = async (e: FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    setBusyChannelId('__new__');
    setError('');
    const viewTiers =
      newChannelViewMode === 'all' ? [...ACCOUNT_TIERS] : newChannelViewTiers;
    const writeTiers =
      newChannelWriteMode === 'all'
        ? [...viewTiers]
        : newChannelWriteTiers.filter((tier) => viewTiers.includes(tier));
    const res = await workspaceApi.createChannel(session.token, {
      name: newChannelName.trim().toLowerCase(),
      topic: newChannelTopic.trim(),
      viewTiers,
      writeTiers: writeTiers.includes('master')
        ? writeTiers
        : ['master', ...writeTiers],
      allowedEmails: [],
      blockedEmails: [],
    });
    setBusyChannelId(null);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    setChannels((prev) => [...prev, res.data.channel]);
    setNewChannelName('');
    setNewChannelTopic('');
    setNewChannelViewMode('all');
    setNewChannelViewTiers([...ACCOUNT_TIERS]);
    setNewChannelWriteMode('all');
    setNewChannelWriteTiers([...ACCOUNT_TIERS]);
    onNotify(t('server.channels.created'));
  };

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
    setError('');
  };

  const selectPrimaryTier = (nextPrimary: AccountTier) => {
    setDraftPrimaryTier(nextPrimary);
    setDraftSecondaryTiers((prev) => prev.filter((t) => t !== nextPrimary));
  };

  const toggleSecondaryTier = (tier: AccountTier) => {
    if (tier === draftPrimaryTier || tier === 'master') return;
    setDraftSecondaryTiers((prev) =>
      prev.includes(tier) ? prev.filter((x) => x !== tier) : [...prev, tier],
    );
  };

  const handleSaveRoles = async (email: string) => {
    setBusyAccountEmail(email);
    setError('');
    const res = await workspaceApi.updateAccountRoles(session.token, email, {
      tier: draftPrimaryTier,
      secondaryTiers: draftSecondaryTiers.filter((s) => s !== draftPrimaryTier),
      role: draftRoleTitle.trim(),
    });
    setBusyAccountEmail(null);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    const updated = res.data.account;
    setAccounts((prev) => prev.map((a) => (a.email === email ? updated : a)));
    setEditingEmail(null);
    onNotify(t('server.moderation.roles.saved'));
  };

  const handleModerateAccount = async (
    email: string,
    action: ModerationAction,
  ) => {
    setBusyAccountEmail(email);
    setError('');
    const trimmedReason = modReason.trim();
    const res = await workspaceApi.moderateAccount(session.token, email, {
      action,
      ...(trimmedReason ? { reason: trimmedReason } : {}),
      ...(action === 'restrict' ? { durationMinutes: restrictMinutes } : {}),
    });
    setBusyAccountEmail(null);
    setConfirmRemoveEmail(null);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    if (action === 'remove') {
      setAccounts((prev) => prev.filter((a) => a.email !== email));
      if (editingEmail === email) setEditingEmail(null);
    } else if (res.data.account) {
      const updated = res.data.account;
      setAccounts((prev) => prev.map((a) => (a.email === email ? updated : a)));
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

  const handleReleaseAccountDesk = async (email: string) => {
    setBusyAccountEmail(email);
    setError('');
    const res = await workspaceApi.releaseAccountDesk(session.token, email);
    setBusyAccountEmail(null);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    setAccounts((prev) =>
      prev.map((a) => (a.email === email ? { ...a, desk: null } : a)),
    );
    onNotify(t('server.moderation.done.releaseDesk'));
  };

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
    const q = accountQuery.trim().toLowerCase();
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

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={t('server.title')}
      data-scroll-lock="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{t('server.title')}</h2>
            <p className={styles.subtitle}>{t('server.subtitle')}</p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            aria-label={t('common.close')}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className={styles.tabs}>
          {canSeeMembers ? (
            <button
              type="button"
              className={`${styles.tabBtn} ${tab === 'members' ? styles.tabActive : ''}`}
              onClick={() => setTab('members')}
            >
              👥 {t('server.tab.moderation')}
            </button>
          ) : null}
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === 'channels' ? styles.tabActive : ''}`}
            onClick={() => setTab('channels')}
          >
            # {t('server.tab.channels')}
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === 'invites' ? styles.tabActive : ''}`}
            onClick={() => setTab('invites')}
          >
            <Link2 size={14} style={{ marginRight: 5, verticalAlign: -2 }} />
            Acesso e Convites
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === 'general' ? styles.tabActive : ''}`}
            onClick={() => setTab('general')}
          >
            ⚙️ {t('server.tab.general')}
          </button>
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.body}>
          {tab === 'general' ? (
            <form
              className={styles.form}
              onSubmit={(e) => void handleSaveGeneral(e)}
            >
              <div className={styles.iconRow}>
                <div className={styles.iconPreview}>
                  {icon ? (
                    <img src={icon} alt={name} className={styles.iconImg} />
                  ) : (
                    <span>{(name.trim()[0] ?? 'S').toUpperCase()}</span>
                  )}
                </div>
                <div className={styles.iconControls}>
                  <div className={styles.label}>{t('server.icon')}</div>
                  <p className={styles.hint}>{t('server.iconHint')}</p>
                  <div className={styles.btnRow}>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      hidden
                      onChange={(e) => void handleIconPick(e)}
                    />
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => fileRef.current?.click()}
                    >
                      {t('server.uploadIcon')}
                    </button>
                    {icon ? (
                      <button
                        type="button"
                        className={styles.ghostBtn}
                        onClick={() => setIcon(null)}
                      >
                        {t('server.removeIcon')}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <label className={styles.field}>
                <span className={styles.label}>{t('server.name')}</span>
                <input
                  type="text"
                  className={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  required
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>{t('server.description')}</span>
                <textarea
                  className={styles.textarea}
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={240}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>
                  {t('server.welcomeMessage')}
                </span>
                <input
                  type="text"
                  className={styles.input}
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  maxLength={280}
                />
              </label>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={allowPublicRegistration}
                  onChange={(e) => setAllowPublicRegistration(e.target.checked)}
                />
                <span>{t('server.allowPublicRegistration')}</span>
              </label>

              <div className={styles.footer}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={onClose}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={saving}
                >
                  {saving ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </form>
          ) : tab === 'channels' ? (
            <div className={styles.channelsPane}>
              <p className={styles.hint}>{t('server.channels.hint')}</p>

              <form
                className={styles.newChannelCard}
                onSubmit={(e) => void handleCreateChannel(e)}
              >
                <div className={styles.sectionTitle}>
                  {t('server.channels.newTitle')}
                </div>
                <div className={styles.inlineInputs}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder={t('server.channels.newName')}
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    maxLength={30}
                  />
                  <input
                    type="text"
                    className={styles.input}
                    placeholder={t('server.channels.topic')}
                    value={newChannelTopic}
                    onChange={(e) => setNewChannelTopic(e.target.value)}
                    maxLength={160}
                  />
                </div>

                {/* Visibilidade / participação do novo canal */}
                <div className={styles.permBlock}>
                  <div className={styles.permHeader}>
                    <span className={styles.tierLabel}>
                      {t('server.channels.viewTiers')}
                    </span>
                    <div className={styles.segmented}>
                      <button
                        type="button"
                        className={`${styles.segBtn} ${newChannelViewMode === 'all' ? styles.segBtnActive : ''}`}
                        onClick={() => {
                          setNewChannelViewMode('all');
                          setNewChannelViewTiers([...ACCOUNT_TIERS]);
                          if (newChannelWriteMode === 'all') {
                            setNewChannelWriteTiers([...ACCOUNT_TIERS]);
                          }
                        }}
                      >
                        👁️ {t('server.channels.viewAll')}
                      </button>
                      <button
                        type="button"
                        className={`${styles.segBtn} ${newChannelViewMode === 'specific' ? styles.segBtnActive : ''}`}
                        onClick={() => setNewChannelViewMode('specific')}
                      >
                        🔒 {t('server.channels.viewRestricted')}
                      </button>
                    </div>
                  </div>
                  {newChannelViewMode === 'specific' ? (
                    <div className={styles.tierRow}>
                      {ACCOUNT_TIERS.map((tier) => {
                        const active = newChannelViewTiers.includes(tier);
                        return (
                          <button
                            key={tier}
                            type="button"
                            disabled={tier === 'master'}
                            className={`${styles.roleChipBtn} ${active ? styles.roleChipBtnActive : ''}`}
                            style={
                              active
                                ? {
                                    borderColor: ACCOUNT_TIER_COLORS[tier],
                                    backgroundColor: `${ACCOUNT_TIER_COLORS[tier]}24`,
                                  }
                                : undefined
                            }
                            onClick={() => {
                              const nextView = toggleTierIn(
                                newChannelViewTiers,
                                tier,
                              );
                              setNewChannelViewTiers(nextView);
                              setNewChannelWriteTiers((prev) =>
                                newChannelWriteMode === 'all'
                                  ? [...nextView]
                                  : prev.filter((x) => nextView.includes(x)),
                              );
                            }}
                          >
                            <span
                              className={styles.roleDot}
                              style={{
                                backgroundColor: ACCOUNT_TIER_COLORS[tier],
                              }}
                            />
                            {ACCOUNT_TIER_LABELS[tier]}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                {/* Envio de mensagens do novo canal */}
                <div className={styles.permBlock}>
                  <div className={styles.permHeader}>
                    <span className={styles.tierLabel}>
                      {t('server.channels.writeTiers')}
                    </span>
                    <div className={styles.segmented}>
                      <button
                        type="button"
                        className={`${styles.segBtn} ${newChannelWriteMode === 'all' ? styles.segBtnActive : ''}`}
                        onClick={() => {
                          setNewChannelWriteMode('all');
                          setNewChannelWriteTiers(
                            newChannelViewMode === 'all'
                              ? [...ACCOUNT_TIERS]
                              : [...newChannelViewTiers],
                          );
                        }}
                      >
                        💬 {t('server.channels.writeAll')}
                      </button>
                      <button
                        type="button"
                        className={`${styles.segBtn} ${newChannelWriteMode === 'specific' ? styles.segBtnActive : ''}`}
                        onClick={() => setNewChannelWriteMode('specific')}
                      >
                        ✍️ {t('server.channels.writeRestricted')}
                      </button>
                    </div>
                  </div>
                  {newChannelWriteMode === 'specific' ? (
                    <div className={styles.tierRow}>
                      {ACCOUNT_TIERS.map((tier) => {
                        const allowedView =
                          newChannelViewMode === 'all' ||
                          newChannelViewTiers.includes(tier);
                        const active =
                          allowedView && newChannelWriteTiers.includes(tier);
                        return (
                          <button
                            key={tier}
                            type="button"
                            disabled={tier === 'master' || !allowedView}
                            className={`${styles.roleChipBtn} ${active ? styles.roleChipBtnActive : ''}`}
                            style={
                              active
                                ? {
                                    borderColor: ACCOUNT_TIER_COLORS[tier],
                                    backgroundColor: `${ACCOUNT_TIER_COLORS[tier]}24`,
                                  }
                                : undefined
                            }
                            onClick={() =>
                              setNewChannelWriteTiers((prev) =>
                                toggleTierIn(prev, tier),
                              )
                            }
                          >
                            <span
                              className={styles.roleDot}
                              style={{
                                backgroundColor: ACCOUNT_TIER_COLORS[tier],
                              }}
                            />
                            {ACCOUNT_TIER_LABELS[tier]}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={
                    busyChannelId === '__new__' || !newChannelName.trim()
                  }
                >
                  + {t('common.create')}
                </button>
              </form>

              {channels.some((c) => c.archived) ? (
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={showArchivedChannels}
                    onChange={(e) => setShowArchivedChannels(e.target.checked)}
                  />
                  <span>{t('server.channels.showArchived')}</span>
                </label>
              ) : null}

              {loadingChannels ? (
                <p className={styles.hint}>{t('common.loading')}</p>
              ) : (
                <div className={styles.channelList}>
                  {(() => {
                    const activeChannels = channels.filter((c) => !c.archived);
                    const displayed = showArchivedChannels
                      ? channels
                      : activeChannels;
                    return displayed.map((ch) => {
                      const activeIdx = activeChannels.findIndex(
                        (c) => c.id === ch.id,
                      );
                      const viewMode = resolveViewMode(ch);
                      const writeMode = resolveWriteMode(ch);
                      const isPrivate =
                        viewMode === 'specific' && !isAllTiers(ch.viewTiers);
                      const overridesCount =
                        ch.allowedEmails.length + ch.blockedEmails.length;
                      const membersOpen = expandedMemberChannelId === ch.id;
                      const nonMasterAccounts = accounts.filter(
                        (a) => a.tier !== 'master',
                      );

                      return (
                        <div key={ch.id} className={styles.channelCard}>
                          <div className={styles.channelCardHeader}>
                            <div className={styles.channelTitleGroup}>
                              {!ch.archived && activeChannels.length > 1 ? (
                                <div className={styles.orderControls}>
                                  <button
                                    type="button"
                                    className={styles.orderBtn}
                                    disabled={
                                      activeIdx <= 0 || busyChannelId === ch.id
                                    }
                                    aria-label={t('server.channels.moveUp')}
                                    title={t('server.channels.moveUp')}
                                    onClick={() =>
                                      void handleMoveChannel(ch.id, -1)
                                    }
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.orderBtn}
                                    disabled={
                                      activeIdx < 0 ||
                                      activeIdx >= activeChannels.length - 1 ||
                                      busyChannelId === ch.id
                                    }
                                    aria-label={t('server.channels.moveDown')}
                                    title={t('server.channels.moveDown')}
                                    onClick={() =>
                                      void handleMoveChannel(ch.id, 1)
                                    }
                                  >
                                    ↓
                                  </button>
                                </div>
                              ) : null}
                              <strong>
                                {isPrivate ? '🔒' : '#'} {ch.name}
                              </strong>
                              {ch.archived ? (
                                <span className={styles.statusBadge}>
                                  Arquivado
                                </span>
                              ) : null}
                            </div>
                            <div className={styles.channelHeaderBtns}>
                              <button
                                type="button"
                                className={styles.modBtn}
                                disabled={busyChannelId === ch.id}
                                onClick={() =>
                                  void handleToggleArchiveChannel(ch)
                                }
                              >
                                {ch.archived
                                  ? t('server.channels.restore')
                                  : t('server.channels.archive')}
                              </button>
                              <button
                                type="button"
                                className={styles.smallSaveBtn}
                                disabled={busyChannelId === ch.id}
                                onClick={() => void handleSaveChannel(ch)}
                              >
                                {busyChannelId === ch.id
                                  ? t('common.saving')
                                  : t('common.save')}
                              </button>
                            </div>
                          </div>

                          <input
                            type="text"
                            className={styles.input}
                            placeholder={t('server.channels.topic')}
                            value={ch.topic}
                            maxLength={160}
                            onChange={(e) =>
                              setChannels((prev) =>
                                prev.map((c) =>
                                  c.id === ch.id
                                    ? { ...c, topic: e.target.value }
                                    : c,
                                ),
                              )
                            }
                          />

                          {/* 1. Quem pode ver e participar */}
                          <div className={styles.permBlock}>
                            <div className={styles.permHeader}>
                              <span className={styles.tierLabel}>
                                {t('server.channels.viewTiers')}
                              </span>
                              <div className={styles.segmented}>
                                <button
                                  type="button"
                                  className={`${styles.segBtn} ${viewMode === 'all' ? styles.segBtnActive : ''}`}
                                  onClick={() => {
                                    setChannelViewModeMap((m) => ({
                                      ...m,
                                      [ch.id]: 'all',
                                    }));
                                    setChannels((prev) =>
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
                                  }}
                                >
                                  👁️ {t('server.channels.viewAll')}
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.segBtn} ${viewMode === 'specific' ? styles.segBtnActive : ''}`}
                                  onClick={() =>
                                    setChannelViewModeMap((m) => ({
                                      ...m,
                                      [ch.id]: 'specific',
                                    }))
                                  }
                                >
                                  🔒 {t('server.channels.viewRestricted')}
                                </button>
                              </div>
                            </div>

                            {viewMode === 'specific' ? (
                              <div className={styles.tierRow}>
                                {ACCOUNT_TIERS.map((tier) => {
                                  const active = ch.viewTiers.includes(tier);
                                  return (
                                    <button
                                      key={tier}
                                      type="button"
                                      disabled={tier === 'master'}
                                      className={`${styles.roleChipBtn} ${active ? styles.roleChipBtnActive : ''}`}
                                      style={
                                        active
                                          ? {
                                              borderColor:
                                                ACCOUNT_TIER_COLORS[tier],
                                              backgroundColor: `${ACCOUNT_TIER_COLORS[tier]}24`,
                                            }
                                          : undefined
                                      }
                                      onClick={() =>
                                        setChannels((prev) =>
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
                                              writeTiers: nextWrite.includes(
                                                'master',
                                              )
                                                ? nextWrite
                                                : ['master', ...nextWrite],
                                            };
                                          }),
                                        )
                                      }
                                    >
                                      <span
                                        className={styles.roleDot}
                                        style={{
                                          backgroundColor:
                                            ACCOUNT_TIER_COLORS[tier],
                                        }}
                                      />
                                      {ACCOUNT_TIER_LABELS[tier]}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>

                          {/* 2. Quem pode enviar mensagens */}
                          <div className={styles.permBlock}>
                            <div className={styles.permHeader}>
                              <span className={styles.tierLabel}>
                                {t('server.channels.writeTiers')}
                              </span>
                              <div className={styles.segmented}>
                                <button
                                  type="button"
                                  className={`${styles.segBtn} ${writeMode === 'all' ? styles.segBtnActive : ''}`}
                                  onClick={() => {
                                    setChannelWriteModeMap((m) => ({
                                      ...m,
                                      [ch.id]: 'all',
                                    }));
                                    setChannels((prev) =>
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
                                  }}
                                >
                                  💬 {t('server.channels.writeAll')}
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.segBtn} ${writeMode === 'specific' ? styles.segBtnActive : ''}`}
                                  onClick={() =>
                                    setChannelWriteModeMap((m) => ({
                                      ...m,
                                      [ch.id]: 'specific',
                                    }))
                                  }
                                >
                                  ✍️ {t('server.channels.writeRestricted')}
                                </button>
                              </div>
                            </div>

                            {writeMode === 'specific' ? (
                              <>
                                <div className={styles.tierRow}>
                                  {ACCOUNT_TIERS.map((tier) => {
                                    const allowedView =
                                      viewMode === 'all' ||
                                      ch.viewTiers.includes(tier);
                                    const active =
                                      allowedView &&
                                      ch.writeTiers.includes(tier);
                                    return (
                                      <button
                                        key={tier}
                                        type="button"
                                        disabled={
                                          tier === 'master' || !allowedView
                                        }
                                        className={`${styles.roleChipBtn} ${active ? styles.roleChipBtnActive : ''}`}
                                        style={
                                          active
                                            ? {
                                                borderColor:
                                                  ACCOUNT_TIER_COLORS[tier],
                                                backgroundColor: `${ACCOUNT_TIER_COLORS[tier]}24`,
                                              }
                                            : undefined
                                        }
                                        onClick={() =>
                                          setChannels((prev) =>
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
                                      >
                                        <span
                                          className={styles.roleDot}
                                          style={{
                                            backgroundColor:
                                              ACCOUNT_TIER_COLORS[tier],
                                          }}
                                        />
                                        {ACCOUNT_TIER_LABELS[tier]}
                                      </button>
                                    );
                                  })}
                                </div>
                                {viewMode === 'specific' ? (
                                  <p className={styles.hint}>
                                    {t('server.channels.noViewHint')}
                                  </p>
                                ) : null}
                              </>
                            ) : null}
                          </div>

                          {/* 3. Exceções individuais por usuário */}
                          {canSeeMembers && nonMasterAccounts.length > 0 ? (
                            <div className={styles.permBlock}>
                              <button
                                type="button"
                                className={styles.memberToggleBtn}
                                onClick={() =>
                                  setExpandedMemberChannelId((prev) =>
                                    prev === ch.id ? null : ch.id,
                                  )
                                }
                              >
                                <span>
                                  {membersOpen ? '▾' : '▸'} 👤{' '}
                                  {t('server.channels.memberAccess')}
                                </span>
                                {overridesCount > 0 ? (
                                  <span className={styles.deskBadge}>
                                    {overridesCount}
                                  </span>
                                ) : null}
                              </button>

                              {membersOpen ? (
                                <div className={styles.memberAccessList}>
                                  {nonMasterAccounts.map((acc) => {
                                    const currentMode =
                                      ch.blockedEmails.includes(acc.email)
                                        ? 'block'
                                        : ch.allowedEmails.includes(acc.email)
                                          ? 'allow'
                                          : 'default';
                                    return (
                                      <div
                                        key={acc.email}
                                        className={styles.memberAccessRow}
                                      >
                                        <div
                                          className={styles.memberAccessInfo}
                                        >
                                          <span
                                            className={styles.memberAccessName}
                                          >
                                            {acc.fullName}
                                          </span>
                                          <span className={styles.tierLabel}>
                                            {ACCOUNT_TIER_LABELS[acc.tier]} ·{' '}
                                            {acc.email}
                                          </span>
                                        </div>
                                        <div className={styles.segmented}>
                                          {(
                                            [
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
                                              },
                                            ] as const
                                          ).map((opt) => (
                                            <button
                                              key={opt.id}
                                              type="button"
                                              className={`${styles.segBtn} ${currentMode === opt.id ? styles.segBtnActive : ''} ${currentMode === 'block' && opt.id === 'block' ? styles.segBtnDanger : ''}`}
                                              onClick={() =>
                                                setChannels((prev) =>
                                                  prev.map((c) =>
                                                    c.id === ch.id
                                                      ? setChannelMemberAccess(
                                                          c,
                                                          acc.email,
                                                          opt.id,
                                                        )
                                                      : c,
                                                  ),
                                                )
                                              }
                                            >
                                              {opt.label}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          ) : tab === 'invites' ? (
            <div className={styles.channelsPane}>
              <p className={styles.hint}>
                Gere códigos de convite para novos membros entrarem neste
                servidor.
              </p>

              <form
                className={styles.newChannelCard}
                onSubmit={(e) => void handleAddInvitedEmail(e)}
              >
                <div className={styles.sectionTitle}>
                  Convidar por e-mail (libera criação de conta)
                </div>
                <div className={styles.inlineInputs}>
                  <input
                    type="email"
                    className={styles.input}
                    placeholder="pessoa@gmail.com"
                    value={inviteEmailInput}
                    onChange={(e) => setInviteEmailInput(e.target.value)}
                  />
                  <button
                    type="submit"
                    className={styles.primaryBtn}
                    disabled={addingEmailInvite || !inviteEmailInput.trim()}
                  >
                    <Plus
                      size={14}
                      style={{ marginRight: 5, verticalAlign: -2 }}
                    />
                    {addingEmailInvite ? 'Adicionando…' : 'Convidar'}
                  </button>
                </div>
                {invitedEmails.length > 0 ? (
                  <div className={styles.channelList} style={{ marginTop: 10 }}>
                    {invitedEmails.map((entry) => (
                      <div key={entry.email} className={styles.channelCard}>
                        <div className={styles.channelHeader}>
                          <span>{entry.email}</span>
                          <button
                            type="button"
                            className={styles.secondaryBtn}
                            onClick={() =>
                              void handleRemoveInvitedEmail(entry.email)
                            }
                            title="Remover convite"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </form>

              <form
                className={styles.newChannelCard}
                onSubmit={(e) => void handleCreateInvite(e)}
              >
                <div className={styles.sectionTitle}>Novo convite</div>
                <div className={styles.inlineInputs}>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    className={styles.input}
                    placeholder="Limite de usos (vazio = ilimitado)"
                    value={inviteMaxUses}
                    onChange={(e) => setInviteMaxUses(e.target.value)}
                  />
                  <select
                    className={styles.input}
                    value={inviteExpiresInHours}
                    onChange={(e) => setInviteExpiresInHours(e.target.value)}
                  >
                    <option value="24">Expira em 24 horas</option>
                    <option value="168">Expira em 7 dias</option>
                    <option value="720">Expira em 30 dias</option>
                    <option value="">Sem expiração</option>
                  </select>
                </div>
                <div className={styles.footer}>
                  <button
                    type="submit"
                    className={styles.primaryBtn}
                    disabled={creatingInvite}
                  >
                    <Plus
                      size={14}
                      style={{ marginRight: 5, verticalAlign: -2 }}
                    />
                    {creatingInvite ? 'Gerando…' : 'Gerar convite'}
                  </button>
                </div>
              </form>

              {loadingInvites ? (
                <div className={styles.empty}>Carregando convites…</div>
              ) : invites.length === 0 ? (
                <div className={styles.empty}>
                  Nenhum convite criado para este servidor ainda.
                </div>
              ) : (
                <div className={styles.channelList}>
                  {invites.map((inv) => {
                    const expired =
                      inv.expiresAt !== null && nowMs > inv.expiresAt;
                    const exhausted =
                      inv.maxUses !== null && inv.uses >= inv.maxUses;
                    const inactive = inv.revoked || expired || exhausted;
                    const statusLabel = inv.revoked
                      ? 'Revogado'
                      : expired
                        ? 'Expirado'
                        : exhausted
                          ? 'Esgotado'
                          : 'Ativo';
                    return (
                      <div key={inv.code} className={styles.channelCard}>
                        <div className={styles.channelHeader}>
                          <div>
                            <strong
                              style={{
                                fontFamily: 'monospace',
                                letterSpacing: 1,
                              }}
                            >
                              {inv.code}
                            </strong>
                            <span
                              className={styles.hint}
                              style={{ marginLeft: 10 }}
                            >
                              {statusLabel} • {inv.uses}
                              {inv.maxUses !== null
                                ? `/${inv.maxUses}`
                                : ''}{' '}
                              uso(s)
                              {inv.expiresAt !== null
                                ? ` • expira em ${new Date(inv.expiresAt).toLocaleDateString('pt-BR')}`
                                : ' • sem expiração'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              className={styles.secondaryBtn}
                              disabled={inactive}
                              onClick={() => void handleCopyInvite(inv.code)}
                              title="Copiar código"
                            >
                              <Copy size={13} />
                            </button>
                            {!inv.revoked ? (
                              <button
                                type="button"
                                className={styles.secondaryBtn}
                                disabled={busyInviteCode === inv.code}
                                onClick={() =>
                                  void handleRevokeInvite(inv.code)
                                }
                                title="Revogar convite"
                              >
                                <Trash2 size={13} />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.channelsPane}>
              <p className={styles.hint}>{t('server.moderation.hint')}</p>

              <div className={styles.filterRow}>
                <div className={styles.filterChips}>
                  <button
                    type="button"
                    className={`${styles.tierChip} ${memberFilter === 'all' ? styles.tierChipActive : ''}`}
                    onClick={() => setMemberFilter('all')}
                  >
                    {t('server.moderation.filter.all')} ({accounts.length})
                  </button>
                  <button
                    type="button"
                    className={`${styles.tierChip} ${memberFilter === 'online' ? styles.tierChipActive : ''}`}
                    onClick={() => setMemberFilter('online')}
                  >
                    🟢 {t('server.moderation.filter.online')} ({onlineTotal})
                  </button>
                  <button
                    type="button"
                    className={`${styles.tierChip} ${memberFilter === 'desk' ? styles.tierChipActive : ''}`}
                    onClick={() => setMemberFilter('desk')}
                  >
                    🪑 {t('server.moderation.filter.withDesk')} ({withDeskTotal}
                    )
                  </button>
                  {moderatedTotal > 0 ? (
                    <button
                      type="button"
                      className={`${styles.tierChip} ${memberFilter === 'moderated' ? styles.tierChipActive : ''}`}
                      onClick={() => setMemberFilter('moderated')}
                    >
                      🚫 {t('server.moderation.filter.moderated')} (
                      {moderatedTotal})
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={styles.modBtn}
                  onClick={() => {
                    setAccountsLoaded(false);
                    setRefreshTick((n) => n + 1);
                  }}
                >
                  ↻ {t('server.moderation.refresh')}
                </button>
              </div>

              <div
                className={
                  canSeeMembers
                    ? styles.moderationControls
                    : styles.inlineInputs
                }
              >
                <input
                  type="search"
                  className={styles.input}
                  placeholder={t('server.moderation.search')}
                  value={accountQuery}
                  onChange={(e) => setAccountQuery(e.target.value)}
                />
                {canSeeMembers ? (
                  <>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder={t('server.moderation.reason')}
                      value={modReason}
                      maxLength={200}
                      onChange={(e) => setModReason(e.target.value)}
                    />
                    <select
                      aria-label={t('server.moderation.duration')}
                      className={styles.select}
                      value={restrictMinutes}
                      onChange={(e) =>
                        setRestrictMinutes(Number(e.target.value))
                      }
                    >
                      {DURATION_OPTIONS.map((opt) => (
                        <option key={opt.minutes} value={opt.minutes}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
              </div>

              {loadingAccounts ? (
                <p className={styles.hint}>{t('common.loading')}</p>
              ) : filteredAccounts.length === 0 ? (
                <p className={styles.hint}>{t('server.moderation.empty')}</p>
              ) : (
                <div className={styles.channelList}>
                  {filteredAccounts.map((acc) => {
                    const isSelf = acc.email === session.user.email;
                    const targetTiers = effectiveTiersOf(
                      acc.tier,
                      acc.secondaryTiers,
                    );
                    const isTargetMaster = targetTiers.includes('master');
                    const isTargetAdmin = targetTiers.includes('admin');
                    const canEditRoles =
                      !isSelf &&
                      !isTargetMaster &&
                      (isMaster || !isTargetAdmin);
                    const canReleaseDesk =
                      acc.desk !== null && (isMaster || !isTargetMaster);
                    const isBanned = acc.bannedAt !== null;
                    const isRestricted = acc.restrictedUntil !== null;
                    const busy = busyAccountEmail === acc.email;
                    const confirmingRemove = confirmRemoveEmail === acc.email;
                    const isEditing = editingEmail === acc.email;

                    return (
                      <div key={acc.email} className={styles.accountCard}>
                        <div className={styles.accountHeader}>
                          <div className={styles.accountIdentity}>
                            <span className={styles.onlineLine}>
                              <span
                                className={styles.onlineDot}
                                style={{
                                  backgroundColor:
                                    STATUS_DOT_COLORS[acc.status],
                                }}
                                aria-hidden="true"
                              />
                              <span className={styles.accountName}>
                                {acc.fullName}
                                {isSelf ? ' (você)' : ''}
                              </span>
                            </span>
                            <span className={styles.accountMeta}>
                              @{acc.nickname} · {acc.email}
                              {acc.role ? ` · ${acc.role}` : ''}
                              {' · '}
                              {acc.online
                                ? `${t('server.moderation.online')}${acc.map ? ` (${safeMapName(acc.map)})` : ''}`
                                : t('server.moderation.offline')}
                            </span>
                          </div>
                          <div className={styles.badgeRow}>
                            <span
                              className={`${styles.statusBadge} ${
                                isBanned
                                  ? styles.statusBanned
                                  : isRestricted
                                    ? styles.statusRestricted
                                    : ''
                              }`}
                            >
                              {isBanned
                                ? t('server.moderation.status.banned')
                                : isRestricted
                                  ? t('server.moderation.status.restricted')
                                  : t('server.moderation.status.active')}
                            </span>
                            {acc.desk ? (
                              <span className={styles.deskBadge}>
                                🪑 {acc.desk.label || acc.desk.deskId}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Badges de cargo principal + cargos secundários (estilo Discord) */}
                        <div className={styles.rolePills}>
                          <span
                            className={styles.primaryRolePill}
                            style={{
                              borderColor: `${ACCOUNT_TIER_COLORS[acc.tier]}88`,
                              backgroundColor: `${ACCOUNT_TIER_COLORS[acc.tier]}24`,
                            }}
                          >
                            <span
                              className={styles.roleDot}
                              style={{
                                backgroundColor: ACCOUNT_TIER_COLORS[acc.tier],
                              }}
                            />
                            {acc.tier === 'master' ? '👑 ' : '★ '}
                            {ACCOUNT_TIER_LABELS[acc.tier]}
                          </span>
                          {acc.secondaryTiers.map((sec) => (
                            <span
                              key={sec}
                              className={styles.secondaryRolePill}
                            >
                              <span
                                className={styles.roleDot}
                                style={{
                                  backgroundColor: ACCOUNT_TIER_COLORS[sec],
                                }}
                              />
                              {ACCOUNT_TIER_LABELS[sec]}
                            </span>
                          ))}
                        </div>

                        {isBanned && acc.banReason ? (
                          <p className={styles.hint}>
                            {t('server.moderation.status.banned')}:{' '}
                            {acc.banReason}
                          </p>
                        ) : null}
                        {!isBanned && isRestricted && acc.restrictionReason ? (
                          <p className={styles.hint}>
                            {t('server.moderation.status.restricted')}:{' '}
                            {acc.restrictionReason}
                          </p>
                        ) : null}

                        {/* Editor inline de cargo principal + cargos secundários */}
                        {isEditing && canEditRoles ? (
                          <div className={styles.roleEditor}>
                            <div className={styles.roleEditorSection}>
                              <span className={styles.label}>
                                ★ {t('server.moderation.roles.primary')}
                              </span>
                              <div className={styles.tierRow}>
                                {assignableForActor.map((tier) => {
                                  const active = draftPrimaryTier === tier;
                                  return (
                                    <button
                                      key={tier}
                                      type="button"
                                      className={`${styles.roleChipBtn} ${active ? styles.roleChipBtnActive : ''}`}
                                      style={
                                        active
                                          ? {
                                              borderColor: `${ACCOUNT_TIER_COLORS[tier]}aa`,
                                              backgroundColor: `${ACCOUNT_TIER_COLORS[tier]}2e`,
                                            }
                                          : undefined
                                      }
                                      onClick={() => selectPrimaryTier(tier)}
                                    >
                                      <span
                                        className={styles.roleDot}
                                        style={{
                                          backgroundColor:
                                            ACCOUNT_TIER_COLORS[tier],
                                        }}
                                      />
                                      {ACCOUNT_TIER_LABELS[tier]}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className={styles.roleEditorSection}>
                              <span className={styles.label}>
                                + {t('server.moderation.roles.secondary')}
                              </span>
                              <p className={styles.hint}>
                                {t('server.moderation.roles.secondaryHint')}
                              </p>
                              <div className={styles.tierRow}>
                                {assignableForActor
                                  .filter((tier) => tier !== draftPrimaryTier)
                                  .map((tier) => {
                                    const active =
                                      draftSecondaryTiers.includes(tier);
                                    return (
                                      <button
                                        key={tier}
                                        type="button"
                                        className={`${styles.roleChipBtn} ${active ? styles.roleChipBtnActive : ''}`}
                                        style={
                                          active
                                            ? {
                                                borderColor: `${ACCOUNT_TIER_COLORS[tier]}99`,
                                                backgroundColor: `${ACCOUNT_TIER_COLORS[tier]}24`,
                                              }
                                            : undefined
                                        }
                                        onClick={() =>
                                          toggleSecondaryTier(tier)
                                        }
                                      >
                                        <span
                                          className={styles.roleDot}
                                          style={{
                                            backgroundColor:
                                              ACCOUNT_TIER_COLORS[tier],
                                          }}
                                        />
                                        {active ? '✓ ' : '+ '}
                                        {ACCOUNT_TIER_LABELS[tier]}
                                      </button>
                                    );
                                  })}
                              </div>
                            </div>

                            <label className={styles.field}>
                              <span className={styles.label}>
                                {t('server.moderation.roles.jobTitle')}
                              </span>
                              <input
                                type="text"
                                className={styles.input}
                                value={draftRoleTitle}
                                maxLength={60}
                                placeholder="Ex.: Tech Lead, QA, UI/UX"
                                onChange={(e) =>
                                  setDraftRoleTitle(e.target.value)
                                }
                              />
                            </label>

                            <div className={styles.roleEditorFooter}>
                              <button
                                type="button"
                                className={styles.secondaryBtn}
                                disabled={busy}
                                onClick={() => setEditingEmail(null)}
                              >
                                {t('common.cancel')}
                              </button>
                              <button
                                type="button"
                                className={styles.primaryBtn}
                                disabled={busy}
                                onClick={() => void handleSaveRoles(acc.email)}
                              >
                                {busy
                                  ? t('common.saving')
                                  : t('server.moderation.roles.save')}
                              </button>
                            </div>
                          </div>
                        ) : null}

                        <div className={styles.accountActions}>
                          {canEditRoles ? (
                            <button
                              type="button"
                              className={styles.modBtn}
                              disabled={busy}
                              onClick={() => openRoleEditor(acc)}
                            >
                              🏷️ {t('server.moderation.roles.edit')}
                            </button>
                          ) : null}

                          {canReleaseDesk ? (
                            <button
                              type="button"
                              className={styles.modBtn}
                              disabled={busy}
                              onClick={() =>
                                void handleReleaseAccountDesk(acc.email)
                              }
                            >
                              {t('server.moderation.action.releaseDesk')}
                            </button>
                          ) : null}

                          {canSeeMembers &&
                          !isSelf &&
                          !isTargetMaster &&
                          (isMaster || !isTargetAdmin) ? (
                            <>
                              {!isBanned ? (
                                <>
                                  <button
                                    type="button"
                                    className={styles.modBtn}
                                    disabled={busy}
                                    onClick={() =>
                                      void handleModerateAccount(
                                        acc.email,
                                        'kick',
                                      )
                                    }
                                  >
                                    {t('server.moderation.action.kick')}
                                  </button>
                                  {isRestricted ? (
                                    <button
                                      type="button"
                                      className={styles.modBtn}
                                      disabled={busy}
                                      onClick={() =>
                                        void handleModerateAccount(
                                          acc.email,
                                          'unrestrict',
                                        )
                                      }
                                    >
                                      {t('server.moderation.action.unrestrict')}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className={`${styles.modBtn} ${styles.modBtnWarn}`}
                                      disabled={busy}
                                      onClick={() =>
                                        void handleModerateAccount(
                                          acc.email,
                                          'restrict',
                                        )
                                      }
                                    >
                                      {t('server.moderation.action.restrict')}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className={`${styles.modBtn} ${styles.modBtnDanger}`}
                                    disabled={busy}
                                    onClick={() =>
                                      void handleModerateAccount(
                                        acc.email,
                                        'ban',
                                      )
                                    }
                                  >
                                    {t('server.moderation.action.ban')}
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className={styles.modBtn}
                                  disabled={busy}
                                  onClick={() =>
                                    void handleModerateAccount(
                                      acc.email,
                                      'unban',
                                    )
                                  }
                                >
                                  {t('server.moderation.action.unban')}
                                </button>
                              )}

                              {isMaster && confirmingRemove ? (
                                <>
                                  <button
                                    type="button"
                                    className={`${styles.modBtn} ${styles.modBtnDanger}`}
                                    disabled={busy}
                                    onClick={() =>
                                      void handleModerateAccount(
                                        acc.email,
                                        'remove',
                                      )
                                    }
                                  >
                                    {t(
                                      'server.moderation.action.confirmRemove',
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.modBtn}
                                    disabled={busy}
                                    onClick={() => setConfirmRemoveEmail(null)}
                                  >
                                    {t('common.cancel')}
                                  </button>
                                </>
                              ) : isMaster ? (
                                <button
                                  type="button"
                                  className={`${styles.modBtn} ${styles.modBtnDanger}`}
                                  disabled={busy}
                                  onClick={() =>
                                    setConfirmRemoveEmail(acc.email)
                                  }
                                >
                                  {t('server.moderation.action.remove')}
                                </button>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
