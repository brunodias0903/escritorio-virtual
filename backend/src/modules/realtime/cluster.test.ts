import type { Redis } from 'ioredis';
import RedisMock from 'ioredis-mock';
import { describe, expect, it } from 'vitest';
import {
  MemoryBus,
  MemoryPresence,
  RedisBus,
  RedisPresence,
  RedisRevocations,
} from '../../infra/redis/index.js';
import {
  defaultAppearance,
  type Player,
  type ServerMessage,
} from '../../shared/domain/index.js';
import { OfficeService, type Outgoing } from '../office/office.service.js';
import type { BusEvent, Presence } from './cluster.ports.js';
import { Cluster, flushPresence } from './cluster.js';

type Delivery = { sender: string; outgoing: Outgoing };

const appearance = defaultAppearance('x');

const node = (origin: string, bus: MemoryBus, presence: Presence) => {
  const delivered: Delivery[] = [];
  const office = new OfficeService();
  const cluster = new Cluster({
    origin,
    bus,
    presence,
    deliver: (sender, outgoing) => delivered.push({ sender, outgoing }),
    onRemote: (message) => office.applyRemote(message),
  });
  return { cluster, delivered, office };
};

const ana: Player = {
  id: 'a',
  name: 'Ana',
  color: 1,
  x: 1,
  y: 2,
  map: 'lobby',
  status: 'available',
  appearance,
};
const left: ServerMessage = { type: 'left', id: 'a' };

const pair = async () => {
  const hub = new Set<MemoryBus>();
  const store = new Map();
  const one = node('one', new MemoryBus(hub), new MemoryPresence(store));
  const two = node('two', new MemoryBus(hub), new MemoryPresence(store));
  await one.cluster.start();
  await two.cluster.start();
  return { one, two };
};

describe('Cluster', () => {
  it('entrega localmente e repassa às outras instâncias, com sala e destinatários', async () => {
    const { one, two } = await pair();
    const outgoing: Outgoing = {
      to: 'all',
      message: left,
      map: 'lobby',
      emails: ['a@x.com'],
    };

    await one.cluster.dispatch('a', [outgoing]);

    expect(one.delivered).toEqual([{ sender: 'a', outgoing }]);
    expect(two.delivered).toEqual([{ sender: 'a', outgoing }]);
  });

  it('mensagens "self" não saem da instância', async () => {
    const { one, two } = await pair();
    await one.cluster.dispatch('a', [{ to: 'self', message: left }]);
    expect(one.delivered).toHaveLength(1);
    expect(two.delivered).toHaveLength(0);
  });

  it('uma instância só funciona sem receber o próprio eco', async () => {
    const solo = node('solo', new MemoryBus(), new MemoryPresence());
    await solo.cluster.start();
    await solo.cluster.dispatch('a', [{ to: 'others', message: left }]);
    expect(solo.delivered).toHaveLength(1);
  });

  it('o espelho da outra instância acompanha entradas, movimentos e saídas', async () => {
    const { one, two } = await pair();

    await one.cluster.dispatch(
      'a',
      one.office.join('a', 'Ana', 'ana@x.com', appearance),
    );
    expect(two.office.playersIn('lobby').map((p) => p.id)).toEqual(['a']);

    const { x, y } = one.office.players.get('a')!;
    await one.cluster.dispatch('a', one.office.move('a', x + 32, y));
    expect(two.office.playersIn('lobby')[0]?.x).toBe(x + 32);

    await one.cluster.dispatch('a', one.office.leave('a'));
    expect(two.office.playersIn('lobby')).toEqual([]);
  });

  it('mostra a quem entra os jogadores das outras instâncias', async () => {
    const { one, two } = await pair();

    await one.cluster.playerChanged(ana);
    expect(await two.cluster.remotePlayers()).toEqual([ana]);
    expect(await one.cluster.remotePlayers()).toEqual([]);

    await one.cluster.playerLeft('a');
    expect(await two.cluster.remotePlayers()).toEqual([]);
    await one.cluster.heartbeat();
    await one.cluster.close();
  });
});

describe('flushPresence', () => {
  it('grava só quem mudou e esquece quem saiu', async () => {
    const saved: string[] = [];
    const cluster = {
      playerChanged: async (player: Player) => {
        saved.push(`${player.id}@${player.x}/${player.status}`);
      },
    };
    const last = new Map<string, string>();

    await flushPresence(cluster, [ana], last);
    await flushPresence(cluster, [ana], last);
    await flushPresence(cluster, [{ ...ana, x: 9 }], last);
    await flushPresence(cluster, [{ ...ana, x: 9, status: 'busy' }], last);
    expect(saved).toEqual(['a@1/available', 'a@9/available', 'a@9/busy']);

    await flushPresence(cluster, [], last);
    expect(last.size).toBe(0);
  });
});

describe('RedisBus', () => {
  it('leva eventos de uma conexão a outra e ignora lixo', async () => {
    const make = () => new RedisMock() as unknown as Redis;
    const bus = new RedisBus(make(), make());
    const received: BusEvent[] = [];
    await bus.subscribe((event) => received.push(event));

    const event: BusEvent = {
      origin: 'x',
      sender: 'a',
      to: 'all',
      message: left,
      map: 'lobby',
      emails: ['a@x.com'],
    };
    await bus.publish(event);
    const raw = make();
    await raw.publish('virtual-office:events', 'não é json');
    await raw.publish('virtual-office:events', JSON.stringify({ origin: 1 }));
    await raw.publish('outro-canal', JSON.stringify(event));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(received).toEqual([event]);
    await bus.close();
  });
});

describe('RedisPresence', () => {
  it('guarda por instância, com validade, e ignora dados quebrados', async () => {
    const redis = new RedisMock() as unknown as Redis;
    await redis.flushall();
    const one = new RedisPresence(redis);
    const two = new RedisPresence(redis);

    await one.set('one', ana);
    expect(await redis.pttl('virtual-office:presence:one')).toBeGreaterThan(0);
    expect(await two.others('two')).toEqual([ana]);
    expect(await one.others('one')).toEqual([]);

    await redis.hset('virtual-office:presence:one', 'ruim', 'nao-json');
    await redis.hset('virtual-office:presence:one', 'estranho', '{"x":1}');
    expect(await two.others('two')).toEqual([ana]);

    await one.heartbeat('one');
    await one.remove('one', 'a');
    expect(await two.others('two')).toEqual([]);
  });
});

describe('RedisRevocations', () => {
  it('marca a sessão como encerrada, com validade', async () => {
    const redis = new RedisMock() as unknown as Redis;
    await redis.flushall();
    const revocations = new RedisRevocations(redis);

    expect(await revocations.isRevoked('s1')).toBe(false);
    await revocations.revoke('s1', 120);
    expect(await revocations.isRevoked('s1')).toBe(true);
    expect(await revocations.isRevoked('s2')).toBe(false);
    expect(await redis.ttl('virtual-office:revoked:s1')).toBeGreaterThan(0);

    await revocations.revoke('s3', 0);
    expect(await redis.ttl('virtual-office:revoked:s3')).toBeGreaterThan(0);
  });
});
