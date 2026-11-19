import {
  DEFAULT_MAP,
  DESK_CAPACITY,
  areaAt,
  callZoneId,
  deskKey,
  resolveMap,
  TILE,
  WALK_SPEED,
  axisOf,
  snapToTile,
  stepTarget,
  type DeskInfo,
  type Direction,
  type Emote,
  type MapDef,
  type MapId,
  type Player,
  type Point,
  type ServerMessage,
} from '@/shared/domain';

import { deskSeats, doorTiles, findPath, type Destination } from './pathfind';

export type Facing = 'down' | 'up' | 'left' | 'right';

/** Quanto tempo o emote fica sobre o avatar. */
export const EMOTE_DURATION_MS = 3000;

/** Jogador com a posição exibida (x, y) e a posição real recebida (tx, ty). */
export type RenderPlayer = Player & {
  tx: number;
  ty: number;
  facing: Facing;
  moving: boolean;
  emote: Emote | null;
};

export type WorldSnapshot = {
  meId: string | null;
  map: MapId;
  players: RenderPlayer[];
  /** Nome da mesinha cheia em que a pessoa tentou entrar, até se mexer de novo. */
  fullZone: string | null;
  /** Nome da mesinha bloqueada pelo dono em que a pessoa tentou entrar. */
  lockedZone: string | null;
};

const facingOf = (dx: number, dy: number, fallback: Facing): Facing => {
  if (dx === 0 && dy === 0) return fallback;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
};

/** Estado da sala no cliente. Mutável de propósito: roda a cada frame. */
export class OfficeWorld {
  meId: string | null = null;
  map: MapId = DEFAULT_MAP;
  /** A última mesinha cheia que barrou a pessoa. */
  fullZone: string | null = null;
  /** A última mesinha bloqueada pelo dono que barrou a pessoa. */
  lockedZone: string | null = null;
  private readonly players = new Map<string, RenderPlayer>();
  private readonly emoteUntil = new Map<string, number>();
  /** Mesas adotadas (posição personalizada e bloqueio). */
  private readonly deskInfos = new Map<string, DeskInfo>();
  /** Para onde a pessoa está indo sozinha (botão "ir à mesa"), e o caminho. */
  private destination: Destination | null = null;
  private route: Point[] = [];

  private currentMap(): MapDef {
    return resolveMap(this.map, this.deskInfos.values());
  }

  setDesks(desks: DeskInfo[]): void {
    this.deskInfos.clear();
    for (const desk of desks) this.upsertDesk(desk);
  }

  upsertDesk(desk: DeskInfo): void {
    const key = deskKey(desk.map, desk.deskId);
    if (desk.owner) {
      this.deskInfos.set(key, desk);
    } else {
      this.deskInfos.delete(key);
    }
  }

  private isLockedFor(
    map: MapId,
    zoneId: string,
    email: string | undefined,
  ): boolean {
    const desk = this.deskInfos.get(deskKey(map, zoneId));
    return Boolean(
      desk?.owner && desk.config.locked && desk.owner.email !== email,
    );
  }

  apply(message: ServerMessage, nowMs: number = Date.now()): void {
    switch (message.type) {
      case 'init':
        this.players.clear();
        this.emoteUntil.clear();
        this.meId = message.id;
        this.map = message.map;
        for (const player of message.players) this.add(player);
        break;

      case 'map': {
        // Mudança de sala: fica só a minha pessoa (na nova posição) e quem já está lá.
        const me = this.me();
        this.players.clear();
        this.emoteUntil.clear();
        this.map = message.map;
        for (const player of message.players) this.add(player);
        if (me) {
          this.add({ ...me, map: message.map, x: message.x, y: message.y });
        }
        // Indo sozinha para uma mesa de outra sala: segue o caminho daqui.
        if (this.destination) this.plan();
        break;
      }

      case 'joined':
        if (message.player.map === this.map) this.add(message.player);
        break;

      case 'moved': {
        const player = this.players.get(message.id);
        if (player && message.id !== this.meId) {
          player.facing = facingOf(
            message.x - player.tx,
            message.y - player.ty,
            player.facing,
          );
          player.tx = message.x;
          player.ty = message.y;
        }
        break;
      }

      case 'left':
        this.players.delete(message.id);
        this.emoteUntil.delete(message.id);
        break;

      case 'zoneFull':
        this.fullZone = message.zone;
        break;

      case 'zoneLocked':
        this.lockedZone = message.zone;
        break;

      case 'correct': {
        const me = this.me();
        if (me) this.place(me, { x: message.x, y: message.y });
        if (this.destination) this.plan();
        break;
      }

      case 'status': {
        const player = this.players.get(message.id);
        if (player) player.status = message.status;
        break;
      }

      case 'appearance': {
        const player = this.players.get(message.id);
        if (player) player.appearance = message.appearance;
        break;
      }

      case 'emote': {
        const player = this.players.get(message.id);
        if (player) {
          player.emote = message.emote;
          this.emoteUntil.set(message.id, nowMs + EMOTE_DURATION_MS);
        }
        break;
      }

      default:
        break;
    }
  }

