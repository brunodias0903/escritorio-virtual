import {
  DEFAULT_MAP,
  SHIRT_COLORS,
  areaAt,
  callZoneId,
  deskKey,
  doorAt,
  getMap,
  isBlocked,
  isOneStep,
  isTileCenter,
  MapIdSchema,
  resolveMap,
  sanitizeName,
  type Appearance,
  type DeskInfo,
  type Emote,
  type MapDef,
  type MapId,
  type Player,
  type ServerMessage,
  type Status,
} from '../../shared/domain/index.js';

/** Um lugar no escritório: a sala e o quadradinho. */
export type Spot = { map: MapId; x: number; y: number };

/**
 * Para quem entregar a mensagem. `to` escolhe entre quem agiu, os outros ou
 * todos; `map` limita a quem está nessa sala; `emails` limita a essas pessoas.
 */
export type Outgoing = {
  to: 'self' | 'others' | 'all';
  message: ServerMessage;
  map?: MapId;
  emails?: string[];
  serverId?: string;
};

type Options = { now?: () => number };

/** Intervalo mínimo entre dois emotes da mesma pessoa. */
export const EMOTE_MIN_INTERVAL_MS = 600;

const shirtColor = (appearance: Appearance): number =>
  parseInt(SHIRT_COLORS[appearance.shirt].slice(1), 16);

/**
 * Quem está nas salas, sem rede. Guarda as pessoas ligadas a ESTA instância do
 * servidor e um espelho das ligadas às outras. Cada método devolve as
 * mensagens a enviar, o que mantém a regra testável sem sockets.
 */
export class OfficeService {
  /** Pessoas ligadas a esta instância. */
  readonly players = new Map<string, Player>();
  /** Pessoas ligadas às outras instâncias (espelho). */
  private readonly remote = new Map<string, Player>();
  private readonly emails = new Map<string, string>();
  private readonly serverIds = new Map<string, string>();
  private readonly lastEmoteAt = new Map<string, number>();
  /** Estado atual das mesas adotadas (posição customizada e bloqueio). */
  private readonly deskInfos = new Map<string, Map<string, DeskInfo>>();
  private readonly now: () => number;

  constructor({ now = Date.now }: Options = {}) {
    this.now = now;
  }

  private desksFor(serverId = 'default'): Map<string, DeskInfo> {
    let map = this.deskInfos.get(serverId);
    if (!map) {
      map = new Map();
      this.deskInfos.set(serverId, map);
    }
    return map;
  }

  /** Mapa com as posições atualizadas das mesas movidas pelos donos. */
  mapOf(mapId: MapId, serverId = 'default'): MapDef {
    return resolveMap(mapId, this.desksFor(serverId).values());
  }

  /** Atualiza o estado (posição e bloqueio) de uma mesa. */
  setDeskLock(desk: DeskInfo, serverId = 'default'): void {
    const map = this.desksFor(serverId);
    const key = deskKey(desk.map, desk.deskId);
    if (desk.owner) {
      map.set(key, desk);
    } else {
      map.delete(key);
    }
  }

  /** Carrega o estado de todas as mesas ao iniciar o servidor. */
  syncDesks(desks: DeskInfo[], serverId = 'default'): void {
    this.desksFor(serverId).clear();
    for (const desk of desks) this.setDeskLock(desk, serverId);
  }

  private isLockedFor(
    map: MapId,
    zoneId: string,
    email: string | undefined,
    serverId = 'default',
  ): boolean {
    const desk = this.desksFor(serverId).get(deskKey(map, zoneId));
    return Boolean(
      desk?.owner && desk.config.locked && desk.owner.email !== email,
    );
  }

  emailOf(id: string): string | undefined {
    return this.emails.get(id);
  }

  serverIdOf(id: string): string {
    return this.serverIds.get(id) ?? 'default';
  }

  /** Quem está na sala, de qualquer instância, no servidor informado. */
  playersIn(map: MapId, exceptId?: string, serverId = 'default'): Player[] {
    const locals = [...this.players.values()].filter(
      (p) => this.serverIdOf(p.id) === serverId,
    );
    const remotes = serverId === 'default' ? [...this.remote.values()] : [];
    return [...remotes, ...locals].filter(
      (p) => p.map === map && p.id !== exceptId,
    );
  }

