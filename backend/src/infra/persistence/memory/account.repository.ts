import type {
  AccountChanges,
  AccountModerationPatch,
  LocalAccount,
  LocalAccountRepository,
} from '../../../modules/auth/auth.repository.js';
import { nicknameKey, type AccountTier } from '../../../shared/domain/index.js';

export class MemoryLocalAccountRepository implements LocalAccountRepository {
  private readonly accounts = new Map<string, LocalAccount>();

  async byNickname(nickname: string) {
    return this.accounts.get(nicknameKey(nickname));
  }

  async byEmail(email: string) {
    return [...this.accounts.values()].find((a) => a.email === email);
  }

  async all() {
    return [...this.accounts.values()];
  }

  async update(email: string, changes: AccountChanges) {
    const current = await this.byEmail(email);
    if (!current) return 'not_found' as const;
    const key = nicknameKey(changes.nickname);
    const holder = this.accounts.get(key);
    if (holder && holder.email !== email) return 'nickname_taken' as const;
    this.accounts.delete(nicknameKey(current.nickname));
    this.accounts.set(key, {
      ...current,
      nickname: changes.nickname,
      fullName: changes.fullName,
      role: changes.role,
      passwordHash: changes.passwordHash ?? current.passwordHash,
      ...(changes.genderIdentity !== undefined
        ? { genderIdentity: changes.genderIdentity }
        : {}),
      ...(changes.pronouns !== undefined ? { pronouns: changes.pronouns } : {}),
      ...(changes.accessibilityNeeds !== undefined
        ? { accessibilityNeeds: [...changes.accessibilityNeeds] }
        : {}),
      ...(changes.accessibilityPrefs !== undefined
        ? { accessibilityPrefs: changes.accessibilityPrefs }
        : {}),
    });
    return 'ok' as const;
  }

  async create(account: LocalAccount) {
    const key = nicknameKey(account.nickname);
    if (this.accounts.has(key)) return 'nickname_taken' as const;
    if ([...this.accounts.values()].some((a) => a.email === account.email)) {
      return 'email_taken' as const;
    }
    this.accounts.set(key, account);
    return 'ok' as const;
  }

  async markVerified(email: string) {
    const current = await this.byEmail(email);
    if (!current) return 'not_found' as const;
    this.accounts.set(nicknameKey(current.nickname), {
      ...current,
      emailVerified: true,
    });
    return 'ok' as const;
  }

  async changeEmail(
    oldEmail: string,
    newEmail: string,
    unlinkEmailMfa: boolean,
  ) {
    const current = await this.byEmail(oldEmail);
    if (!current) return 'not_found' as const;
    if (
      [...this.accounts.values()].some(
        (a) => a.email === newEmail && a.email !== oldEmail,
      )
    ) {
      return 'email_taken' as const;
    }
    this.accounts.set(nicknameKey(current.nickname), {
      ...current,
      email: newEmail,
      emailVerified: true,
      ...(unlinkEmailMfa ? { mfaEnabled: false, mfaMethod: 'none' } : {}),
    });
    return 'ok' as const;
  }

  async setUiTheme(email: string, uiTheme: string | null) {
    const current = await this.byEmail(email);
    if (!current) return 'not_found' as const;
    this.accounts.set(nicknameKey(current.nickname), {
      ...current,
      uiTheme,
    });
    return 'ok' as const;
  }

  async setEmailMarketingOptIn(email: string, optIn: boolean) {
    const current = await this.byEmail(email);
    if (!current) return 'not_found' as const;
    this.accounts.set(nicknameKey(current.nickname), {
      ...current,
      emailMarketingOptIn: optIn,
    });
    return 'ok' as const;
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
    const current = await this.byEmail(email);
    if (!current) return 'not_found' as const;
    this.accounts.set(nicknameKey(current.nickname), {
      ...current,
      mfaEnabled: mfa.enabled,
      ...(mfa.method !== undefined ? { mfaMethod: mfa.method } : {}),
      mfaSecretEnc: mfa.secretEnc,
      mfaRecoveryHashes: [...mfa.recoveryHashes],
    });
    return 'ok' as const;
  }

  async setRoles(
    email: string,
    roles: { tier: AccountTier; secondaryTiers: AccountTier[]; role?: string },
  ) {
    const current = await this.byEmail(email);
    if (!current) return 'not_found' as const;
    const seen = new Set<AccountTier>([roles.tier, 'master']);
    const cleanSecondary: AccountTier[] = [];
    for (const item of roles.secondaryTiers) {
      if (!seen.has(item)) {
        seen.add(item);
        cleanSecondary.push(item);
      }
    }
    const next: LocalAccount = {
      ...current,
      tier: roles.tier,
      ...(roles.role !== undefined ? { role: roles.role } : {}),
    };
    if (cleanSecondary.length > 0) {
      next.secondaryTiers = cleanSecondary;
    } else {
      delete next.secondaryTiers;
    }
    this.accounts.set(nicknameKey(current.nickname), next);
    return 'ok' as const;
  }

  async setModeration(email: string, moderation: AccountModerationPatch) {
    const current = await this.byEmail(email);
    if (!current) return 'not_found' as const;
    const next: LocalAccount = { ...current };
    if (moderation.bannedAt !== undefined) {
      if (moderation.bannedAt === null) delete next.bannedAt;
      else next.bannedAt = moderation.bannedAt;
    }
    if (moderation.banReason !== undefined) {
      if (!moderation.banReason) delete next.banReason;
      else next.banReason = moderation.banReason;
    }
    if (moderation.restrictedUntil !== undefined) {
      if (moderation.restrictedUntil === null) delete next.restrictedUntil;
      else next.restrictedUntil = moderation.restrictedUntil;
    }
    if (moderation.restrictionReason !== undefined) {
      if (!moderation.restrictionReason) delete next.restrictionReason;
      else next.restrictionReason = moderation.restrictionReason;
    }
    this.accounts.set(nicknameKey(current.nickname), next);
    return 'ok' as const;
  }

  async deleteByEmail(email: string) {
    const current = await this.byEmail(email);
    if (!current) return 'not_found' as const;
    this.accounts.delete(nicknameKey(current.nickname));
    return 'ok' as const;
  }
}
