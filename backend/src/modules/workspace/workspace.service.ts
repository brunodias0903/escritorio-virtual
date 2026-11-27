import { randomBytes, randomUUID } from 'node:crypto';
import {
  ACCOUNT_TIERS,
  CHANNEL_NAME_PATTERN,
  canAttachFeedbackMr,
  canCreateServer,
  canManageDesks,
  canManageMembers,
  canManageServer,
  canProgressFeedback,
  canResolveFeedback,
  canSeeFeedbackMr,
  effectiveTiersOf,
  normalizeEmail,
  type AccountTier,
  type CreateChannelConfig,
  type CreateFeedback,
  type CreateFeedbackComment,
  type CreateServerInput,
  type CreateServerInviteInput,
  type DeskInfo,
  type FeedbackComment,
  type FeedbackItem,
  type ManagedAccount,
  type ModerateAccount,
  type ModerateAccountResponse,
  type ReorderChannels,
  type ServerInvite,
  type ServerSettings,
  type Status,
  type UpdateAccountRoles,
  type UpdateChannelConfig,
  type UpdateFeedback,
  type UpdateServerSettings,
  type WorkspaceServer,
} from '../../shared/domain/index.js';
import { httpFail, ok, type HttpResult } from '../../shared/result.js';
import type {
  LocalAccount,
  LocalAccountRepository,
} from '../auth/auth.repository.js';
import type { SessionClaims } from '../auth/token.js';
import type { ChannelRepository, ChannelRow } from '../chat/chat.repository.js';
import type { DeskService } from '../desks/desks.service.js';
import type {
  FeedbackRepository,
  ServerInviteRepository,
  ServerRepository,
  ServerSettingsRepository,
} from './workspace.repository.js';

export type AccountModeratedAction =
  'banned' | 'kicked' | 'restricted' | 'removed';

const DEFAULT_RESTRICTION_MINUTES = 60;

export type OnlinePlayerSummary = {
  email?: string;
  status: Status;
  map: string;
};

type Deps = {
  settings: ServerSettingsRepository;
  feedback: FeedbackRepository;
  channels: ChannelRepository;
  accounts: LocalAccountRepository;
  servers?: ServerRepository;
  invites?: ServerInviteRepository;
  desks?: DeskService;
  adminEmails?: string[];
  getOnlinePlayers?: () => readonly OnlinePlayerSummary[];
  onChannelsChanged?: () => void;
  onDeskChanged?: (desk: DeskInfo) => Promise<void> | void;
  onAccountRolesChanged?: (
    email: string,
    update: {
      tier: AccountTier;
      secondaryTiers: AccountTier[];
      admin: boolean;
      role: string;
    },
  ) => Promise<void> | void;
  onUserModerated?: (
    email: string,
    action: AccountModeratedAction,
    reason?: string,
  ) => Promise<void> | void;
  now?: () => number;
  newId?: () => string;
};

/**
 * Regras do servidor (configurações gerais, permissões por canal) e da central
 * de feedback/melhorias com controle de visibilidade de MR por tier.
 */
export class WorkspaceService {
  private readonly deps: Deps;
  private readonly now: () => number;
  private readonly newId: () => string;

  constructor(deps: Deps) {
    this.deps = deps;
    this.now = deps.now ?? Date.now;
    this.newId = deps.newId ?? randomUUID;
  }

  private resolveTier(account: LocalAccount): AccountTier {
    if (account.email === this.deps.adminEmails?.[0]) return 'master';
    if (account.tier && account.tier !== 'tester') return account.tier;
    if (this.deps.adminEmails?.includes(account.email)) return 'admin';
    return account.tier ?? 'tester';
  }

  private resolveSecondaryTiers(
    account: LocalAccount,
    primary: AccountTier,
  ): AccountTier[] {
    const seen = new Set<AccountTier>([primary, 'master']);
    const result: AccountTier[] = [];
    for (const item of account.secondaryTiers ?? []) {
      if (!seen.has(item)) {
        seen.add(item);
        result.push(item);
      }
    }
    return result;
  }

  private effectiveTiersOfAccount(account: LocalAccount): AccountTier[] {
    const primary = this.resolveTier(account);
    return effectiveTiersOf(
      primary,
      this.resolveSecondaryTiers(account, primary),
    );
  }

