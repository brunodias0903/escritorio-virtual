import type { ReadStateRepository } from '../../../modules/chat/chat.repository.js';
import type { SqlClient } from '../../database/sql-client.js';

export class PgReadStateRepository implements ReadStateRepository {
  private readonly db: SqlClient;

  constructor(db: SqlClient) {
    this.db = db;
  }

  async all(email: string) {
    const { rows } = await this.db.query(
      'SELECT channel, last_read_at FROM read_state WHERE email = $1',
      [email],
    );
    return new Map(
      rows.map((row) => [row.channel as string, Number(row.last_read_at)]),
    );
  }

  async set(email: string, channel: string, readAt: number) {
    await this.db.query(
      `INSERT INTO read_state (email, channel, last_read_at) VALUES ($1, $2, $3)
       ON CONFLICT (email, channel)
       DO UPDATE SET last_read_at = GREATEST(read_state.last_read_at, EXCLUDED.last_read_at)`,
      [email, channel, readAt],
    );
  }
}
