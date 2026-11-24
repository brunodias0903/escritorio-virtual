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
  topic?: string | null;
  write_tiers?: AccountTier[] | null;
  created_by: string | null;
  created_at: string | number;
};

const CHANNEL_COLUMNS =
  'id, name, kind, archived, topic, write_tiers, created_by, created_at';

const toChannel = (row: ChannelDbRow): ChannelRow => ({
  id: row.id,
  name: row.name,
  kind: row.kind,
  archived: row.archived,
  topic: row.topic ?? '',
  writeTiers:
    Array.isArray(row.write_tiers) && row.write_tiers.length > 0
      ? row.write_tiers
      : [...ACCOUNT_TIERS],
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

  async listPublic() {
    const { rows } = await this.db.query(
      `SELECT ${CHANNEL_COLUMNS} FROM channels WHERE kind = 'public' ORDER BY created_at, name`,
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
        `INSERT INTO channels (id, name, kind, archived, topic, write_tiers, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          channel.id,
          channel.name,
          channel.kind,
          channel.archived,
          channel.topic ?? '',
          channel.writeTiers ?? [...ACCOUNT_TIERS],
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
    patch: { topic?: string; writeTiers?: AccountTier[]; archived?: boolean },
  ) {
    const existing = await this.get(id);
    if (!existing) return false;
    const { rowCount } = await this.db.query(
      `UPDATE channels
       SET topic = $2, write_tiers = $3, archived = $4
       WHERE id = $1`,
      [
        id,
        patch.topic ?? existing.topic ?? '',
        patch.writeTiers ?? existing.writeTiers ?? [...ACCOUNT_TIERS],
        patch.archived ?? existing.archived,
      ],
    );
    return rowCount === 1;
  }
}
