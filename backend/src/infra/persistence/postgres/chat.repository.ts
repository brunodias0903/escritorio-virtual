import type { ChatRepository } from '../../../modules/chat/chat.repository.js';
import type { ChatMessage } from '../../../shared/domain/index.js';
import type { SqlClient } from '../../database/sql-client.js';

type ChatRow = {
  id: string;
  channel: string;
  author_id: string;
  author: string;
  color: number;
  text: string;
  at: string | number;
  thread_id: string | null;
  mentions: string;
  reply_count?: string | number;
};

const CHAT_COLUMNS =
  'id, channel, author_id, author, color, text, at, thread_id, mentions';

const parseMentions = (raw: string): string[] => {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
};

const toMessage = (row: ChatRow): ChatMessage => ({
  id: row.id,
  channel: row.channel,
  authorId: row.author_id,
  author: row.author,
  color: row.color,
  text: row.text,
  at: Number(row.at),
  ...(row.thread_id ? { threadId: row.thread_id } : {}),
  mentions: parseMentions(row.mentions),
  replyCount: Number(row.reply_count ?? 0),
});

export class PgChatRepository implements ChatRepository {
  private readonly db: SqlClient;

  constructor(db: SqlClient) {
    this.db = db;
  }

  async save(message: ChatMessage) {
    await this.db.query(
      `INSERT INTO chat_messages (id, channel, author_id, author, color, text, at, thread_id, mentions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [
        message.id,
        message.channel,
        message.authorId,
        message.author,
        message.color,
        message.text,
        message.at,
        message.threadId ?? null,
        JSON.stringify(message.mentions),
      ],
    );
  }

  async byId(id: string) {
    const { rows } = await this.db.query(
      `SELECT ${CHAT_COLUMNS} FROM chat_messages WHERE id = $1`,
      [id],
    );
    return rows[0] ? toMessage(rows[0] as ChatRow) : undefined;
  }

  async recentRoots(channels: string[], limit: number) {
    const perChannel = await Promise.all(
      channels.map(async (channel) => {
        const { rows } = await this.db.query(
          `SELECT ${CHAT_COLUMNS} FROM chat_messages
           WHERE channel = $1 AND thread_id IS NULL
           ORDER BY at DESC, id DESC LIMIT $2`,
          [channel, limit],
        );
        const roots = (rows as ChatRow[]).reverse();
        if (roots.length === 0) return [];
        const ids = roots.map((row) => row.id);
        const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
        const { rows: replyRows } = await this.db.query(
          `SELECT thread_id FROM chat_messages WHERE thread_id IN (${placeholders})`,
          ids,
        );
        const counts = new Map<string, number>();
        for (const reply of replyRows) {
          const threadId = reply.thread_id as string;
          counts.set(threadId, (counts.get(threadId) ?? 0) + 1);
        }
        return roots.map((row) =>
          toMessage({ ...row, reply_count: counts.get(row.id) ?? 0 }),
        );
      }),
    );
    return perChannel.flat();
  }

  async replies(threadId: string) {
    const { rows } = await this.db.query(
      `SELECT ${CHAT_COLUMNS} FROM chat_messages WHERE thread_id = $1 ORDER BY at, id`,
      [threadId],
    );
    return (rows as ChatRow[]).map(toMessage);
  }

  async countSince(channel: string, since: number, email: string) {
    const { rows } = await this.db.query(
      `SELECT ${CHAT_COLUMNS} FROM chat_messages
       WHERE channel = $1 AND at > $2 AND author_id <> $3`,
      [channel, since, email],
    );
    const fresh = (rows as ChatRow[]).map(toMessage);
    return {
      unread: fresh.length,
      mentions: fresh.filter((m) => m.mentions.includes(email)).length,
    };
  }
}