  private async tiersOf(
    claims: SessionClaims,
    serverId = 'default',
  ): Promise<AccountTier[]> {
    const account = await this.deps.accounts.byEmail(claims.email);
    const isMaster =
      claims.email === this.deps.adminEmails?.[0] ||
      (account ? this.resolveTier(account) === 'master' : false);
    if (isMaster) return ['master'];

    if (serverId !== 'default' && this.deps.servers?.getMemberRoles) {
      const roles = await this.deps.servers.getMemberRoles(
        serverId,
        claims.email,
      );
      return roles
        ? effectiveTiersOf(roles.tier, roles.secondaryTiers)
        : ['member'];
    }
    if (account) return this.effectiveTiersOfAccount(account);
    return [claims.admin ? 'admin' : 'member'];
  }

  private async releaseUserDesk(email: string): Promise<DeskInfo | null> {
    if (!this.deps.desks) return null;
    const freed = await this.deps.desks.releaseByOwner(email);
    if (freed) await this.deps.onDeskChanged?.(freed);
    return freed;
  }

  private onlineMap(): Map<string, OnlinePlayerSummary> {
    const map = new Map<string, OnlinePlayerSummary>();
    for (const player of this.deps.getOnlinePlayers?.() ?? []) {
      if (player.email) map.set(player.email, player);
    }
    return map;
  }

  private toManagedAccount(
    account: LocalAccount,
    desksByOwner: Map<string, DeskInfo>,
    onlineByEmail: Map<string, OnlinePlayerSummary>,
  ): ManagedAccount {
    const desk = desksByOwner.get(account.email);
    const online = onlineByEmail.get(account.email);
    const primaryTier = this.resolveTier(account);
    const secondaryTiers = this.resolveSecondaryTiers(account, primaryTier);
    const activeRestriction =
      account.restrictedUntil && account.restrictedUntil > this.now()
        ? account.restrictedUntil
        : null;
    return {
      email: account.email,
      fullName: account.fullName,
      nickname: account.nickname,
      role: account.role,
      tier: primaryTier,
      secondaryTiers,
      online: Boolean(online),
      status: online?.status ?? 'offline',
      map: online?.map ?? null,
      bannedAt: account.bannedAt ?? null,
      banReason: account.banReason ?? '',
      restrictedUntil: activeRestriction,
      restrictionReason: activeRestriction
        ? (account.restrictionReason ?? '')
        : '',
      desk: desk
        ? {
            map: desk.map,
            deskId: desk.deskId,
            label: desk.config.label,
          }
        : null,
      createdAt: account.createdAt,
    };
  }

  // --- Servidor & canais -----------------------------------------------------

  async getServerSettings(serverId = 'default'): Promise<ServerSettings> {
    const settings = await this.deps.settings.get(serverId);
    if (
      serverId !== 'default' &&
      this.deps.servers &&
      settings.updatedAt === 0
    ) {
      const srv = await this.deps.servers.get(serverId);
      if (srv) {
        return {
          ...settings,
          name: srv.name,
          description: srv.description,
        };
      }
    }
    return settings;
  }

  async listPublicChannels(serverId = 'default'): Promise<ChannelRow[]> {
    return this.deps.channels.listPublic(serverId);
  }

  async updateServerSettings(
    claims: SessionClaims,
    input: UpdateServerSettings,
    serverId = 'default',
  ): Promise<HttpResult<ServerSettings>> {
    const tiers = await this.tiersOf(claims);
    if (!canManageServer(tiers)) return httpFail(403, 'forbidden');

    const current = await this.getServerSettings(serverId);
    const next: ServerSettings = {
      name: input.name,
      description: input.description,
      icon: input.icon === undefined ? current.icon : input.icon,
      welcomeMessage: input.welcomeMessage,
      allowPublicRegistration: input.allowPublicRegistration,
      updatedAt: this.now(),
    };
    const saved = await this.deps.settings.save(next, claims.email, serverId);
    await this.deps.servers?.update?.(serverId, {
      name: input.name,
      description: input.description,
    });
    return ok(saved);
  }

  private normalizeEmails(emails: readonly string[]): string[] {
    return [...new Set(emails.map(normalizeEmail).filter(Boolean))];
  }

  private normalizeTiersWithMaster(
    tiers: readonly AccountTier[],
  ): AccountTier[] {
    const unique = [...new Set(tiers)];
    return unique.includes('master') ? unique : ['master', ...unique];
  }

