import type {
  AccountChanges,
  AccountModerationPatch,
  LocalAccount,
  LocalAccountRepository,
} from '../../../modules/auth/auth.repository.js';
import {
  ACCOUNT_TIERS,
  nicknameKey,
  type AccessibilityNeed,
  type AccountTier,
  type GenderIdentity,
} from '../../../shared/domain/index.js';
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
  tier?: string;
  secondary_tiers?: string[] | null;
  email_verified?: boolean;
  email_marketing_opt_in?: boolean | null;
  ui_theme?: string | null;
  mfa_enabled?: boolean;
  mfa_method?: string | null;
  mfa_secret_enc?: string | null;
  mfa_recovery_hashes?: string[] | null;
  gender_identity?: string | null;
  pronouns?: string | null;
  accessibility_needs?: AccessibilityNeed[] | null;
  accessibility_prefs?: string | null;
  banned_at?: string | number | null;
  ban_reason?: string | null;
  restricted_until?: string | number | null;
  restriction_reason?: string | null;
};

const ACCOUNT_COLUMNS =
  'nickname, full_name, email, role, password_hash, created_at, tier, secondary_tiers, email_verified, email_marketing_opt_in, ui_theme, mfa_enabled, mfa_method, mfa_secret_enc, mfa_recovery_hashes, gender_identity, pronouns, accessibility_needs, accessibility_prefs, banned_at, ban_reason, restricted_until, restriction_reason';

const toTier = (raw: string | undefined): AccountTier =>
  (ACCOUNT_TIERS as readonly string[]).includes(raw ?? '')
    ? (raw as AccountTier)
    : 'tester';

const toSecondaryTiers = (
  raw: string[] | null | undefined,
  primary: AccountTier,
): AccountTier[] => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<AccountTier>([primary, 'master']);
  const out: AccountTier[] = [];
  for (const item of raw) {
    if ((ACCOUNT_TIERS as readonly string[]).includes(item)) {
      const tier = item as AccountTier;
      if (!seen.has(tier)) {
        seen.add(tier);
        out.push(tier);
      }
    }
  }
  return out;
};

