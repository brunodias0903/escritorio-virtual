import type { Player, ServerMessage } from '../../shared/domain/index.js';
import type { Outgoing } from '../office/office.service.js';
import type { Bus, Presence } from './cluster.ports.js';

type Options = {
  /** Identifica esta instância (único a cada subida). */
  origin: string;
  bus: Bus;
  presence: Presence;
  /** Entrega a mensagem aos sockets desta instância. */
  deliver: (sender: string, outgoing: Outgoing) => void;
  /** Avisa o que aconteceu em outra instância (para manter o espelho em dia). */
  onRemote: (message: ServerMessage) => void;
};

/**
 * Liga várias instâncias do servidor: o que acontece numa chega aos
 * jogadores das outras. Com uma instância só, funciona igual, sem custo.
 */
export class Cluster {
  readonly origin: string;
  private readonly bus: Bus;
  private readonly presence: Presence;
  private readonly deliver: Options['deliver'];
  private readonly onRemote: Options['onRemote'];

  constructor({ origin, bus, presence, deliver, onRemote }: Options) {
    this.origin = origin;
    this.bus = bus;
    this.presence = presence;
    this.deliver = deliver;
    this.onRemote = onRemote;
  }

  async start(): Promise<void> {
    await this.bus.subscribe((event) => {
      if (event.origin === this.origin) return;
      this.onRemote(event.message);
      this.deliver(event.sender, {
        to: event.to,
        message: event.message,
        ...(event.map ? { map: event.map } : {}),
        ...(event.emails ? { emails: event.emails } : {}),
      });
    });
  }

  /** Entrega aos sockets locais e repassa às outras instâncias. */
  async dispatch(sender: string, outgoing: Outgoing[]): Promise<void> {
    for (const item of outgoing) {
      this.deliver(sender, item);
      if (item.to === 'self') continue;
      await this.bus.publish({
        origin: this.origin,
        sender,
        to: item.to,
        message: item.message,
        ...(item.map ? { map: item.map } : {}),
        ...(item.emails ? { emails: item.emails } : {}),
      });
    }
  }

  remotePlayers(): Promise<Player[]> {
    return this.presence.others(this.origin);
  }

  playerChanged(player: Player): Promise<void> {
    return this.presence.set(this.origin, player);
  }

  playerLeft(playerId: string): Promise<void> {
    return this.presence.remove(this.origin, playerId);
  }

  heartbeat(): Promise<void> {
    return this.presence.heartbeat(this.origin);
  }

  close(): Promise<void> {
    return this.bus.close();
  }
}

/**
 * Grava no Presence os jogadores que mudaram desde a última vez (posição,
 * sala, status ou aparência). `lastSaved` guarda o que foi gravado de cada um.
 */
export const flushPresence = async (
  cluster: Pick<Cluster, 'playerChanged'>,
  players: Iterable<Player>,
  lastSaved: Map<string, string>,
): Promise<void> => {
  const seen = new Set<string>();
  for (const player of players) {
    seen.add(player.id);
    const snapshot = JSON.stringify(player);
    if (lastSaved.get(player.id) === snapshot) continue;
    lastSaved.set(player.id, snapshot);
    await cluster.playerChanged(player);
  }
  for (const id of lastSaved.keys()) {
    if (!seen.has(id)) lastSaved.delete(id);
  }
};