  async createManagedChannel(
    claims: SessionClaims,
    input: Partial<
      Pick<
        CreateChannelConfig,
        'topic' | 'viewTiers' | 'writeTiers' | 'allowedEmails' | 'blockedEmails'
      >
    > &
      Pick<CreateChannelConfig, 'name'>,
    serverId = 'default',
  ): Promise<HttpResult<ChannelRow>> {
    const tiers = await this.tiersOf(claims);
    if (!canManageServer(tiers)) return httpFail(403, 'forbidden');

    const name = input.name.trim().toLowerCase();
    if (!CHANNEL_NAME_PATTERN.test(name)) {
      return httpFail(400, 'invalid_name');
    }

    const viewTiers = this.normalizeTiersWithMaster(
      input.viewTiers ?? ACCOUNT_TIERS,
    );
    const writeTiers = this.normalizeTiersWithMaster(
      (input.writeTiers ?? viewTiers).filter((t) => viewTiers.includes(t)),
    );
    const blockedEmails = this.normalizeEmails(input.blockedEmails ?? []);
    const allowedEmails = this.normalizeEmails(
      input.allowedEmails ?? [],
    ).filter((email) => !blockedEmails.includes(email));
    const existingPublic = await this.deps.channels.listPublic(serverId);
    const nextPosition =
      existingPublic.reduce((max, c) => Math.max(max, c.position ?? 0), -1) + 1;

    const row: ChannelRow = {
      id: serverId === 'default' ? name : `${serverId}:${name}`,
      serverId,
      name,
      kind: 'public',
      archived: false,
      position: nextPosition,
      topic: input.topic ?? '',
      viewTiers,
      writeTiers,
      allowedEmails,
      blockedEmails,
      createdBy: claims.email,
      createdAt: this.now(),
    };
    const created = await this.deps.channels.create(row);
    if (!created) return httpFail(409, 'name_taken');

    this.deps.onChannelsChanged?.();
    return ok(row);
  }

  async updateChannelConfig(
    claims: SessionClaims,
    channelId: string,
    input: UpdateChannelConfig,
  ): Promise<HttpResult<ChannelRow>> {
    const tiers = await this.tiersOf(claims);
    if (!canManageServer(tiers)) return httpFail(403, 'forbidden');

    const existing = await this.deps.channels.get(channelId);
    if (existing?.kind !== 'public') return httpFail(404, 'not_found');

    const nextViewTiers = input.viewTiers
      ? this.normalizeTiersWithMaster(input.viewTiers)
      : (existing.viewTiers ?? [...ACCOUNT_TIERS]);
    const rawWriteTiers = input.writeTiers ??
      existing.writeTiers ?? [...ACCOUNT_TIERS];
    const nextWriteTiers =
      input.writeTiers || input.viewTiers
        ? this.normalizeTiersWithMaster(
            rawWriteTiers.filter((t) => nextViewTiers.includes(t)),
          )
        : undefined;

    const nextBlocked =
      input.blockedEmails !== undefined
        ? this.normalizeEmails(input.blockedEmails)
        : (existing.blockedEmails ?? []);
    const nextAllowed =
      input.allowedEmails !== undefined || input.blockedEmails !== undefined
        ? this.normalizeEmails(
            input.allowedEmails ?? existing.allowedEmails ?? [],
          ).filter((email) => !nextBlocked.includes(email))
        : undefined;

    if (this.deps.channels.updateConfig) {
      await this.deps.channels.updateConfig(channelId, {
        ...(input.topic !== undefined ? { topic: input.topic } : {}),
        ...(input.viewTiers ? { viewTiers: nextViewTiers } : {}),
        ...(nextWriteTiers ? { writeTiers: nextWriteTiers } : {}),
        ...(nextAllowed !== undefined ? { allowedEmails: nextAllowed } : {}),
        ...(input.blockedEmails !== undefined
          ? { blockedEmails: nextBlocked }
          : {}),
        ...(input.archived !== undefined ? { archived: input.archived } : {}),
      });
    } else if (input.archived !== undefined) {
      await this.deps.channels.setArchived(channelId, input.archived);
    }

    this.deps.onChannelsChanged?.();
    const updated = await this.deps.channels.get(channelId);
    return ok(
      updated ?? {
        ...existing,
        topic: input.topic ?? existing.topic ?? '',
        viewTiers: nextViewTiers,
        writeTiers: nextWriteTiers ?? existing.writeTiers ?? [...ACCOUNT_TIERS],
        allowedEmails: nextAllowed ?? existing.allowedEmails ?? [],
        blockedEmails: nextBlocked,
        archived: input.archived ?? existing.archived,
      },
    );
  }

  async reorderChannels(
    claims: SessionClaims,
    input: ReorderChannels,
  ): Promise<HttpResult<ChannelRow[]>> {
    const tiers = await this.tiersOf(claims);
    if (!canManageServer(tiers)) return httpFail(403, 'forbidden');

    await this.deps.channels.reorder?.(input.channelIds);
    this.deps.onChannelsChanged?.();
    return ok(await this.deps.channels.listPublic());
  }

