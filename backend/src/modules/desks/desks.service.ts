import {
  DESK_HEIGHT,
  DESK_WIDTH,
  FREE_DESK_CONFIG,
  TILE,
  callZoneId,
  canPlaceDesk,
  defaultDeskConfig,
  deskOf,
  getMap,
  resolveMap,
  type DeskConfig,
  type DeskInfo,
  type MapId,
  type Point,
} from '../../shared/domain/index.js';
import { fail, ok, type Result } from '../../shared/result.js';
import type { DeskRecord, DeskRepository } from './desks.repository.js';

const toInfo = (record: DeskRecord): DeskInfo => ({
  map: record.map as MapId,
  deskId: record.deskId,
  owner: {
    email: record.ownerEmail,
    name: record.ownerName,
    role: record.ownerRole,
  },
  config: record.config,
});

/** Mesinha sem dono: o que todos recebem quando alguém devolve a sua. */
export const freeDesk = (map: MapId, deskId: string): DeskInfo => ({
  map,
  deskId,
  owner: null,
  config: FREE_DESK_CONFIG,
});

type Person = { email: string; name: string; role?: string };
type Place = { map: MapId; x: number; y: number };

/**
 * Quem é dono de cada mesinha. Qualquer pessoa adota uma mesa livre (uma só
 * por pessoa), e só o dono muda a decoração. Administradores podem devolver
 * a mesa de qualquer um.
 */
export class DeskService {
  private readonly desks: DeskRepository;
  private readonly now: () => number;

  constructor(desks: DeskRepository, now: () => number = Date.now) {
    this.desks = desks;
    this.now = now;
  }

  /** Todas as mesinhas que têm dono no servidor. As que não aparecem estão livres. */
  async list(serverId = 'default'): Promise<DeskInfo[]> {
    return (await this.desks.all(serverId)).map(toInfo);
  }

  /** Adota a mesinha em que a pessoa está parada. */
  async adopt(
    who: Person,
    where: Place,
    deskId: string,
  ): Promise<Result<DeskInfo>> {
    const map = resolveMap(where.map, await this.list());
    if (!deskOf(map, deskId)) return fail('invalid_desk');
    if (callZoneId(map, where) !== deskId) return fail('not_in_desk');
    if (await this.desks.get(where.map, deskId)) return fail('desk_taken');
    if (await this.desks.byOwner(who.email)) return fail('desk_limit');

    const record: DeskRecord = {
      map: where.map,
      deskId,
      ownerEmail: who.email,
      ownerName: who.name,
      ownerRole: who.role ?? '',
      config: defaultDeskConfig(who.name),
      updatedAt: this.now(),
    };
    return (await this.desks.adopt(record))
      ? ok(toInfo(record))
      : fail('desk_taken');
  }

  /**
   * O nome ou o cargo da pessoa mudou (ela editou a conta): a mesa dela passa
   * a mostrar os dados novos. Devolve a mesa atualizada, ou null se nada mudou.
   */
  async syncOwner(who: Person): Promise<DeskInfo | null> {
    const record = await this.desks.byOwner(who.email);
    const role = who.role ?? '';
    if (!record || (record.ownerName === who.name && record.ownerRole === role))
      return null;
    await this.desks.setOwner(who.email, who.name, role);
    return toInfo({ ...record, ownerName: who.name, ownerRole: role });
  }

  async release(
    who: { email: string; admin: boolean },
    map: MapId,
    deskId: string,
  ): Promise<Result<DeskInfo>> {
    const record = await this.desks.get(map, deskId);
    if (!record) return fail('invalid_desk');
    if (record.ownerEmail !== who.email && !who.admin) return fail('not_owner');
    await this.desks.release(map, deskId);
    return ok(freeDesk(map, deskId));
  }

  /**
   * Remove automaticamente a mesa adotada por um usuário (ex.: ao banir,
   * kickar, restringir ou excluir a conta). Devolve a mesa liberada ou null.
   */
  async releaseByOwner(email: string): Promise<DeskInfo | null> {
    const record = await this.desks.byOwner(email);
    if (!record) return null;
    await this.desks.release(record.map, record.deskId);
    return freeDesk(record.map as MapId, record.deskId);
  }

  async configure(
    email: string,
    map: MapId,
    deskId: string,
    config: DeskConfig,
  ): Promise<Result<DeskInfo>> {
    const record = await this.desks.get(map, deskId);
    if (!record) return fail('invalid_desk');
    if (record.ownerEmail !== email) return fail('not_owner');
    // Posição da mesa só muda pelo método `move` (que valida colisão e áreas protegidas).
    const safeConfig: DeskConfig = {
      ...config,
      position: record.config.position ?? null,
    };
    const updated = { ...record, config: safeConfig, updatedAt: this.now() };
    await this.desks.setConfig(map, deskId, safeConfig, updated.updatedAt);
    return ok(toInfo(updated));
  }

  /** Move a própria mesinha para outra posição livre da sala. */
  async move(
    email: string,
    map: MapId,
    deskId: string,
    col: number,
    row: number,
    occupied: readonly Point[] = [],
  ): Promise<Result<DeskInfo>> {
    const record = await this.desks.get(map, deskId);
    if (!record) return fail('invalid_desk');
    if (record.ownerEmail !== email) return fail('not_owner');
    const all = await this.list();
    if (!canPlaceDesk(getMap(map), deskId, col, row, all)) {
      return fail('invalid_desk_position');
    }
    const topX = col * TILE;
    const topY = row * TILE;
    const hitsPlayer = occupied.some(
      (p) =>
        p.x >= topX &&
        p.x < topX + DESK_WIDTH &&
        p.y >= topY &&
        p.y < topY + DESK_HEIGHT,
    );
    if (hitsPlayer) return fail('invalid_desk_position');

    const config: DeskConfig = {
      ...record.config,
      position: { col, row },
    };
    const updated = { ...record, config, updatedAt: this.now() };
    await this.desks.setConfig(map, deskId, config, updated.updatedAt);
    return ok(toInfo(updated));
  }
}
