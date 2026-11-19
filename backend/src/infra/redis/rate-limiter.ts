import type { Redis } from 'ioredis';
import type { RateLimit } from '../../modules/auth/auth.repository.js';

/**
 * No Redis/Valkey: o limite vale para todas as instâncias e sobrevive a
 * reinícios. Janela fixa: o contador nasce com validade, então nunca fica preso.
 */
export class RedisRateLimiter implements RateLimit {
  private readonly redis: Redis;
  private readonly prefix: string;
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(redis: Redis, prefix: string, limit: number, windowMs: number) {
    this.redis = redis;
    this.prefix = prefix;
    this.limit = limit;
    this.windowMs = windowMs;
  }

  async attempt(key: string): Promise<boolean> {
    const redisKey = `${this.prefix}${key}`;
    await this.redis.set(redisKey, 0, 'PX', this.windowMs, 'NX');
    const count = await this.redis.incr(redisKey);
    return count <= this.limit;
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(`${this.prefix}${key}`);
  }
}
