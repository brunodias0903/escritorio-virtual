import type {
  ChannelRepository,
  ChannelRow,
} from '../../../modules/chat/chat.repository.js';
import {
  ACCOUNT_TIERS,
  SEED_CHANNELS,
  dmMembers,
  type AccountTier,
} from '../../../shared/domain/index.js';

export class MemoryChannelRepository implements ChannelRepository {
  private readonly channels = new Map<string, ChannelRow>();

  constructor() {
    for (const name of SEED_CHANNELS) {
      this.channels.set(name, {
        id: name,
        name,
        kind: 'public',
        archived: false,
        position: 0,
        topic: '',
        viewTiers: [...ACCOUNT_TIERS],
        writeTiers: [...ACCOUNT_TIERS],
        allowedEmails: [],
        blockedEmails: [],
        createdBy: null,
        createdAt: 0,
      });
    }
  }

  async get(id: string) {
    return this.channels.get(id);
  }

  async listPublic(serverId = 'default') {
    return [...this.channels.values()]
      .filter(
        (c) => c.kind === 'public' && (c.serverId ?? 'default') === serverId,
      )
      .sort(
        (a, b) =>
          (a.position ?? 0) - (b.position ?? 0) ||
          a.createdAt - b.createdAt ||
          a.name.localeCompare(b.name),
      );
  }

  async listDirect(email: string) {
    return [...this.channels.values()].filter(
      (c) => c.kind === 'dm' && dmMembers(c.id)?.includes(email),
    );
  }

  async create(channel: ChannelRow) {
    const nameTaken =
      channel.kind === 'public' &&
      [...this.channels.values()].some(
        (c) => c.kind === 'public' && c.name === channel.name,
      );
    if (this.channels.has(channel.id) || nameTaken) return false;
    this.channels.set(channel.id, {
      position: 0,
      viewTiers: [...ACCOUNT_TIERS],
      writeTiers: [...ACCOUNT_TIERS],
      allowedEmails: [],
      blockedEmails: [],
      ...channel,
    });
    return true;
  }

  async setArchived(id: string, archived: boolean) {
    const channel = this.channels.get(id);
    if (!channel) return false;
    this.channels.set(id, { ...channel, archived });
    return true;
  }

  async updateConfig(
    id: string,
    patch: {
      topic?: string;
      viewTiers?: AccountTier[];
      writeTiers?: AccountTier[];
      allowedEmails?: string[];
      blockedEmails?: string[];
      archived?: boolean;
    },
  ) {
    const channel = this.channels.get(id);
    if (!channel) return false;
    this.channels.set(id, {
      ...channel,
      ...(patch.topic !== undefined ? { topic: patch.topic } : {}),
      ...(patch.viewTiers !== undefined
        ? { viewTiers: [...patch.viewTiers] }
        : {}),
      ...(patch.writeTiers !== undefined
        ? { writeTiers: [...patch.writeTiers] }
        : {}),
      ...(patch.allowedEmails !== undefined
        ? { allowedEmails: [...patch.allowedEmails] }
        : {}),
      ...(patch.blockedEmails !== undefined
        ? { blockedEmails: [...patch.blockedEmails] }
        : {}),
      ...(patch.archived !== undefined ? { archived: patch.archived } : {}),
    });
    return true;
  }

  async reorder(orderedIds: string[]) {
    const existing = await this.listPublic();
    const seen = new Set<string>();
    const fullOrder: string[] = [];
    for (const id of orderedIds) {
      if (!seen.has(id) && existing.some((c) => c.id === id)) {
        seen.add(id);
        fullOrder.push(id);
      }
    }
    for (const row of existing) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        fullOrder.push(row.id);
      }
    }
    fullOrder.forEach((id, index) => {
      const current = this.channels.get(id);
      if (current) this.channels.set(id, { ...current, position: index });
    });
  }
}