  /**
   * Entra no escritório. `start` é onde a pessoa estava da última vez; vale se
   * o lugar ainda existe e está livre. Senão, ela começa na entrada.
   */
  join(
    id: string,
    rawName: string,
    email: string,
    appearance: Appearance,
    start?: Spot | null,
    serverId = 'default',
  ): Outgoing[] {
    if (this.players.has(id)) return [];
    this.serverIds.set(id, serverId);
    const spot =
      start && this.canStartAt(id, start, email)
        ? start
        : { map: DEFAULT_MAP, ...getMap(DEFAULT_MAP).spawn };
    const player: Player = {
      id,
      name: sanitizeName(rawName),
      color: shirtColor(appearance),
      x: spot.x,
      y: spot.y,
      map: spot.map,
      status: 'available',
      appearance,
      email,
    };
    this.players.set(id, player);
    this.emails.set(id, email);
    return [
      {
        to: 'self',
        serverId,
        message: {
          type: 'init',
          id,
          map: player.map,
          players: this.playersIn(player.map, undefined, serverId),
        },
      },
      {
        to: 'others',
        serverId,
        message: { type: 'joined', player },
        map: player.map,
      },
    ];
  }

  /**
   * Um passo: o destino tem de ser o quadradinho vizinho, livre. Nas mesinhas
   * (zonas com lugar contado), um quadradinho já ocupado também barra.
   */
  move(id: string, x: number, y: number): Outgoing[] {
    const player = this.players.get(id);
    if (!player) return [];
    const serverId = this.serverIdOf(id);
    const map = this.mapOf(player.map, serverId);
    const target = { x, y };
    const correct: Outgoing = {
      to: 'self',
      message: { type: 'correct', x: player.x, y: player.y },
    };
    if (
      !isTileCenter(target) ||
      !isOneStep(player, target) ||
      isBlocked(map, target)
    ) {
      return [correct];
    }

    const door = doorAt(map, target);
    if (door) return this.changeMap(player, door.to);

    // Mesinha: cada quadradinho é um lugar, e só cabe uma pessoa nele.
    const zone = areaAt(map, target);
    if (zone?.capacity !== undefined) {
      if (this.isLockedFor(player.map, zone.id, player.email, serverId)) {
        return [
          correct,
          { to: 'self', message: { type: 'zoneLocked', zone: zone.name } },
        ];
      }
      const taken = this.playersIn(player.map, id, serverId).some(
        (p) => p.x === target.x && p.y === target.y,
      );
      const entering = zone.id !== callZoneId(map, player);
      const full =
        entering &&
        this.occupants(player.map, zone.id, id, serverId) >= zone.capacity;
      if (taken || full) {
        return [
          correct,
          ...(full
            ? [
                {
                  to: 'self',
                  message: { type: 'zoneFull', zone: zone.name },
                } satisfies Outgoing,
              ]
            : []),
        ];
      }
    }

    player.x = target.x;
    player.y = target.y;
    return [
      {
        to: 'others',
        message: { type: 'moved', id, x: player.x, y: player.y },
        map: player.map,
      },
    ];
  }

  /** O lugar de partida ainda vale: quadradinho livre, fora de portas, com vaga na mesinha. */
  private canStartAt(id: string, spot: Spot, email: string): boolean {
    if (!MapIdSchema.safeParse(spot.map).success) return false;
    const serverId = this.serverIdOf(id);
    const map = this.mapOf(spot.map, serverId);
    if (!isTileCenter(spot) || isBlocked(map, spot) || doorAt(map, spot)) {
      return false;
    }
    const zone = areaAt(map, spot);
    if (zone?.capacity === undefined) return true;
    if (this.isLockedFor(spot.map, zone.id, email, serverId)) return false;
    const others = this.playersIn(spot.map, id, serverId);
    return (
      !others.some((p) => p.x === spot.x && p.y === spot.y) &&
      this.occupants(spot.map, zone.id, id, serverId) < zone.capacity
    );
  }

