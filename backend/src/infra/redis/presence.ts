import type { Redis } from 'ioredis';
import type { Presence } from '../../modules/realtime/cluster.ports.js';
import { PlayerSchema, type Player } from '../../shared/domain/index.js';

/** Em memória. Instâncias que dividem o mesmo `store` se enxergam (testes). */
export class MemoryPresence implements Presence {
  private readonly store: Map<string, Map<string, Player>>;

  constructor(store: Map<string, Map<string, Player>> = new Map()) {
    this.store = store;
  }

  async set(origin: string, player: Player) {
    const players = this.store.get(origin) ?? new Map<string, Player>();
    players.set(player.id, player);
    this.store.set(origin, players);
  }

  async remove(origin: string, playerId: string) {
    this.store.get(origin)?.delete(playerId);
  }

  async heartbeat() {}

  async others(origin: string) {
    return [...this.store]
      .filter(([key]) => key !== origin)
      .flatMap(([, players]) => [...players.values()]);
  }
}

const KEY_PREFIX = 'virtual-office:presence:';
/** Se a instância parar de renovar (caiu), a lista dela some depois disto. */
export const PRESENCE_TTL_MS = 60_000;

/**
 * Redis/Valkey: um hash por instância, com validade. Se uma instância cair
 * sem avisar, a lista dela expira sozinha.
 */
export class RedisPresence implements Presence {
  private readonly redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async set(origin: string, player: Player) {
    const key = KEY_PREFIX + origin;
    await this.redis.hset(key, player.id, JSON.stringify(player));
    await this.redis.pexpire(key, PRESENCE_TTL_MS);
  }

  async remove(origin: string, playerId: string) {
    await this.redis.hdel(KEY_PREFIX + origin, playerId);
  }

  async heartbeat(origin: string) {
    await this.redis.pexpire(KEY_PREFIX + origin, PRESENCE_TTL_MS);
  }

  async others(origin: string) {
    const own = KEY_PREFIX + origin;
    const keys = (await this.redis.keys(`${KEY_PREFIX}*`)).filter(
      (key) => key !== own,
    );
    const lists = await Promise.all(keys.map((key) => this.redis.hvals(key)));
    return lists.flat().flatMap((raw) => {
      try {
        const parsed = PlayerSchema.safeParse(JSON.parse(raw));
        return parsed.success ? [parsed.data] : [];
      } catch {
        return [];
      }
    });
  }
}
