import type {
  ChannelRepository,
  ChannelRow,
} from '../../../modules/chat/chat.repository.js';
import { SEED_CHANNELS, dmMembers } from '../../../shared/domain/index.js';

export class MemoryChannelRepository implements ChannelRepository {
  private readonly channels = new Map<string, ChannelRow>();

  constructor() {
    for (const name of SEED_CHANNELS) {
      this.channels.set(name, {
        id: name,
        name,
        kind: 'public',
        archived: false,
        createdBy: null,
        createdAt: 0,
      });
    }
  }

  async get(id: string) {
    return this.channels.get(id);
  }

  async listPublic() {
    return [...this.channels.values()]
      .filter((c) => c.kind === 'public')
      .sort(
        (a, b) => a.createdAt - b.createdAt || a.name.localeCompare(b.name),
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
    this.channels.set(channel.id, channel);
    return true;
  }

  async setArchived(id: string, archived: boolean) {
    const channel = this.channels.get(id);
    if (!channel) return false;
    this.channels.set(id, { ...channel, archived });
    return true;
  }
}
