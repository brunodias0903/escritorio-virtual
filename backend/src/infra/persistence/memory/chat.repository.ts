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

  async updateMessage(
    id: string,
    patch: {
      text?: string;
      mentions?: string[];
      editedAt?: number;
      deletedAt?: number;
    },
  ) {
    const idx = this.messages.findIndex((m) => m.id === id);
    if (idx < 0) return undefined;
    const prev = this.messages[idx]!;
    const next: ChatMessage = {
      ...prev,
      ...(patch.text !== undefined ? { text: patch.text } : {}),
      ...(patch.mentions !== undefined ? { mentions: patch.mentions } : {}),
      ...(patch.editedAt !== undefined ? { editedAt: patch.editedAt } : {}),
      ...(patch.deletedAt !== undefined ? { deletedAt: patch.deletedAt } : {}),
    };
    this.messages[idx] = next;
    return { ...next };
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
      (m) =>
        m.channel === channel &&
        m.at > since &&
        m.authorId !== email &&
        !m.deletedAt,
    );
    return {
      unread: fresh.length,
      mentions: fresh.filter((m) => m.mentions.includes(email)).length,
    };
  }
}