  // --- Central de Feedback ---------------------------------------------------

  private redactForTiers(
    item: FeedbackItem,
    tiers: readonly AccountTier[],
  ): FeedbackItem {
    if (canSeeFeedbackMr(tiers)) return item;
    const copy: FeedbackItem = { ...item };
    delete copy.mrUrl;
    return copy;
  }

  async listFeedback(claims: SessionClaims): Promise<FeedbackItem[]> {
    const [tiers, items] = await Promise.all([
      this.tiersOf(claims),
      this.deps.feedback.list(),
    ]);
    return items.map((item) => this.redactForTiers(item, tiers));
  }

  async createFeedback(
    claims: SessionClaims,
    input: CreateFeedback,
  ): Promise<HttpResult<FeedbackItem>> {
    const tiers = await this.tiersOf(claims);
    const now = this.now();
    const item: FeedbackItem = {
      id: this.newId(),
      kind: input.kind,
      title: input.title,
      description: input.description,
      status: 'open',
      authorEmail: claims.email,
      authorName: claims.name,
      mrUrl: null,
      createdAt: now,
      updatedAt: now,
      updatedBy: claims.email,
      comments: [],
    };
    await this.deps.feedback.create(item);
    return ok(this.redactForTiers(item, tiers));
  }

  async updateFeedback(
    claims: SessionClaims,
    id: string,
    input: UpdateFeedback,
  ): Promise<HttpResult<FeedbackItem>> {
    const tiers = await this.tiersOf(claims);
    const existing = await this.deps.feedback.get(id);
    if (!existing) return httpFail(404, 'not_found');

    const wantsMr = input.mrUrl !== undefined;
    if (wantsMr && !canAttachFeedbackMr(tiers)) {
      return httpFail(403, 'forbidden');
    }

    if (input.status !== undefined) {
      const resolving =
        input.status === 'done' ||
        input.status === 'closed' ||
        input.status === 'open';
      if (resolving && !canResolveFeedback(tiers)) {
        return httpFail(403, 'forbidden');
      }
      if (!resolving && !canProgressFeedback(tiers)) {
        return httpFail(403, 'forbidden');
      }
    }

    const normalizedMr =
      input.mrUrl === undefined
        ? undefined
        : input.mrUrl === null || input.mrUrl.trim() === ''
          ? null
          : input.mrUrl.trim();

    const updated = await this.deps.feedback.update(id, {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(normalizedMr !== undefined ? { mrUrl: normalizedMr } : {}),
      updatedAt: this.now(),
      updatedBy: claims.email,
    });
    if (!updated) return httpFail(404, 'not_found');
    return ok(this.redactForTiers(updated, tiers));
  }

  async addFeedbackComment(
    claims: SessionClaims,
    feedbackId: string,
    input: CreateFeedbackComment,
  ): Promise<HttpResult<FeedbackComment>> {
    const existing = await this.deps.feedback.get(feedbackId);
    if (!existing) return httpFail(404, 'not_found');

    const tiers = await this.tiersOf(claims);
    const comment: FeedbackComment = {
      id: this.newId(),
      feedbackId,
      authorEmail: claims.email,
      authorName: claims.name,
      authorTier: tiers[0] ?? 'tester',
      body: input.body,
      createdAt: this.now(),
    };
    await this.deps.feedback.addComment(comment);
    return ok(comment);
  }

  // --- Painel administrativo: membros, cargos e moderação --------------------

