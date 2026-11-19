import type {
  EmailCode,
  EmailCodeRepository,
} from '../../../modules/auth/auth.repository.js';

export class MemoryEmailCodeRepository implements EmailCodeRepository {
  private readonly codes = new Map<string, EmailCode>();

  private key(email: string, purpose: string) {
    return `${purpose}:${email}`;
  }

  async get(email: string, purpose: string) {
    return this.codes.get(this.key(email, purpose));
  }

  async put(code: EmailCode) {
    this.codes.set(this.key(code.email, code.purpose), { ...code });
  }

  async bump(email: string, purpose: string) {
    const code = this.codes.get(this.key(email, purpose));
    if (code) code.attempts += 1;
  }

  async remove(email: string, purpose: string) {
    this.codes.delete(this.key(email, purpose));
  }
}
