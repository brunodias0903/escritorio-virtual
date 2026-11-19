import type { Redis } from 'ioredis';
import RedisMock from 'ioredis-mock';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRateLimiter } from '../persistence/memory/index.js';
import { RedisRateLimiter } from './rate-limiter.js';

describe('MemoryRateLimiter', () => {
  it('bloqueia depois do limite e libera quando a janela passa', async () => {
    let time = 0;
    const limiter = new MemoryRateLimiter(2, 1000, () => time);
    expect(await limiter.attempt('a')).toBe(true);
    expect(await limiter.attempt('a')).toBe(true);
    expect(await limiter.attempt('a')).toBe(false);
    expect(await limiter.attempt('b')).toBe(true);
    time = 1001;
    expect(await limiter.attempt('a')).toBe(true);
  });

  it('reset libera a chave', async () => {
    const limiter = new MemoryRateLimiter(1, 1000, () => 0);
    await limiter.attempt('a');
    expect(await limiter.attempt('a')).toBe(false);
    await limiter.reset('a');
    expect(await limiter.attempt('a')).toBe(true);
  });

  it('descarta chaves antigas quando há muitas', async () => {
    let time = 0;
    const limiter = new MemoryRateLimiter(1, 1000, () => time);
    for (let i = 0; i < 1000; i++) await limiter.attempt(`k${i}`);
    time = 5000;
    expect(await limiter.attempt('nova')).toBe(true);
    expect(await limiter.attempt('k1')).toBe(true);
  });
});

describe('RedisRateLimiter', () => {
  let redis: Redis;

  beforeEach(async () => {
    redis = new RedisMock() as unknown as Redis;
    await redis.flushall();
  });

  it('bloqueia depois do limite e separa as chaves', async () => {
    const limiter = new RedisRateLimiter(redis, 'rl:', 2, 60_000);
    expect(await limiter.attempt('a')).toBe(true);
    expect(await limiter.attempt('a')).toBe(true);
    expect(await limiter.attempt('a')).toBe(false);
    expect(await limiter.attempt('b')).toBe(true);
  });

  it('o contador nasce com validade (nunca fica preso)', async () => {
    const limiter = new RedisRateLimiter(redis, 'rl:', 1, 60_000);
    await limiter.attempt('a');
    expect(await redis.pttl('rl:a')).toBeGreaterThan(0);
  });

  it('duas instâncias compartilham o mesmo contador', async () => {
    const one = new RedisRateLimiter(redis, 'rl:', 1, 60_000);
    const two = new RedisRateLimiter(redis, 'rl:', 1, 60_000);
    expect(await one.attempt('a')).toBe(true);
    expect(await two.attempt('a')).toBe(false);
  });

  it('reset libera a chave', async () => {
    const limiter = new RedisRateLimiter(redis, 'rl:', 1, 60_000);
    await limiter.attempt('a');
    await limiter.reset('a');
    expect(await limiter.attempt('a')).toBe(true);
  });
});