  me(): RenderPlayer | undefined {
    return this.meId ? this.players.get(this.meId) : undefined;
  }

  /**
   * Anda o meu avatar, um quadradinho por vez. Enquanto um passo está em
   * andamento, só continua o desenho; ao chegar, se a direção segue pedida,
   * começa o próximo. Devolve o quadradinho de destino quando um passo começa
   * (para avisar o servidor), ou null.
   */
  moveMe(direction: Direction, dtSeconds: number): Point | null {
    const me = this.me();
    if (!me) return null;

    const left = this.walk(me, dtSeconds);
    if (me.x !== me.tx || me.y !== me.ty) return null;

    let axis = axisOf(direction);
    if (axis.dx !== 0 || axis.dy !== 0) {
      // A pessoa pegou o controle: para de ir sozinha.
      this.stopAutoWalk();
    } else if (this.destination) {
      axis = this.autoAxis(me);
    }
    if (axis.dx === 0 && axis.dy === 0) {
      me.moving = left < dtSeconds;
      return null;
    }
    me.facing = facingOf(axis.dx, axis.dy, me.facing);

    const map = this.currentMap();
    const next = stepTarget(map, me, axis);
    if (!next || this.seatBlocked(map, me, next)) {
      me.moving = false;
      // Indo sozinha e algo entrou na frente: procura outro caminho.
      if (this.destination) this.plan();
      return null;
    }

    if (!this.destination) {
      this.fullZone = null;
      this.lockedZone = null;
    }
    me.tx = next.x;
    me.ty = next.y;
    this.walk(me, left);
    return next;
  }

  /** Vai andando sozinha até a mesinha (mesmo em outra sala, passando pela porta). */
  goTo(destination: Destination): void {
    this.destination = destination;
    this.plan();
  }

  stopAutoWalk(): void {
    this.destination = null;
    this.route = [];
  }

  /** Está indo sozinha para algum lugar? */
  get autoWalking(): boolean {
    return this.destination !== null;
  }

  /** Próxima direção do caminho; chegou ao fim, para. */
  private autoAxis(me: RenderPlayer): Direction {
    while (
      this.route[0] &&
      this.route[0].x === me.x &&
      this.route[0].y === me.y
    ) {
      this.route.shift();
    }
    const next = this.route[0];
    if (!next) {
      // Chegou à porta: espera o servidor trocar de sala e segue de lá.
      if (this.destination && this.destination.map !== this.map) {
        return { dx: 0, dy: 0 };
      }
      this.stopAutoWalk();
      return { dx: 0, dy: 0 };
    }
    return { dx: Math.sign(next.x - me.x), dy: Math.sign(next.y - me.y) };
  }