  async listAccounts(
    claims: SessionClaims,
    serverId = 'default',
  ): Promise<HttpResult<ManagedAccount[]>> {
    const tiers = await this.tiersOf(claims, serverId);
    if (!canManageMembers(tiers)) return httpFail(403, 'forbidden');

    const [allAccounts, deskList] = await Promise.all([
      this.deps.accounts.all(),
      this.deps.desks ? this.deps.desks.list(serverId) : Promise.resolve([]),
    ]);
    let accounts = allAccounts;
    const memberRolesMap = new Map<
      string,
      { tier: AccountTier; secondaryTiers: AccountTier[] }
    >();
    if (serverId !== 'default' && this.deps.servers) {
      const checks = await Promise.all(
        allAccounts.map(async (acc) => ({
          acc,
          member: await this.deps.servers!.isMember(serverId, acc.email),
          roles: await this.deps.servers!.getMemberRoles?.(serverId, acc.email),
        })),
      );
      accounts = checks.filter((c) => c.member).map((c) => c.acc);
      for (const c of checks) {
        if (c.member && c.roles) memberRolesMap.set(c.acc.email, c.roles);
      }
    }
    const desksByOwner = new Map<string, DeskInfo>();
    for (const desk of deskList) {
      if (desk.owner) desksByOwner.set(desk.owner.email, desk);
    }
    const onlineByEmail = this.onlineMap();
    const mapped = accounts.map((acc) => {
      const base = this.toManagedAccount(acc, desksByOwner, onlineByEmail);
      if (serverId !== 'default' && base.tier !== 'master') {
        const srvRoles = memberRolesMap.get(acc.email);
        return {
          ...base,
          tier: srvRoles?.tier ?? 'member',
          secondaryTiers: srvRoles?.secondaryTiers ?? [],
        };
      }
      return base;
    });
    mapped.sort(
      (a, b) =>
        Number(b.online) - Number(a.online) ||
        a.fullName.localeCompare(b.fullName, 'pt-BR'),
    );
    return ok(mapped);
  }

  async updateAccountRoles(
    claims: SessionClaims,
    targetEmailRaw: string,
    input: UpdateAccountRoles,
    serverId = 'default',
  ): Promise<HttpResult<ManagedAccount>> {
    const actorTiers = await this.tiersOf(claims, serverId);
    if (!canManageMembers(actorTiers)) return httpFail(403, 'forbidden');

    const actorIsMaster = actorTiers.includes('master');
    const targetEmail = normalizeEmail(targetEmailRaw);
    if (targetEmail === claims.email) {
      return httpFail(400, 'cannot_edit_own_roles');
    }

    const target = await this.deps.accounts.byEmail(targetEmail);
    if (!target) return httpFail(404, 'not_found');

    const existingMemberRoles =
      serverId !== 'default'
        ? await this.deps.servers?.getMemberRoles?.(serverId, targetEmail)
        : undefined;
    const targetTiers =
      serverId !== 'default' && this.resolveTier(target) !== 'master'
        ? effectiveTiersOf(
            existingMemberRoles?.tier ?? 'member',
            existingMemberRoles?.secondaryTiers,
          )
        : this.effectiveTiersOfAccount(target);
    if (targetTiers.includes('master')) {
      return httpFail(403, 'cannot_manage_higher_role');
    }
    if (input.tier === 'master' || input.secondaryTiers.includes('master')) {
      return httpFail(403, 'cannot_assign_master');
    }

    if (!actorIsMaster) {
      if (targetTiers.includes('admin')) {
        return httpFail(403, 'cannot_manage_higher_role');
      }
      if (input.tier === 'admin' || input.secondaryTiers.includes('admin')) {
        return httpFail(403, 'cannot_assign_admin');
      }
    }

    const seen = new Set<AccountTier>([input.tier, 'master']);
    const cleanSecondary: AccountTier[] = [];
    for (const item of input.secondaryTiers) {
      if (!seen.has(item)) {
        seen.add(item);
        cleanSecondary.push(item);
      }
    }

    const nextRole = input.role !== undefined ? input.role.trim() : undefined;
    if (serverId !== 'default' && this.deps.servers?.setMemberRoles) {
      await this.deps.servers.setMemberRoles(serverId, targetEmail, {
        tier: input.tier,
        secondaryTiers: cleanSecondary,
      });
      if (nextRole !== undefined) {
        await this.deps.accounts.setRoles?.(targetEmail, {
          tier: target.tier ?? 'member',
          secondaryTiers: target.secondaryTiers ?? [],
          role: nextRole,
        });
      }
    } else {
      await this.deps.accounts.setRoles?.(targetEmail, {
        tier: input.tier,
        secondaryTiers: cleanSecondary,
        ...(nextRole !== undefined ? { role: nextRole } : {}),
      });
    }

    if (nextRole !== undefined && this.deps.desks) {
      const syncedDesk = await this.deps.desks.syncOwner(
        {
          email: targetEmail,
          name: target.fullName,
          role: nextRole,
        },
        serverId,
      );
      if (syncedDesk) await this.deps.onDeskChanged?.(syncedDesk);
    }

    const updated = await this.deps.accounts.byEmail(targetEmail);
    if (!updated) return httpFail(404, 'not_found');

    const resolvedPrimary =
      serverId !== 'default' ? input.tier : this.resolveTier(updated);
    const resolvedSecondary =
      serverId !== 'default'
        ? cleanSecondary
        : this.resolveSecondaryTiers(updated, resolvedPrimary);
    const newEffective = effectiveTiersOf(resolvedPrimary, resolvedSecondary);
    await this.deps.onAccountRolesChanged?.(targetEmail, {
      tier: resolvedPrimary,
      secondaryTiers: resolvedSecondary,
      admin: canManageServer(newEffective),
      role: updated.role,
    });

    const deskList = this.deps.desks
      ? await this.deps.desks.list(serverId)
      : [];
    const desksByOwner = new Map<string, DeskInfo>();
    for (const desk of deskList) {
      if (desk.owner) desksByOwner.set(desk.owner.email, desk);
    }
    const managed = this.toManagedAccount(
      updated,
      desksByOwner,
      this.onlineMap(),
    );
    return ok(
      serverId !== 'default' && managed.tier !== 'master'
        ? {
            ...managed,
            tier: resolvedPrimary,
            secondaryTiers: resolvedSecondary,
          }
        : managed,
    );
  }

