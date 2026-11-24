import { randomUUID } from 'node:crypto';
import {
  ACCOUNT_TIERS,
  CHANNEL_NAME_PATTERN,
  canAttachFeedbackMr,
  canManageServer,
  canProgressFeedback,
  canResolveFeedback,
  canSeeFeedbackMr,
  type AccountTier,
  type CreateChannelConfig,
  type CreateFeedback,
  type CreateFeedbackComment,
  type FeedbackComment,
  type FeedbackItem,
  type ServerSettings,
  type UpdateChannelConfig,
  type UpdateFeedback,
  type UpdateServerSettings,
} from '../../shared/domain/index.js';
import { httpFail, ok, type HttpResult } from '../../shared/result.js';
import type { LocalAccountRepository } from '../auth/auth.repository.js';
import type { SessionClaims } from '../auth/token.js';
import type { ChannelRepository, ChannelRow } from '../chat/chat.repository.js';
import type {
  FeedbackRepository,
  ServerSettingsRepository,
} from './workspace.repository.js';

type Deps = {
  settings: ServerSettingsRepository;
  feedback: FeedbackRepository;
  channels: ChannelRepository;
  accounts: LocalAccountRepository;
  onChannelsChanged?: () => void;
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

  private async tierOf(claims: SessionClaims): Promise<AccountTier> {
    const account = await this.deps.accounts.byEmail(claims.email);
    if (account?.tier) return account.tier;
    return claims.admin ? 'admin' : 'tester';
  }

  // --- Servidor & canais -----------------------------------------------------

  async getServerSettings(): Promise<ServerSettings> {
    return this.deps.settings.get();
  }

  async listPublicChannels(): Promise<ChannelRow[]> {
    return this.deps.channels.listPublic();
  }

  async updateServerSettings(
    claims: SessionClaims,
    input: UpdateServerSettings,
  ): Promise<HttpResult<ServerSettings>> {
    const tier = await this.tierOf(claims);
    if (!canManageServer(tier)) return httpFail(403, 'forbidden');

    const current = await this.deps.settings.get();
    const next: ServerSettings = {
      name: input.name,
      description: input.description,
      icon: input.icon === undefined ? current.icon : input.icon,
      welcomeMessage: input.welcomeMessage,
      allowPublicRegistration: input.allowPublicRegistration,
      updatedAt: this.now(),
    };
    const saved = await this.deps.settings.save(next, claims.email);
    return ok(saved);
  }

  async createManagedChannel(
    claims: SessionClaims,
    input: CreateChannelConfig,
  ): Promise<HttpResult<ChannelRow>> {
    const tier = await this.tierOf(claims);
    if (!canManageServer(tier)) return httpFail(403, 'forbidden');

    const name = input.name.trim().toLowerCase();
    if (!CHANNEL_NAME_PATTERN.test(name)) {
      return httpFail(400, 'invalid_name');
    }

    const writeTiers: AccountTier[] = input.writeTiers.includes('master')
      ? [...input.writeTiers]
      : ['master', ...input.writeTiers];

    const row: ChannelRow = {
      id: name,
      name,
      kind: 'public',
      archived: false,
      topic: input.topic,
      writeTiers,
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
    const tier = await this.tierOf(claims);
    if (!canManageServer(tier)) return httpFail(403, 'forbidden');

    const existing = await this.deps.channels.get(channelId);
    if (existing?.kind !== 'public') return httpFail(404, 'not_found');

    const writeTiers = input.writeTiers
      ? input.writeTiers.includes('master')
        ? [...input.writeTiers]
        : (['master', ...input.writeTiers] as AccountTier[])
      : undefined;

    if (this.deps.channels.updateConfig) {
      await this.deps.channels.updateConfig(channelId, {
        ...(input.topic !== undefined ? { topic: input.topic } : {}),
        ...(writeTiers ? { writeTiers } : {}),
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
        writeTiers: writeTiers ?? existing.writeTiers ?? [...ACCOUNT_TIERS],
        archived: input.archived ?? existing.archived,
      },
    );
  }

  // --- Central de Feedback ---------------------------------------------------

  private redactForTier(item: FeedbackItem, tier: AccountTier): FeedbackItem {
    if (canSeeFeedbackMr(tier)) return item;
    const copy: FeedbackItem = { ...item };
    delete copy.mrUrl;
    return copy;
  }

  async listFeedback(claims: SessionClaims): Promise<FeedbackItem[]> {
    const [tier, items] = await Promise.all([
      this.tierOf(claims),
      this.deps.feedback.list(),
    ]);
    return items.map((item) => this.redactForTier(item, tier));
  }

  async createFeedback(
    claims: SessionClaims,
    input: CreateFeedback,
  ): Promise<HttpResult<FeedbackItem>> {
    const tier = await this.tierOf(claims);
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
    return ok(this.redactForTier(item, tier));
  }

  async updateFeedback(
    claims: SessionClaims,
    id: string,
    input: UpdateFeedback,
  ): Promise<HttpResult<FeedbackItem>> {
    const tier = await this.tierOf(claims);
    const existing = await this.deps.feedback.get(id);
    if (!existing) return httpFail(404, 'not_found');

    const wantsMr = input.mrUrl !== undefined;
    if (wantsMr && !canAttachFeedbackMr(tier)) {
      return httpFail(403, 'forbidden');
    }

    if (input.status !== undefined) {
      const resolving =
        input.status === 'done' ||
        input.status === 'closed' ||
        input.status === 'open';
      if (resolving && !canResolveFeedback(tier)) {
        return httpFail(403, 'forbidden');
      }
      if (!resolving && !canProgressFeedback(tier)) {
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
    return ok(this.redactForTier(updated, tier));
  }

  async addFeedbackComment(
    claims: SessionClaims,
    feedbackId: string,
    input: CreateFeedbackComment,
  ): Promise<HttpResult<FeedbackComment>> {
    const existing = await this.deps.feedback.get(feedbackId);
    if (!existing) return httpFail(404, 'not_found');

    const tier = await this.tierOf(claims);
    const comment: FeedbackComment = {
      id: this.newId(),
      feedbackId,
      authorEmail: claims.email,
      authorName: claims.name,
      authorTier: tier,
      body: input.body,
      createdAt: this.now(),
    };
    await this.deps.feedback.addComment(comment);
    return ok(comment);
  }
}
