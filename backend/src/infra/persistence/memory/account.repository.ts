import type {
  AccountChanges,
  LocalAccount,
  LocalAccountRepository,
} from '../../../modules/auth/auth.repository.js';
import { nicknameKey } from '../../../shared/domain/index.js';

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
}