const toAccount = (
  row: LocalAccountRow | undefined,
): LocalAccount | undefined => {
  if (!row) return undefined;
  const primaryTier = toTier(row.tier);
  const secondaryTiers = toSecondaryTiers(row.secondary_tiers, primaryTier);
  return {
    nickname: row.nickname,
    fullName: row.full_name,
    email: row.email,
    role: row.role ?? '',
    passwordHash: row.password_hash,
    createdAt: Number(row.created_at),
    tier: primaryTier,
    ...(secondaryTiers.length > 0 ? { secondaryTiers } : {}),
    emailVerified: Boolean(row.email_verified),
    emailMarketingOptIn:
      row.email_marketing_opt_in === undefined
        ? null
        : row.email_marketing_opt_in,
    uiTheme: row.ui_theme ?? null,
    mfaEnabled: Boolean(row.mfa_enabled),
    ...(row.mfa_method && row.mfa_method !== 'none'
      ? { mfaMethod: row.mfa_method as 'email' | 'totp' }
      : {}),
    mfaSecretEnc: row.mfa_secret_enc ?? null,
    mfaRecoveryHashes: Array.isArray(row.mfa_recovery_hashes)
      ? row.mfa_recovery_hashes
      : [],
    ...(row.gender_identity && row.gender_identity !== 'prefer_not_to_say'
      ? { genderIdentity: row.gender_identity as GenderIdentity }
      : {}),
    ...(row.pronouns ? { pronouns: row.pronouns } : {}),
    ...(Array.isArray(row.accessibility_needs) &&
    row.accessibility_needs.length > 0
      ? { accessibilityNeeds: row.accessibility_needs }
      : {}),
    ...(row.accessibility_prefs
      ? { accessibilityPrefs: row.accessibility_prefs }
      : {}),
    ...(row.banned_at !== undefined && row.banned_at !== null
      ? { bannedAt: Number(row.banned_at) }
      : {}),
    ...(row.ban_reason ? { banReason: row.ban_reason } : {}),
    ...(row.restricted_until !== undefined && row.restricted_until !== null
      ? { restrictedUntil: Number(row.restricted_until) }
      : {}),
    ...(row.restriction_reason
      ? { restrictionReason: row.restriction_reason }
      : {}),
  };
};

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
           (nickname_key, nickname, full_name, email, role, password_hash, created_at, tier, email_verified, email_marketing_opt_in, ui_theme, gender_identity, pronouns, accessibility_needs, accessibility_prefs)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          nicknameKey(account.nickname),
          account.nickname,
          account.fullName,
          account.email,
          account.role,
          account.passwordHash,
          account.createdAt,
          account.tier ?? 'tester',
          Boolean(account.emailVerified),
          account.emailMarketingOptIn ?? null,
          account.uiTheme ?? null,
          account.genderIdentity ?? 'prefer_not_to_say',
          account.pronouns ?? '',
          account.accessibilityNeeds ?? [],
          account.accessibilityPrefs ?? null,
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
             password_hash = COALESCE($6, password_hash),
             gender_identity = COALESCE($7, gender_identity),
             pronouns = COALESCE($8, pronouns),
             accessibility_needs = COALESCE($9, accessibility_needs),
             accessibility_prefs = COALESCE($10, accessibility_prefs)
         WHERE email = $1`,
        [
          email,
          nicknameKey(changes.nickname),
          changes.nickname,
          changes.fullName,
          changes.role,
          changes.passwordHash ?? null,
          changes.genderIdentity ?? null,
          changes.pronouns ?? null,
          changes.accessibilityNeeds ?? null,
          changes.accessibilityPrefs ?? null,
        ],
      );
      return rowCount === 1 ? ('ok' as const) : ('not_found' as const);
    } catch (error) {
      // O nickname novo (chave) já é de outra pessoa.
      if (isUniqueViolation(error)) return 'nickname_taken' as const;
      throw error;
    }
  }

  async markVerified(email: string) {
    const { rowCount } = await this.db.query(
      `UPDATE local_accounts SET email_verified = TRUE WHERE email = $1`,
      [email],
    );
    return rowCount === 1 ? ('ok' as const) : ('not_found' as const);
  }

  async changeEmail(
    oldEmail: string,
    newEmail: string,
    unlinkEmailMfa: boolean,
  ) {
    try {
      const { rowCount } = await this.db.query(
        `UPDATE local_accounts
         SET email = $2,
             email_verified = TRUE,
             mfa_enabled = CASE WHEN $3 THEN FALSE ELSE mfa_enabled END,
             mfa_method = CASE WHEN $3 THEN 'none' ELSE mfa_method END
         WHERE email = $1`,
        [oldEmail, newEmail, unlinkEmailMfa],
      );
      return rowCount === 1 ? ('ok' as const) : ('not_found' as const);
    } catch (error) {
      if (isUniqueViolation(error)) return 'email_taken' as const;
      throw error;
    }
  }

  async setUiTheme(email: string, uiTheme: string | null) {
    const { rowCount } = await this.db.query(
      `UPDATE local_accounts SET ui_theme = $2 WHERE email = $1`,
      [email, uiTheme],
    );
    return rowCount === 1 ? ('ok' as const) : ('not_found' as const);
  }

  async setEmailMarketingOptIn(email: string, optIn: boolean) {
    const { rowCount } = await this.db.query(
      `UPDATE local_accounts SET email_marketing_opt_in = $2 WHERE email = $1`,
      [email, optIn],
    );
    return rowCount === 1 ? ('ok' as const) : ('not_found' as const);
  }

  async setMfa(
    email: string,
    mfa: {
      enabled: boolean;
      method?: 'none' | 'email' | 'totp';
      secretEnc: string | null;
      recoveryHashes: string[];
    },
  ) {
    const method = mfa.method ?? (mfa.enabled ? 'totp' : 'none');
    const { rowCount } = await this.db.query(
      `UPDATE local_accounts
       SET mfa_enabled = $2, mfa_method = $3, mfa_secret_enc = $4, mfa_recovery_hashes = $5
       WHERE email = $1`,
      [email, mfa.enabled, method, mfa.secretEnc, mfa.recoveryHashes],
    );
    return rowCount === 1 ? ('ok' as const) : ('not_found' as const);
  }

  async setRoles(
    email: string,
    roles: { tier: AccountTier; secondaryTiers: AccountTier[]; role?: string },
  ) {
    const cleanSecondary = toSecondaryTiers(roles.secondaryTiers, roles.tier);
    const { rowCount } = await this.db.query(
      `UPDATE local_accounts
       SET tier = $2,
           secondary_tiers = $3,
           role = COALESCE($4, role)
       WHERE email = $1`,
      [email, roles.tier, cleanSecondary, roles.role ?? null],
    );
    return rowCount === 1 ? ('ok' as const) : ('not_found' as const);
  }

  async setModeration(email: string, moderation: AccountModerationPatch) {
    const sets: string[] = [];
    const params: unknown[] = [email];
    const push = (column: string, value: unknown) => {
      params.push(value);
      sets.push(`${column} = $${params.length}`);
    };
    if (moderation.bannedAt !== undefined) {
      push('banned_at', moderation.bannedAt);
    }
    if (moderation.banReason !== undefined) {
      push('ban_reason', moderation.banReason);
    }
    if (moderation.restrictedUntil !== undefined) {
      push('restricted_until', moderation.restrictedUntil);
    }
    if (moderation.restrictionReason !== undefined) {
      push('restriction_reason', moderation.restrictionReason);
    }
    if (sets.length === 0) {
      return (await this.byEmail(email))
        ? ('ok' as const)
        : ('not_found' as const);
    }
    const { rowCount } = await this.db.query(
      `UPDATE local_accounts SET ${sets.join(', ')} WHERE email = $1`,
      params,
    );
    return rowCount === 1 ? ('ok' as const) : ('not_found' as const);
  }

  async deleteByEmail(email: string) {
    const { rowCount } = await this.db.query(
      `DELETE FROM local_accounts WHERE email = $1`,
      [email],
    );
    return rowCount === 1 ? ('ok' as const) : ('not_found' as const);
  }
}