  /**
   * Monta o caminho até o destino com o que se vê agora: na outra sala, até
   * a porta; na sala da mesa, até um lugar livre (o do meio primeiro) ou,
   * com a mesa cheia, até a frente dela.
   */
  private plan(): void {
    const me = this.me();
    const destination = this.destination;
    if (!me || !destination) return;
    const map = this.currentMap();

    if (destination.map !== this.map) {
      const route = findPath(map, me, doorTiles(map, destination.map));
      if (route) this.route = route;
      else this.stopAutoWalk();
      return;
    }

    const desk = deskSeats(map, destination.deskId);
    if (!desk) return this.stopAutoWalk();
    const others = [...this.players.values()].filter((p) => p.id !== me.id);
    const taken = (p: Point) =>
      others.some((o) => o.tx === p.x && o.ty === p.y);
    const inside = callZoneId(map, me) === desk.zone;
    const locked = this.isLockedFor(this.map, desk.zone, me.email);
    const full = !inside && this.occupants(desk.zone, me.id) >= DESK_CAPACITY;
    const seats =
      locked || full ? [] : desk.seats.filter((seat) => !taken(seat));
    if (locked) this.lockedZone = desk.name;
    else if (full) this.fullZone = desk.name;

    // Tenta os lugares na ordem (meio primeiro); sem lugar, a frente da mesa.
    const options = { allowZone: desk.zone, avoid: desk.seats.filter(taken) };
    const targets = seats.length > 0 ? seats : [desk.front];
    const route = targets
      .map((target) => findPath(map, me, [target], options))
      .find((path) => path !== null);
    if (route) this.route = route;
    else this.stopAutoWalk();
  }

  /** Mesinha: o lugar tem de estar livre, a mesinha não pode estar bloqueada nem cheia (como no servidor). */
  private seatBlocked(map: MapDef, me: RenderPlayer, next: Point): boolean {
    const zone = areaAt(map, next);
    if (zone?.capacity === undefined) return false;
    if (this.isLockedFor(this.map, zone.id, me.email)) {
      this.lockedZone = zone.name;
      return true;
    }
    const taken = [...this.players.values()].some(
      (p) => p.id !== me.id && p.tx === next.x && p.ty === next.y,
    );
    const full =
      zone.id !== callZoneId(map, me) &&
      this.occupants(zone.id, me.id) >= zone.capacity;
    if (full) this.fullZone = zone.name;
    return taken || full;
  }

  /**
   * Leva a posição desenhada até o destino, em velocidade constante. Devolve
   * quanto tempo da fatia sobrou se a pessoa chegou antes dela acabar.
   * `catchUp` acelera quando o destino ficou longe (rede lenta).
   */
  private walk(
    player: RenderPlayer,
    dtSeconds: number,
    catchUp = false,
  ): number {
    const dx = player.tx - player.x;
    const dy = player.ty - player.y;
    const distance = Math.hypot(dx, dy);
    player.moving = distance > 0;
    if (distance === 0) return dtSeconds;

    const speed = WALK_SPEED * (catchUp ? Math.max(1, distance / TILE) : 1);
    const reach = speed * dtSeconds;
    if (reach >= distance) {
      player.x = player.tx;
      player.y = player.ty;
      return (reach - distance) / speed;
    }
    player.x += (dx / distance) * reach;
    player.y += (dy / distance) * reach;
    return 0;
  }
  /** Quantas pessoas estão numa zona (pela posição real, sem a animação). */
  occupants(zoneId: string, exceptId?: string): number {
    const map = this.currentMap();
    let count = 0;
    for (const player of this.players.values()) {
      if (player.id === exceptId) continue;
      if (callZoneId(map, { x: player.tx, y: player.ty }) === zoneId) count++;
    }
    return count;
  }

  /** Anda os outros jogadores até o quadradinho recebido e apaga emotes vencidos. */
  tick(dtSeconds: number, nowMs: number = Date.now()): void {
    for (const player of this.players.values()) {
      if (player.id !== this.meId) this.walk(player, dtSeconds, true);
      const until = this.emoteUntil.get(player.id);
      if (player.emote && (until === undefined || until <= nowMs)) {
        player.emote = null;
        this.emoteUntil.delete(player.id);
      }
    }
  }
  /** Cópia imutável para a tela. */
  snapshot(): WorldSnapshot {
    return {
      meId: this.meId,
      map: this.map,
      fullZone: this.fullZone,
      lockedZone: this.lockedZone,
      players: [...this.players.values()].map((p) => ({ ...p })),
    };
  }

  private add(player: Player): void {
    this.players.set(player.id, {
      ...player,
      tx: player.x,
      ty: player.y,
      facing: 'down',
      moving: false,
      emote: null,
    });
  }

  private place(player: RenderPlayer, point: Point): void {
    const { x, y } = snapToTile(point);
    player.x = x;
    player.y = y;
    player.tx = x;
    player.ty = y;
    player.moving = false;
  }
}
