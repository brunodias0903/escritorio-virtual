import type { ChatRepository } from '../../../modules/chat/chat.repository.js';
import type { ChatMessage } from '../../../shared/domain/index.js';

export class MemoryChatRepository implements ChatRepository {
  private readonly messages: ChatMessage[] = [];

  async save(message: ChatMessage) {
    if (this.messages.some((m) => m.id === message.id)) return;
    this.messages.push(message);
  }

  async byId(id: string) {
    return this.messages.find((m) => m.id === id);
  }

  async recentRoots(channels: string[], limit: number) {
    return channels.flatMap((channel) =>
      this.messages
        .filter((m) => m.channel === channel && !m.threadId)
        .slice(-limit)
        .map((m) => ({
          ...m,
          replyCount: this.messages.filter((r) => r.threadId === m.id).length,
        })),
    );
  }

  async replies(threadId: string) {
    return this.messages.filter((m) => m.threadId === threadId);
  }

  async countSince(channel: string, since: number, email: string) {
    const fresh = this.messages.filter(
      (m) => m.channel === channel && m.at > since && m.authorId !== email,
    );
    return {
      unread: fresh.length,
      mentions: fresh.filter((m) => m.mentions.includes(email)).length,
    };
  }
}
