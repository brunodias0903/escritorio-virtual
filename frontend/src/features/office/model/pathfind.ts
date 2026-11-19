import {
  TILE,
  areaAt,
  doorAt,
  isBlocked,
  tileCenter,
  tileOf,
  type MapDef,
  type MapId,
  type Point,
} from '@/shared/domain';

/** Para onde a pessoa quer ir sozinha: uma mesinha de uma sala. */
export type Destination = { map: MapId; deskId: string };

const key = ({ x, y }: Point) => `${x},${y}`;

/**
 * Caminho mais curto, em passos de um quadradinho, de `from` até um dos
 * `goals` (sem contar `from`). Não pisa em móveis, portas que não são o
 * destino, nem nas mesinhas dos outros (só na mesinha `allowZone`). Devolve
 * null se não há caminho.
 */
export const findPath = (
  map: MapDef,
  from: Point,
  goals: readonly Point[],
  { allowZone, avoid = [] }: { allowZone?: string; avoid?: Point[] } = {},
): Point[] | null => {
  const wanted = new Set(goals.map(key));
  const avoided = new Set(avoid.map(key));
  if (wanted.size === 0) return null;
  if (wanted.has(key(from))) return [];

  const passable = (p: Point) => {
    if (wanted.has(key(p))) return true;
    if (avoided.has(key(p)) || isBlocked(map, p) || doorAt(map, p)) {
      return false;
    }
    const zone = areaAt(map, p);
    return zone?.capacity === undefined || zone.id === allowZone;
  };

  const previous = new Map<string, Point | null>([[key(from), null]]);
  const queue: Point[] = [from];
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const next = { x: current.x + dx * TILE, y: current.y + dy * TILE };
      if (previous.has(key(next)) || !passable(next)) continue;
      previous.set(key(next), current);
      if (wanted.has(key(next))) {
        const path: Point[] = [];
        for (let p: Point | null = next; p && key(p) !== key(from);) {
          path.unshift(p);
          p = previous.get(key(p)) ?? null;
        }
        return path;
      }
      queue.push(next);
    }
  }
  return null;
};

/** Os quadradinhos de uma porta que leva a `to`. */
export const doorTiles = (map: MapDef, to: MapId): Point[] =>
  map.doors
    .filter((door) => door.to.map === to)
    .flatMap((door) => {
      const tiles: Point[] = [];
      const first = tileOf(door);
      for (let ty = first.ty; ty < first.ty + door.h / TILE; ty++) {
        for (let tx = first.tx; tx < first.tx + door.w / TILE; tx++) {
          tiles.push(tileCenter(tx, ty));
        }
      }
      return tiles;
    });

/**
 * Os lugares da mesinha, na ordem em que vale sentar: o do meio, depois os
 * lados. `front` é o quadradinho da estrada logo em frente, para quando a
 * mesa está cheia.
 */
export const deskSeats = (
  map: MapDef,
  deskId: string,
): { zone: string; name: string; seats: Point[]; front: Point } | null => {
  const zone = map.areas.find((a) => a.id === deskId && a.desk);
  if (!zone) return null;
  const y = zone.y + TILE / 2;
  const middle = zone.x + zone.w / 2;
  return {
    zone: zone.id,
    name: zone.name,
    seats: [middle, middle - TILE, middle + TILE].map((x) => ({ x, y })),
    front: { x: middle, y: y + TILE },
  };
};