  async moderateAccount(
    claims: SessionClaims,
    targetEmailRaw: string,
    input: ModerateAccount,
  ): Promise<HttpResult<ModerateAccountResponse>> {
    const actorTiers = await this.tiersOf(claims);
    if (!canManageServer(actorTiers)) return httpFail(403, 'forbidden');

    const actorIsMaster = actorTiers.includes('master');
    if (!actorIsMaster && input.action === 'remove') {
      return httpFail(403, 'forbidden');
    }

    const targetEmail = normalizeEmail(targetEmailRaw);
    if (targetEmail === claims.email) {
      return httpFail(400, 'cannot_moderate_self');
    }

    const target = await this.deps.accounts.byEmail(targetEmail);
    if (!target) return httpFail(404, 'not_found');
    const targetTiers = this.effectiveTiersOfAccount(target);
    if (targetTiers.includes('master')) {
      return httpFail(403, 'cannot_moderate_master');
    }
    if (!actorIsMaster && targetTiers.includes('admin')) {
      return httpFail(403, 'cannot_manage_higher_role');
    }

    const reason = input.reason?.trim() ?? '';
    const now = this.now();
    let deskReleased = false;

    switch (input.action) {
      case 'ban': {
        await this.deps.accounts.setModeration?.(targetEmail, {
          bannedAt: now,
          banReason: reason,
          restrictedUntil: null,
          restrictionReason: '',
        });
        deskReleased = (await this.releaseUserDesk(targetEmail)) !== null;
        await this.deps.onUserModerated?.(targetEmail, 'banned', reason);
        break;
      }
      case 'unban': {
        await this.deps.accounts.setModeration?.(targetEmail, {
          bannedAt: null,
          banReason: '',
        });
        break;
      }
      case 'kick': {
        deskReleased = (await this.releaseUserDesk(targetEmail)) !== null;
        await this.deps.onUserModerated?.(targetEmail, 'kicked', reason);
        break;
      }
      case 'restrict': {
        const minutes = input.durationMinutes ?? DEFAULT_RESTRICTION_MINUTES;
        await this.deps.accounts.setModeration?.(targetEmail, {
          restrictedUntil: now + minutes * 60_000,
          restrictionReason: reason,
        });
        deskReleased = (await this.releaseUserDesk(targetEmail)) !== null;
        await this.deps.onUserModerated?.(targetEmail, 'restricted', reason);
        break;
      }
      case 'unrestrict': {
        await this.deps.accounts.setModeration?.(targetEmail, {
          restrictedUntil: null,
          restrictionReason: '',
        });
        break;
      }
      case 'remove': {
        deskReleased = (await this.releaseUserDesk(targetEmail)) !== null;
        await this.deps.accounts.deleteByEmail?.(targetEmail);
        await this.deps.onUserModerated?.(targetEmail, 'removed', reason);
        return ok({
          email: targetEmail,
          action: input.action,
          deskReleased,
          account: null,
        });
      }
    }

    const updated = await this.deps.accounts.byEmail(targetEmail);
    const deskList = this.deps.desks ? await this.deps.desks.list() : [];
    const desksByOwner = new Map<string, DeskInfo>();
    for (const desk of deskList) {
      if (desk.owner) desksByOwner.set(desk.owner.email, desk);
    }

    return ok({
      email: targetEmail,
      action: input.action,
      deskReleased,
      account: updated
        ? this.toManagedAccount(updated, desksByOwner, this.onlineMap())
        : null,
    });
  }

