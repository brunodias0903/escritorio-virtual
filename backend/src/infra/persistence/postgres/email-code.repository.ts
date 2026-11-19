import type {
  EmailCode,
  EmailCodeRepository,
} from '../../../modules/auth/auth.repository.js';
import type { SqlClient } from '../../database/sql-client.js';

type EmailCodeRow = {
  email: string;
  purpose: string;
  code_hash: string;
  expires_at: string | number;
  sent_at: string | number;
  attempts: number;
};

export class PgEmailCodeRepository implements EmailCodeRepository {
  private readonly db: SqlClient;

  constructor(db: SqlClient) {
    this.db = db;
  }

  async get(email: string, purpose: string) {
    const { rows } = await this.db.query(
      `SELECT email, purpose, code_hash, expires_at, sent_at, attempts
       FROM email_codes WHERE email = $1 AND purpose = $2`,
      [email, purpose],
    );
    const row = rows[0] as EmailCodeRow | undefined;
    return row
      ? {
          email: row.email,
          purpose: row.purpose,
          codeHash: row.code_hash,
          expiresAt: Number(row.expires_at),
          sentAt: Number(row.sent_at),
          attempts: Number(row.attempts),
        }
      : undefined;
  }

  async put(code: EmailCode) {
    await this.db.query(
      `INSERT INTO email_codes (email, purpose, code_hash, expires_at, sent_at, attempts)
       VALUES ($1, $2, $3, $4, $5, 0)
       ON CONFLICT (email, purpose) DO UPDATE SET
         code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at,
         sent_at = EXCLUDED.sent_at, attempts = 0`,
      [code.email, code.purpose, code.codeHash, code.expiresAt, code.sentAt],
    );
  }

  async bump(email: string, purpose: string) {
    await this.db.query(
      'UPDATE email_codes SET attempts = attempts + 1 WHERE email = $1 AND purpose = $2',
      [email, purpose],
    );
  }

  async remove(email: string, purpose: string) {
    await this.db.query(
      'DELETE FROM email_codes WHERE email = $1 AND purpose = $2',
      [email, purpose],
    );
  }
}
