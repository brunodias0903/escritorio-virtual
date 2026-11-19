import type {
  DeskRecord,
  DeskRepository,
} from '../../../modules/desks/desks.repository.js';
import {
  DeskConfigSchema,
  defaultDeskConfig,
  type DeskConfig,
} from '../../../shared/domain/index.js';
import {
  isUniqueViolation,
  type SqlClient,
} from '../../database/sql-client.js';

type DeskDbRow = {
  map_id: string;
  desk_id: string;
  owner_email: string;
  owner_name: string;
  owner_role: string;
  config: string;
  updated_at: string | number;
};

const DESK_COLUMNS =
  'map_id, desk_id, owner_email, owner_name, owner_role, config, updated_at';

/** Decoração guardada que não passa mais na validação vira a padrão (ex.: item removido do catálogo). */
const toDesk = (row: DeskDbRow): DeskRecord => {
  let config: DeskConfig = defaultDeskConfig(row.owner_name);
  try {
    const parsed = DeskConfigSchema.safeParse(JSON.parse(row.config));
    if (parsed.success) config = parsed.data;
  } catch {
    // mantém a padrão
  }
  return {
    map: row.map_id,
    deskId: row.desk_id,
    ownerEmail: row.owner_email,
    ownerName: row.owner_name,
    ownerRole: row.owner_role ?? '',
    config,
    updatedAt: Number(row.updated_at),
  };
};

export class PgDeskRepository implements DeskRepository {
  private readonly db: SqlClient;

  constructor(db: SqlClient) {
    this.db = db;
  }

  async all() {
    const { rows } = await this.db.query(
      `SELECT ${DESK_COLUMNS} FROM desks ORDER BY map_id, desk_id`,
    );
    return (rows as DeskDbRow[]).map(toDesk);
  }

  async get(map: string, deskId: string) {
    const { rows } = await this.db.query(
      `SELECT ${DESK_COLUMNS} FROM desks WHERE map_id = $1 AND desk_id = $2`,
      [map, deskId],
    );
    return rows[0] ? toDesk(rows[0] as DeskDbRow) : undefined;
  }

  async byOwner(email: string) {
    const { rows } = await this.db.query(
      `SELECT ${DESK_COLUMNS} FROM desks WHERE owner_email = $1`,
      [email],
    );
    return rows[0] ? toDesk(rows[0] as DeskDbRow) : undefined;
  }

  async adopt(record: DeskRecord) {
    try {
      await this.db.query(
        `INSERT INTO desks (map_id, desk_id, owner_email, owner_name, owner_role, config, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          record.map,
          record.deskId,
          record.ownerEmail,
          record.ownerName,
          record.ownerRole,
          JSON.stringify(record.config),
          record.updatedAt,
        ],
      );
      return true;
    } catch (error) {
      // 23505: a mesa já tem dono, ou a pessoa já tem outra mesa (índices únicos).
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  }

  async release(map: string, deskId: string) {
    const { rowCount } = await this.db.query(
      'DELETE FROM desks WHERE map_id = $1 AND desk_id = $2',
      [map, deskId],
    );
    return rowCount === 1;
  }

  async setConfig(map: string, deskId: string, config: DeskConfig, at: number) {
    const { rowCount } = await this.db.query(
      'UPDATE desks SET config = $3, updated_at = $4 WHERE map_id = $1 AND desk_id = $2',
      [map, deskId, JSON.stringify(config), at],
    );
    return rowCount === 1;
  }

  async setOwner(email: string, name: string, role: string) {
    const { rowCount } = await this.db.query(
      'UPDATE desks SET owner_name = $2, owner_role = $3 WHERE owner_email = $1',
      [email, name, role],
    );
    return (rowCount ?? 0) > 0;
  }
}