  async releaseUserDeskAsAdmin(
    claims: SessionClaims,
    targetEmailRaw: string,
  ): Promise<HttpResult<{ desk: DeskInfo }>> {
    const actorTiers = await this.tiersOf(claims);
    if (!canManageDesks(actorTiers)) return httpFail(403, 'forbidden');

    const targetEmail = normalizeEmail(targetEmailRaw);
    const target = await this.deps.accounts.byEmail(targetEmail);
    if (
      target &&
      !actorTiers.includes('master') &&
      this.resolveTier(target) === 'master'
    ) {
      return httpFail(403, 'cannot_manage_higher_role');
    }

    const freed = await this.releaseUserDesk(targetEmail);
    if (!freed) return httpFail(404, 'invalid_desk');
    return ok({ desk: freed });
  }

  // --- Multi-servidor e Convites (Fase 3) -----------------------------------

  async listServers(claims: SessionClaims): Promise<WorkspaceServer[]> {
    if (!this.deps.servers) return [];
    return this.deps.servers.listForUser(claims.email);
  }

  async createServer(
    claims: SessionClaims,
    input: CreateServerInput,
  ): Promise<HttpResult<WorkspaceServer>> {
    if (!this.deps.servers) return httpFail(501, 'not_implemented');
    const actorTiers = await this.tiersOf(claims);
    if (!canCreateServer(actorTiers)) return httpFail(403, 'forbidden');

    const server: WorkspaceServer = {
      id: `srv-${this.newId().slice(0, 8)}`,
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      accentColor: input.accentColor ?? '#5b6cff',
      visibility: input.visibility ?? 'invite',
      ownerEmail: normalizeEmail(claims.email),
      planTier: 'starter',
      maxMembers: null,
      maxPendingInvites: null,
      createdAt: this.now(),
    };
    const created = await this.deps.servers.create(server, claims.email);
    await this.deps.channels.create({
      id: `${created.id}:geral`,
      serverId: created.id,
      name: 'geral',
      kind: 'public',
      archived: false,
      position: 0,
      topic: 'Canal principal do servidor',
      viewTiers: [...ACCOUNT_TIERS],
      writeTiers: [...ACCOUNT_TIERS],
      allowedEmails: [],
      blockedEmails: [],
      createdBy: claims.email,
      createdAt: this.now(),
    });
    return ok(created);
  }

  async listServerInvites(
    claims: SessionClaims,
    serverId: string,
  ): Promise<HttpResult<ServerInvite[]>> {
    if (!this.deps.invites || !this.deps.servers) {
      return httpFail(501, 'not_implemented');
    }
    const actorTiers = await this.tiersOf(claims);
    if (!canManageServer(actorTiers)) return httpFail(403, 'forbidden');
    const srv = await this.deps.servers.get(serverId);
    if (!srv) return httpFail(404, 'server_not_found');

    if (srv.maxPendingInvites !== null) {
      const existing = await this.deps.invites.listByServer(serverId);
      const activeCount = existing.filter((i) => !i.revoked).length;
      if (activeCount >= srv.maxPendingInvites) {
        return httpFail(403, 'server_invite_limit_reached');
      }
    }
    return ok(await this.deps.invites.listByServer(serverId));
  }

  async createServerInvite(
    claims: SessionClaims,
    serverId: string,
    input: CreateServerInviteInput,
  ): Promise<HttpResult<ServerInvite>> {
    if (!this.deps.invites || !this.deps.servers) {
      return httpFail(501, 'not_implemented');
    }
    const actorTiers = await this.tiersOf(claims);
    if (!canManageServer(actorTiers)) return httpFail(403, 'forbidden');
    const srv = await this.deps.servers.get(serverId);
    if (!srv) return httpFail(404, 'server_not_found');

    if (srv.maxPendingInvites !== null) {
      const existing = await this.deps.invites.listByServer(serverId);
      const activeCount = existing.filter((i) => !i.revoked).length;
      if (activeCount >= srv.maxPendingInvites) {
        return httpFail(403, 'server_invite_limit_reached');
      }
    }

    const now = this.now();
    const code = randomBytes(4).toString('hex').toUpperCase();
    const expiresAt =
      input.expiresInHours !== null && input.expiresInHours !== undefined
        ? now + input.expiresInHours * 3_600_000
        : null;

    const invite: ServerInvite = {
      code,
      serverId,
      createdBy: normalizeEmail(claims.email),
      maxUses: input.maxUses ?? null,
      uses: 0,
      expiresAt,
      revoked: false,
      createdAt: now,
    };
    return ok(await this.deps.invites.create(invite));
  }