  /** Todo mundo online, de qualquer sala e instância (ou filtrado por servidor). */
  everyone(serverId?: string): Player[] {
    if (!serverId) {
      return [...this.remote.values(), ...this.players.values()];
    }
    const locals = [...this.players.values()].filter(
      (p) => this.serverIdOf(p.id) === serverId,
    );
    const remotes = serverId === 'default' ? [...this.remote.values()] : [];
    return [...remotes, ...locals];
  }

  /** Quantas pessoas (de qualquer instância) estão agora numa zona. */
  occupants(
    mapId: MapId,
    zoneId: string,
    exceptId?: string,
    serverId = 'default',
  ): number {
    const map = this.mapOf(mapId, serverId);
    return this.playersIn(mapId, exceptId, serverId).filter(
      (p) => callZoneId(map, p) === zoneId,
    ).length;
  }

  setStatus(id: string, status: Status): Outgoing[] {
    const player = this.players.get(id);
    if (!player) return [];
    player.status = status;
    return [
      { to: 'all', message: { type: 'status', id, status }, map: player.map },
    ];
  }

  emote(id: string, emote: Emote): Outgoing[] {
    const player = this.players.get(id);
    if (!player) return [];
    const at = this.now();
    const last = this.lastEmoteAt.get(id);
    if (last !== undefined && at - last < EMOTE_MIN_INTERVAL_MS) return [];
    this.lastEmoteAt.set(id, at);
    return [
      { to: 'all', message: { type: 'emote', id, emote }, map: player.map },
    ];
  }

  setAppearance(id: string, appearance: Appearance): Outgoing[] {
    const player = this.players.get(id);
    if (!player) return [];
    player.appearance = appearance;
    player.color = shirtColor(appearance);
    return [
      {
        to: 'all',
        message: { type: 'appearance', id, appearance },
        map: player.map,
      },
    ];
  }

  leave(id: string): Outgoing[] {
    const player = this.players.get(id);
    const serverId = this.serverIdOf(id);
    this.emails.delete(id);
    this.serverIds.delete(id);
    this.lastEmoteAt.delete(id);
    if (!player) return [];
    this.players.delete(id);
    return [
      { to: 'all', serverId, message: { type: 'left', id }, map: player.map },
    ];
  }

  // --- Espelho das outras instâncias ------------------------------------------------

  /** Aplica um evento vindo de outra instância ao espelho. */
  applyRemote(message: ServerMessage): void {
    switch (message.type) {
      case 'joined':
        this.remote.set(message.player.id, message.player);
        break;
      case 'left':
        this.remote.delete(message.id);
        break;
      case 'moved': {
        const player = this.remote.get(message.id);
        if (player)
          this.remote.set(player.id, { ...player, x: message.x, y: message.y });
        break;
      }
      case 'status': {
        const player = this.remote.get(message.id);
        if (player)
          this.remote.set(player.id, { ...player, status: message.status });
        break;
      }
      case 'appearance': {
        const player = this.remote.get(message.id);
        if (player) {
          this.remote.set(player.id, {
            ...player,
            appearance: message.appearance,
            color: shirtColor(message.appearance),
          });
        }
        break;
      }
      case 'desk':
        this.setDeskLock(message.desk);
        break;
      default:
        break;
    }
  }

  /**
   * Troca o espelho pela lista do Valkey: ela diz QUEM está online (corrige
   * fantasmas). A posição de quem já está no espelho fica a dele, porque os
   * avisos de movimento chegam antes da gravação no Valkey.
   */
  replaceRemote(players: Player[]): void {
    const known = new Map(this.remote);
    this.remote.clear();
    for (const player of players) {
      if (this.players.has(player.id)) continue;
      const mirror = known.get(player.id);
      this.remote.set(
        player.id,
        mirror && mirror.map === player.map ? mirror : player,
      );
    }
  }

  private changeMap(
    player: Player,
    to: { map: MapId; x: number; y: number },
  ): Outgoing[] {
    const from = player.map;
    player.map = to.map;
    player.x = to.x;
    player.y = to.y;
    return [
      { to: 'others', message: { type: 'left', id: player.id }, map: from },
      {
        to: 'self',
        message: {
          type: 'map',
          map: to.map,
          x: to.x,
          y: to.y,
          players: this.playersIn(to.map, player.id),
        },
      },
      { to: 'others', message: { type: 'joined', player }, map: to.map },
    ];
  }
}
