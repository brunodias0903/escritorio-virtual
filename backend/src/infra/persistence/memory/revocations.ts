import type { Revocations } from '../../../modules/auth/auth.repository.js';

export class MemoryRevocations implements Revocations {
  private readonly revoked = new Map<string, number>();
  private readonly now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  async revoke(sessionId: string, ttlSeconds: number) {
    this.revoked.set(sessionId, this.now() + ttlSeconds * 1000);
  }

  async isRevoked(sessionId: string) {
    const until = this.revoked.get(sessionId);
    if (until === undefined) return false;
    if (until <= this.now()) {
      this.revoked.delete(sessionId);
      return false;
    }
    return true;
  }
}
