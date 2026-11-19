import type { Redis } from 'ioredis';
import type { Revocations } from '../../modules/auth/auth.repository.js';

/** No Valkey: a sessão encerrada vale para todas as instâncias e some sozinha ao vencer. */
export class RedisRevocations implements Revocations {
  private readonly redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async revoke(sessionId: string, ttlSeconds: number) {
    await this.redis.set(
      `virtual-office:revoked:${sessionId}`,
      '1',
      'EX',
      Math.max(1, ttlSeconds),
    );
  }

  async isRevoked(sessionId: string) {
    return (
      (await this.redis.exists(`virtual-office:revoked:${sessionId}`)) === 1
    );
  }
}
