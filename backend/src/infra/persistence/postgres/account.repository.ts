import type {
  AccountChanges,
  LocalAccount,
  LocalAccountRepository,
} from '../../../modules/auth/auth.repository.js';
import { nicknameKey } from '../../../shared/domain/index.js';
import {
  isUniqueViolation,
  type SqlClient,
} from '../../database/sql-client.js';

type LocalAccountRow = {
  nickname: string;
  full_name: string;
  email: string;
  role: string;
  password_hash: string;
  created_at: string | number;
};

const ACCOUNT_COLUMNS =
  'nickname, full_name, email, role, password_hash, created_at';

const toAccount = (
  row: LocalAccountRow | undefined,
): LocalAccount | undefined =>
  row
    ? {
        nickname: row.nickname,
        fullName: row.full_name,
        email: row.email,
        role: row.role ?? '',
        passwordHash: row.password_hash,
        createdAt: Number(row.created_at),
      }
    : undefined;

export class PgLocalAccountRepository implements LocalAccountRepository {
  private readonly db: SqlClient;

  constructor(db: SqlClient) {
    this.db = db;
  }

  async byNickname(nickname: string) {
    const { rows } = await this.db.query(
      `SELECT ${ACCOUNT_COLUMNS} FROM local_accounts WHERE nickname_key = $1`,
      [nicknameKey(nickname)],
    );
    return toAccount(rows[0] as LocalAccountRow | undefined);
  }

  async byEmail(email: string) {
    const { rows } = await this.db.query(
      `SELECT ${ACCOUNT_COLUMNS} FROM local_accounts WHERE email = $1`,
      [email],
    );
    return toAccount(rows[0] as LocalAccountRow | undefined);
  }

  async create(account: LocalAccount) {
    try {
      await this.db.query(
        `INSERT INTO local_accounts
           (nickname_key, nickname, full_name, email, role, password_hash, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          nicknameKey(account.nickname),
          account.nickname,
          account.fullName,
          account.email,
          account.role,
          account.passwordHash,
          account.createdAt,
        ],
      );
      return 'ok' as const;
    } catch (error) {
      // Nickname (chave) ou e-mail (índice único) repetido.
      if (!isUniqueViolation(error)) throw error;
      return (await this.byNickname(account.nickname))
        ? ('nickname_taken' as const)
        : ('email_taken' as const);
    }
  }

  async all() {
    const { rows } = await this.db.query(
      `SELECT ${ACCOUNT_COLUMNS} FROM local_accounts ORDER BY full_name`,
    );
    return (rows as LocalAccountRow[]).map((row) => toAccount(row)!);
  }

  async update(email: string, changes: AccountChanges) {
    try {
      const { rowCount } = await this.db.query(
        `UPDATE local_accounts
         SET nickname_key = $2, nickname = $3, full_name = $4, role = $5,
             password_hash = COALESCE($6, password_hash)
         WHERE email = $1`,
        [
          email,
          nicknameKey(changes.nickname),
          changes.nickname,
          changes.fullName,
          changes.role,
          changes.passwordHash ?? null,
        ],
      );
      return rowCount === 1 ? ('ok' as const) : ('not_found' as const);
    } catch (error) {
      // O nickname novo (chave) já é de outra pessoa.
      if (isUniqueViolation(error)) return 'nickname_taken' as const;
      throw error;
    }
  }
}