  async revokeServerInvite(
    claims: SessionClaims,
    serverId: string,
    code: string,
  ): Promise<HttpResult<{ ok: true }>> {
    if (!this.deps.invites) return httpFail(501, 'not_implemented');
    const actorTiers = await this.tiersOf(claims);
    if (!canManageServer(actorTiers)) return httpFail(403, 'forbidden');
    const revoked = await this.deps.invites.revoke(code, serverId);
    if (!revoked) return httpFail(404, 'invite_not_found');
    return ok({ ok: true });
  }

  async joinServerByInvite(
    claims: SessionClaims,
    code: string,
  ): Promise<HttpResult<WorkspaceServer>> {
    if (!this.deps.invites || !this.deps.servers) {
      return httpFail(501, 'not_implemented');
    }
    const invite = await this.deps.invites.getByCode(code);
    if (!invite || invite.revoked) {
      return httpFail(404, 'invite_invalid');
    }
    if (invite.expiresAt !== null && this.now() > invite.expiresAt) {
      return httpFail(410, 'invite_expired');
    }
    if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
      return httpFail(410, 'invite_exhausted');
    }
    const server = await this.deps.servers.get(invite.serverId);
    if (!server) return httpFail(404, 'server_not_found');

    const alreadyMember = await this.deps.servers.isMember(
      server.id,
      claims.email,
    );
    if (!alreadyMember) {
      if (server.maxMembers !== null) {
        const count = await this.deps.servers.countMembers(server.id);
        if (count >= server.maxMembers) {
          return httpFail(403, 'server_member_limit_reached');
        }
      }
      await this.deps.servers.addMember(
        server.id,
        claims.email,
        'member',
        this.now(),
      );
      await this.deps.invites.incrementUse(invite.code);
    }
    return ok(server);
  }

  async listInvitedEmails(
    claims: SessionClaims,
    serverId: string,
  ): Promise<
    HttpResult<
      Array<{
        serverId: string;
        email: string;
        invitedBy: string;
        createdAt: number;
      }>
    >
  > {
    if (!this.deps.invites?.listInvitedEmails || !this.deps.servers) {
      return httpFail(501, 'not_implemented');
    }
    const actorTiers = await this.tiersOf(claims);
    if (!canManageServer(actorTiers)) return httpFail(403, 'forbidden');
    const srv = await this.deps.servers.get(serverId);
    if (!srv) return httpFail(404, 'server_not_found');
    return ok(await this.deps.invites.listInvitedEmails(serverId));
  }

  async addInvitedEmail(
    claims: SessionClaims,
    serverId: string,
    emailRaw: string,
  ): Promise<
    HttpResult<{
      serverId: string;
      email: string;
      invitedBy: string;
      createdAt: number;
    }>
  > {
    if (
      !this.deps.invites?.addInvitedEmail ||
      !this.deps.invites?.listInvitedEmails ||
      !this.deps.servers
    ) {
      return httpFail(501, 'not_implemented');
    }
    const actorTiers = await this.tiersOf(claims);
    if (!canManageServer(actorTiers)) return httpFail(403, 'forbidden');
    const srv = await this.deps.servers.get(serverId);
    if (!srv) return httpFail(404, 'server_not_found');

    const email = normalizeEmail(emailRaw);
    if (srv.maxPendingInvites !== null) {
      const existing = await this.deps.invites.listInvitedEmails(serverId);
      if (
        !existing.some((e) => e.email === email) &&
        existing.length >= srv.maxPendingInvites
      ) {
        return httpFail(403, 'server_invite_limit_reached');
      }
    }

    const createdAt = this.now();
    await this.deps.invites.addInvitedEmail(
      serverId,
      email,
      normalizeEmail(claims.email),
      createdAt,
    );
    return ok({
      serverId,
      email,
      invitedBy: normalizeEmail(claims.email),
      createdAt,
    });
  }

  async removeInvitedEmail(
    claims: SessionClaims,
    serverId: string,
    emailRaw: string,
  ): Promise<HttpResult<{ ok: true }>> {
    if (!this.deps.invites?.removeInvitedEmail) {
      return httpFail(501, 'not_implemented');
    }
    const actorTiers = await this.tiersOf(claims);
    if (!canManageServer(actorTiers)) return httpFail(403, 'forbidden');
    const removed = await this.deps.invites.removeInvitedEmail(
      serverId,
      normalizeEmail(emailRaw),
    );
    if (!removed) return httpFail(404, 'invite_not_found');
    return ok({ ok: true });
  }
}
