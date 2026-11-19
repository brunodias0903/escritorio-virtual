import type { ReadStateRepository } from '../../../modules/chat/chat.repository.js';

export class MemoryReadStateRepository implements ReadStateRepository {
  private readonly state = new Map<string, Map<string, number>>();

  async all(email: string) {
    return new Map(this.state.get(email) ?? []);
  }

  async set(email: string, channel: string, readAt: number) {
    const mine = this.state.get(email) ?? new Map<string, number>();
    mine.set(channel, Math.max(readAt, mine.get(channel) ?? 0));
    this.state.set(email, mine);
  }
}
