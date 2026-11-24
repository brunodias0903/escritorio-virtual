import { randomUUID } from 'node:crypto';
import {
  ACCOUNT_TIERS,
  CHANNEL_NAME_PATTERN,
  CHAT_HISTORY_LIMIT,
  CHAT_TEXT_MAX_LENGTH,
  canViewChannel,
  canWriteInChannel,
  dmChannelId,
  dmMembers,
  emailHandle,
  extractMentionHandles,
  normalizeEmail,
  type AccountTier,
  type ChannelAccess,
  type ChannelInfo,
  type ChatMessage,
} from '../../shared/domain/index.js';
import { fail, ok, type Result } from '../../shared/result.js';
import type {
  Profile,
  ProfileRepository,
} from '../office/profile.repository.js';
import type {
  ChannelRepository,
  ChannelRow,
  ChatRepository,
  ReadStateRepository,
} from './chat.repository.js';
import { ChatModerator } from './moderation.js';

/** Intervalo mínimo entre duas mensagens da mesma pessoa. */
export const CHAT_MIN_INTERVAL_MS = 300;

type Sender = {
  email: string;
  name: string;
  color: number;
  tier?: AccountTier;
  tiers?: readonly AccountTier[];
};

type Deps = {
  channels: ChannelRepository;
  chat: ChatRepository;
  reads: ReadStateRepository;
  profiles: ProfileRepository;
  now?: () => number;
  newId?: () => string;
};

/** Regras do chat: quem pode ver e escrever onde, conversas, menções e leitura. */
export class ChatService {
  private readonly deps: Deps;
  private readonly now: () => number;
  private readonly newId: () => string;
  private readonly lastSentAt = new Map<string, number>();
  private readonly moderator = new ChatModerator();

  constructor(deps: Deps) {
    this.deps = deps;
    this.now = deps.now ?? Date.now;
    this.newId = deps.newId ?? randomUUID;
  }

  /** Canais públicos ativos visíveis para os cargos da pessoa e suas conversas diretas, com não lidas. */
  async channelsFor(
    email: string,
    tiers?: readonly AccountTier[],
  ): Promise<ChannelInfo[]> {
    const [publicRows, directRows, reads] = await Promise.all([
      this.deps.channels.listPublic(),
      this.deps.channels.listDirect(email),
      this.deps.reads.all(email),
    ]);
    const visiblePublic = publicRows.filter(
      (c) => !c.archived && (!tiers || canViewChannel(c, tiers, email)),
    );
    const rows = [...visiblePublic, ...directRows];

    // Quem nunca abriu um canal começa "em dia": só o que vier depois conta.
    const now = this.now();
    for (const row of rows) {
      if (!reads.has(row.id)) {
        reads.set(row.id, now);
        await this.deps.reads.set(email, row.id, now);
      }
    }

    return Promise.all(
      rows.map(async (row): Promise<ChannelInfo> => {
        const counts = await this.deps.chat.countSince(
          row.id,
          reads.get(row.id) ?? now,
          email,
        );
        return {
          id: row.id,
          name: row.name,
          kind: row.kind,
          archived: row.archived,
          ...(row.position !== undefined ? { position: row.position } : {}),
          ...(row.topic ? { topic: row.topic } : {}),
          ...(row.viewTiers ? { viewTiers: row.viewTiers } : {}),
          ...(row.writeTiers ? { writeTiers: row.writeTiers } : {}),
          ...(row.allowedEmails?.length
            ? { allowedEmails: row.allowedEmails }
            : {}),
          ...(row.blockedEmails?.length
            ? { blockedEmails: row.blockedEmails }
            : {}),
          members: await this.membersOf(row),
          ...counts,
        };
      }),
    );
  }

  /** As últimas mensagens de cada canal que a pessoa vê. */
  async history(
    email: string,
    tiers?: readonly AccountTier[],
  ): Promise<ChatMessage[]> {
    const channels = await this.channelsFor(email, tiers);
    return this.deps.chat.recentRoots(
      channels.map((c) => c.id),
      CHAT_HISTORY_LIMIT,
    );
  }

