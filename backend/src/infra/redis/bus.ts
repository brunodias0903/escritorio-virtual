import type { Redis } from 'ioredis';
import {
  BusEventSchema,
  type Bus,
  type BusEvent,
} from '../../modules/realtime/cluster.ports.js';

/** Barramento em memória. Instâncias que dividem o mesmo `hub` se enxergam (testes). */
export class MemoryBus implements Bus {
  private readonly hub: Set<MemoryBus>;
  private handler: ((event: BusEvent) => void) | null = null;

  constructor(hub: Set<MemoryBus> = new Set()) {
    this.hub = hub;
    hub.add(this);
  }

  async publish(event: BusEvent) {
    for (const peer of this.hub) peer.handler?.(event);
  }

  async subscribe(handler: (event: BusEvent) => void) {
    this.handler = handler;
  }

  async close() {
    this.hub.delete(this);
  }
}

export const BUS_CHANNEL = 'virtual-office:events';

/** Redis/Valkey Pub/Sub. Precisa de duas conexões: uma só para ouvir. */
export class RedisBus implements Bus {
  private readonly publisher: Redis;
  private readonly subscriber: Redis;

  constructor(publisher: Redis, subscriber: Redis) {
    this.publisher = publisher;
    this.subscriber = subscriber;
  }

  async publish(event: BusEvent) {
    await this.publisher.publish(BUS_CHANNEL, JSON.stringify(event));
  }

  async subscribe(handler: (event: BusEvent) => void) {
    this.subscriber.on('message', (channel: string, raw: string) => {
      if (channel !== BUS_CHANNEL) return;
      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        return;
      }
      const parsed = BusEventSchema.safeParse(data);
      if (parsed.success) handler(parsed.data);
    });
    await this.subscriber.subscribe(BUS_CHANNEL);
  }

  async close() {
    this.subscriber.disconnect();
    this.publisher.disconnect();
  }
}
