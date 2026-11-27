import type {
  ChannelRepository,
  ChannelRow,
} from '../../../modules/chat/chat.repository.js';
import {
  ACCOUNT_TIERS,
  type AccountTier,
} from '../../../shared/domain/index.js';
import {
  isUniqueViolation,
  type SqlClient,
} from '../../database/sql-client.js';

type ChannelDbRow = {
  id: string;
  name: string;
  kind: 'public' | 'dm';
  archived: boolean;
  position?: number | string | null;
  topic?: string | null;
  view_tiers?: AccountTier[] | null;
  write_tiers?: AccountTier[] | null;
  allowed_emails?: string[] | null;
  blocked_emails?: string[] | null;
  created_by: string | null;
  created_at: string | number;
};

const CHANNEL_COLUMNS =
  'id, name, kind, archived, position, topic, view_tiers, write_tiers, allowed_emails, blocked_emails, created_by, created_at';

const toChannel = (row: ChannelDbRow): ChannelRow => ({
  id: row.id,
  name: row.name,
  kind: row.kind,
  archived: row.archived,
  position: Number(row.position ?? 0),
  topic: row.topic ?? '',
  viewTiers:
    Array.isArray(row.view_tiers) && row.view_tiers.length > 0
      ? row.view_tiers
      : [...ACCOUNT_TIERS],
  writeTiers:
    Array.isArray(row.write_tiers) && row.write_tiers.length > 0
      ? row.write_tiers
      : [...ACCOUNT_TIERS],
  allowedEmails: Array.isArray(row.allowed_emails) ? row.allowed_emails : [],
  blockedEmails: Array.isArray(row.blocked_emails) ? row.blocked_emails : [],
  createdBy: row.created_by,
  createdAt: Number(row.created_at),
});

export class PgChannelRepository implements ChannelRepository {
  private readonly db: SqlClient;

  constructor(db: SqlClient) {
    this.db = db;
  }

  async get(id: string) {
    const { rows } = await this.db.query(
      `SELECT ${CHANNEL_COLUMNS} FROM channels WHERE id = $1`,
      [id],
    );
    return rows[0] ? toChannel(rows[0] as ChannelDbRow) : undefined;
  }

  async listPublic(serverId = 'default') {
    const { rows } = await this.db.query(
      `SELECT ${CHANNEL_COLUMNS} FROM channels WHERE kind = 'public' AND server_id = $1 ORDER BY position ASC, created_at ASC, name ASC`,
      [serverId],
    );
    return rows.map((row) => toChannel(row as ChannelDbRow));
  }

  async listDirect(email: string) {
    // O id da conversa é "dm:a|b". O filtro exato abaixo protege contra curingas do LIKE.
    const { rows } = await this.db.query(
      `SELECT ${CHANNEL_COLUMNS} FROM channels WHERE kind = 'dm'
       AND (id LIKE $1 OR id LIKE $2)`,
      [`dm:${email}|%`, `dm:%|${email}`],
    );
    return rows
      .map((row) => toChannel(row as ChannelDbRow))
      .filter((channel) => channel.id.slice(3).split('|').includes(email));
  }

  async create(channel: ChannelRow) {
    try {
      await this.db.query(
        `INSERT INTO channels (id, server_id, name, kind, archived, position, topic, view_tiers, write_tiers, allowed_emails, blocked_emails, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          channel.id,
          channel.serverId ?? 'default',
          channel.name,
          channel.kind,
          channel.archived,
          channel.position ?? 0,
          channel.topic ?? '',
          channel.viewTiers ?? [...ACCOUNT_TIERS],
          channel.writeTiers ?? [...ACCOUNT_TIERS],
          channel.allowedEmails ?? [],
          channel.blockedEmails ?? [],
          channel.createdBy,
          channel.createdAt,
        ],
      );
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  }

  async setArchived(id: string, archived: boolean) {
    const { rowCount } = await this.db.query(
      'UPDATE channels SET archived = $2 WHERE id = $1',
      [id, archived],
    );
    return rowCount === 1;
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
    const existing = await this.get(id);
    if (!existing) return false;
    const { rowCount } = await this.db.query(
      `UPDATE channels
       SET topic = $2, view_tiers = $3, write_tiers = $4, allowed_emails = $5, blocked_emails = $6, archived = $7
       WHERE id = $1`,
      [
        id,
        patch.topic ?? existing.topic ?? '',
        patch.viewTiers ?? existing.viewTiers ?? [...ACCOUNT_TIERS],
        patch.writeTiers ?? existing.writeTiers ?? [...ACCOUNT_TIERS],
        patch.allowedEmails ?? existing.allowedEmails ?? [],
        patch.blockedEmails ?? existing.blockedEmails ?? [],
        patch.archived ?? existing.archived,
      ],
    );
    return rowCount === 1;
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
    await Promise.all(
      fullOrder.map((id, index) =>
        this.db.query(
          `UPDATE channels SET position = $2 WHERE id = $1 AND kind = 'public'`,
          [id, index],
        ),
      ),
    );
  }
}