  /**
   * Grava e devolve a mensagem. `emails` lista quem deve recebê-la quando o
   * canal é uma conversa direta; `restrictedAccess` indica que o canal público
   * tem visibilidade restrita a cargos/membros específicos.
   */
  async send(
    sender: Sender,
    channelId: string,
    rawText: string,
    threadId?: string,
  ): Promise<
    Result<{
      message: ChatMessage;
      emails?: string[];
      restrictedAccess?: Pick<
        ChannelAccess,
        'viewTiers' | 'allowedEmails' | 'blockedEmails'
      >;
      warning?: string;
    }>
  > {
    const text = rawText.trim().slice(0, CHAT_TEXT_MAX_LENGTH);
    if (!text) return fail('empty');

    const at = this.now();
    const last = this.lastSentAt.get(sender.email);
    if (last !== undefined && at - last < CHAT_MIN_INTERVAL_MS) {
      return fail('rate_limited');
    }

    const senderTiers = sender.tiers ?? (sender.tier ? [sender.tier] : null);
    const access = await this.access(
      sender.email,
      channelId,
      senderTiers ?? undefined,
    );
    if (!access.ok) return access;
    const channel = access.value;
    if (channel.archived) return fail('archived');
    if (
      channel.kind === 'public' &&
      senderTiers &&
      !canWriteInChannel(channel.writeTiers, senderTiers, channel, sender.email)
    ) {
      return fail('channel_read_only');
    }

    if (threadId) {
      const root = await this.deps.chat.byId(threadId);
      if (!root || root.channel !== channelId || root.threadId) {
        return fail('invalid_thread');
      }
    }

    const mod = this.moderator.evaluate(sender.email, text, at);
    if (!mod.allowed) return fail(mod.code);
    const cleanText = mod.text;
    this.lastSentAt.set(sender.email, at);

    const members = dmMembers(channel.id);
    const mentions = await this.resolveMentions(
      cleanText,
      sender.email,
      members,
    );
    const message: ChatMessage = {
      id: this.newId(),
      channel: channelId,
      authorId: sender.email,
      author: sender.name,
      color: sender.color,
      text: cleanText,
      at,
      ...(threadId ? { threadId } : {}),
      mentions,
      replyCount: 0,
    };
    await this.deps.chat.save(message);
    await this.deps.reads.set(sender.email, channelId, at);

    const isRestrictedPublic =
      channel.kind === 'public' &&
      ((channel.viewTiers !== undefined &&
        channel.viewTiers.length > 0 &&
        !ACCOUNT_TIERS.every((t) => channel.viewTiers!.includes(t))) ||
        (channel.blockedEmails?.length ?? 0) > 0);

    return ok({
      message,
      ...(members ? { emails: [...members] } : {}),
      ...(isRestrictedPublic
        ? {
            restrictedAccess: {
              viewTiers: channel.viewTiers,
              allowedEmails: channel.allowedEmails,
              blockedEmails: channel.blockedEmails,
            },
          }
        : {}),
      ...(mod.warning ? { warning: mod.warning } : {}),
    });
  }

  /** A conversa inteira: a mensagem que a abriu e as respostas. */
  async thread(
    email: string,
    threadId: string,
    tiers?: readonly AccountTier[],
  ): Promise<Result<ChatMessage[]>> {
    const root = await this.deps.chat.byId(threadId);
    if (!root || root.threadId) return fail('not_found');
    const access = await this.access(email, root.channel, tiers);
    if (!access.ok) return access;
    const replies = await this.deps.chat.replies(threadId);
    return ok([{ ...root, replyCount: replies.length }, ...replies]);
  }

  async markRead(
    email: string,
    channelId: string,
    tiers?: readonly AccountTier[],
  ): Promise<Result<null>> {
    const access = await this.access(email, channelId, tiers);
    if (!access.ok) return access;
    await this.deps.reads.set(email, channelId, this.now());
    return ok(null);
  }

