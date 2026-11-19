import type { RateLimit } from '../../../modules/auth/auth.repository.js';

/** Em memória: vale para um servidor só e zera ao reiniciar. */
export class MemoryRateLimiter implements RateLimit {
  private readonly hits = new Map<string, number[]>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor(limit: number, windowMs: number, now: () => number = Date.now) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
  }

  async attempt(key: string): Promise<boolean> {
    const current = this.now();
    const recent = (this.hits.get(key) ?? []).filter(
      (time) => current - time < this.windowMs,
    );
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(current);
    this.hits.set(key, recent);
    this.prune(current);
    return true;
  }

  async reset(key: string): Promise<void> {
    this.hits.delete(key);
  }

  /** Evita crescer sem limite com chaves antigas. */
  private prune(current: number): void {
    if (this.hits.size < 1000) return;
    for (const [key, times] of this.hits) {
      if (times.every((time) => current - time >= this.windowMs)) {
        this.hits.delete(key);
      }
    }
  }
}
