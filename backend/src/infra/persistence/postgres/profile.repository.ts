import type {
  Profile,
  ProfileRepository,
  SavedPosition,
} from '../../../modules/office/profile.repository.js';
import {
  AppearanceSchema,
  MapIdSchema,
  emailHandle,
  type Appearance,
} from '../../../shared/domain/index.js';
import type { SqlClient } from '../../database/sql-client.js';

type ProfileRow = {
  email: string;
  name: string;
  appearance: string | null;
  last_seen: string | number;
  last_map: string | null;
  last_x: number | null;
  last_y: number | null;
};

const PROFILE_COLUMNS =
  'email, name, appearance, last_seen, last_map, last_x, last_y';

/** A posição guardada, se ainda é de uma sala que existe. */
const toPosition = (row: ProfileRow): SavedPosition | null => {
  const map = MapIdSchema.safeParse(row.last_map);
  if (!map.success || row.last_x === null || row.last_y === null) return null;
  return { map: map.data, x: Number(row.last_x), y: Number(row.last_y) };
};

const toProfile = (row: ProfileRow): Profile => {
  let appearance: Appearance | null = null;
  if (row.appearance) {
    try {
      const parsed = AppearanceSchema.safeParse(JSON.parse(row.appearance));
      appearance = parsed.success ? parsed.data : null;
    } catch {
      appearance = null;
    }
  }
  return {
    email: row.email,
    name: row.name,
    appearance,
    lastSeen: Number(row.last_seen),
    position: toPosition(row),
  };
};

export class PgProfileRepository implements ProfileRepository {
  private readonly db: SqlClient;

  constructor(db: SqlClient) {
    this.db = db;
  }

  async get(email: string) {
    const { rows } = await this.db.query(
      `SELECT ${PROFILE_COLUMNS} FROM profiles WHERE email = $1`,
      [email],
    );
    return rows[0] ? toProfile(rows[0] as ProfileRow) : undefined;
  }

  async touch(email: string, name: string, at: number) {
    await this.db.query(
      `INSERT INTO profiles (email, name, last_seen) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, last_seen = EXCLUDED.last_seen`,
      [email, name, at],
    );
  }

  async setAppearance(email: string, appearance: Appearance) {
    await this.db.query(
      'UPDATE profiles SET appearance = $2 WHERE email = $1',
      [email, JSON.stringify(appearance)],
    );
  }

  async setPosition(
    email: string,
    position: SavedPosition,
    serverId = 'default',
  ) {
    await this.db.query(
      `INSERT INTO profile_server_positions (email, server_id, last_map, last_x, last_y)
       SELECT $1, $2, $3, $4::integer, $5::integer
       WHERE EXISTS (SELECT 1 FROM profiles WHERE email = $1)
       ON CONFLICT (email, server_id) DO UPDATE SET
         last_map = EXCLUDED.last_map,
         last_x = EXCLUDED.last_x,
         last_y = EXCLUDED.last_y`,
      [email, serverId, position.map, position.x, position.y],
    );
    if (serverId === 'default') {
      await this.db.query(
        'UPDATE profiles SET last_map = $2, last_x = $3, last_y = $4 WHERE email = $1',
        [email, position.map, position.x, position.y],
      );
    }
  }

  async getPosition(
    email: string,
    serverId = 'default',
  ): Promise<SavedPosition | null> {
    const { rows } = await this.db.query(
      `SELECT last_map, last_x, last_y
       FROM profile_server_positions
       WHERE email = $1 AND server_id = $2
       LIMIT 1`,
      [email, serverId],
    );
    const row = rows[0] as
      | {
          last_map: string | null;
          last_x: number | null;
          last_y: number | null;
        }
      | undefined;
    if (row) {
      const parsed = MapIdSchema.safeParse(row.last_map);
      if (parsed.success && row.last_x !== null && row.last_y !== null) {
        return {
          map: parsed.data,
          x: Number(row.last_x),
          y: Number(row.last_y),
        };
      }
    }
    if (serverId === 'default') {
      const profile = await this.get(email);
      return profile?.position ?? null;
    }
    return null;
  }

  async byHandles(handles: string[]) {
    const found = await Promise.all(
      handles.map(async (handle) => {
        // "_" e "%" valem como curinga no LIKE: o filtro exato fica abaixo.
        const { rows } = await this.db.query(
          `SELECT ${PROFILE_COLUMNS} FROM profiles WHERE email LIKE $1`,
          [`${handle}@%`],
        );
        return (rows as ProfileRow[]).map(toProfile);
      }),
    );
    return found.flat().filter((p) => handles.includes(emailHandle(p.email)));
  }

  async directory(limit: number) {
    const { rows } = await this.db.query(
      `SELECT ${PROFILE_COLUMNS} FROM profiles ORDER BY name LIMIT $1`,
      [limit],
    );
    return (rows as ProfileRow[]).map(toProfile);
  }
}