  async createChannel(
    email: string,
    rawName: string,
  ): Promise<Result<ChannelInfo>> {
    const name = rawName.trim().toLowerCase();
    if (!CHANNEL_NAME_PATTERN.test(name)) return fail('invalid_name');
    const existingPublic = await this.deps.channels.listPublic();
    const nextPosition =
      existingPublic.reduce((max, c) => Math.max(max, c.position ?? 0), -1) + 1;
    const created = await this.deps.channels.create({
      id: name,
      name,
      kind: 'public',
      archived: false,
      position: nextPosition,
      viewTiers: [...ACCOUNT_TIERS],
      writeTiers: [...ACCOUNT_TIERS],
      allowedEmails: [],
      blockedEmails: [],
      createdBy: email,
      createdAt: this.now(),
    });
    if (!created) return fail('name_taken');
    await this.deps.reads.set(email, name, this.now());
    return ok({
      id: name,
      name,
      kind: 'public',
      archived: false,
      position: nextPosition,
      viewTiers: [...ACCOUNT_TIERS],
      writeTiers: [...ACCOUNT_TIERS],
      members: [],
      unread: 0,
      mentions: 0,
    });
  }

  /** Só quem criou o canal ou um administrador arquiva. Os canais iniciais, só administrador. */
  async archiveChannel(
    email: string,
    channelId: string,
    isAdmin: boolean,
  ): Promise<Result<null>> {
    const channel = await this.deps.channels.get(channelId);
    if (channel?.kind !== 'public') return fail('not_found');
    if (!isAdmin && channel.createdBy !== email) return fail('forbidden');
    await this.deps.channels.setArchived(channelId, true);
    return ok(null);
  }

  /** Abre (ou reaproveita) a conversa direta com outra pessoa. */
  async openDirect(
    email: string,
    rawOther: string,
  ): Promise<Result<ChannelInfo>> {
    const other = normalizeEmail(rawOther);
    if (other === email) return fail('invalid_name');
    const profile = await this.deps.profiles.get(other);
    if (!profile) return fail('not_found');

    const id = dmChannelId(email, other);
    await this.deps.channels.create({
      id,
      name: id,
      kind: 'dm',
      archived: false,
      createdBy: email,
      createdAt: this.now(),
    });
    await this.deps.reads.set(email, id, this.now());
    const row = (await this.deps.channels.get(id))!;
    return ok({
      id,
      name: profile.name,
      kind: 'dm',
      archived: false,
      members: await this.membersOf(row),
      unread: 0,
      mentions: 0,
    });
  }

  /** Pessoas que já entraram no app, para escolher com quem conversar. */
  directory(limit = 200): Promise<Profile[]> {
    return this.deps.profiles.directory(limit);
  }

  // --- Internos -----------------------------------------------------------------

  private async access(
    email: string,
    channelId: string,
    tiers?: readonly AccountTier[],
  ): Promise<Result<ChannelRow>> {
    const channel = await this.deps.channels.get(channelId);
    if (!channel) return fail('not_found');
    if (channel.kind === 'dm' && !dmMembers(channel.id)?.includes(email)) {
      return fail('forbidden');
    }
    if (
      channel.kind === 'public' &&
      tiers &&
      !canViewChannel(channel, tiers, email)
    ) {
      return fail('forbidden');
    }
    return ok(channel);
  }

  private async membersOf(
    row: ChannelRow,
  ): Promise<{ email: string; name: string }[]> {
    const members = dmMembers(row.id);
    if (!members) return [];
    return Promise.all(
      members.map(async (email) => ({
        email,
        name: (await this.deps.profiles.get(email))?.name ?? emailHandle(email),
      })),
    );
  }

  private async resolveMentions(
    text: string,
    senderEmail: string,
    members: [string, string] | null,
  ): Promise<string[]> {
    const handles = extractMentionHandles(text);
    if (handles.length === 0) return [];
    const found = await this.deps.profiles.byHandles(handles);
    return found
      .map((p) => p.email)
      .filter((email) => email !== senderEmail)
      .filter((email) => !members || members.includes(email));
  }
}
