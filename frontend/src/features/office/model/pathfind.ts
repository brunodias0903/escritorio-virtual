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

/** Para onde a pessoa quer ir sozinha: uma mesinha, uma sala ou um ponto clicado no chão. */
export type Destination =
  | { map: MapId; deskId: string }
  | { map: MapId; areaId: string }
  | { map: MapId; point: Point };

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

/** Quadradinhos livres logo em frente à copa/cafeteria (`pantry` / `fridge`) do mapa. */
export const pantryTiles = (map: MapDef): Point[] => {
  const pantries = map.solids.filter(
    (s) => s.kind === 'pantry' || s.kind === 'fridge',
  );
  const candidates: Point[] = [];
  for (const s of pantries) {
    const first = tileOf(s);
    const cols = s.w / TILE;
    // Prioriza os quadradinhos logo acima ou logo abaixo da bancada da copa
    for (const dy of [-1, 1]) {
      const ty = first.ty + (dy > 0 ? s.h / TILE : -1);
      for (let tx = first.tx; tx < first.tx + cols; tx++) {
        const p = tileCenter(tx, ty);
        if (!isBlocked(map, p) && !doorAt(map, p)) {
          candidates.push(p);
        }
      }
    }
  }
  return candidates;
};

/** Verifica se o jogador está parado em um dos quadradinhos em frente à copa/cafeteria. */
export const isInPantryArea = (map: MapDef, point: Point): boolean =>
  pantryTiles(map).some((p) => p.x === point.x && p.y === point.y);

/** Quadradinhos livres dentro de uma sala (ex.: sala de reunião), dos mais centrais para as bordas. */
export const areaTiles = (map: MapDef, areaId: string): Point[] => {
  const area = map.areas.find((a) => a.id === areaId && !a.desk);
  if (!area) return [];
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  const tiles: Point[] = [];
  const first = tileOf(area);
  for (let ty = first.ty; ty < first.ty + area.h / TILE; ty++) {
    for (let tx = first.tx; tx < first.tx + area.w / TILE; tx++) {
      const p = tileCenter(tx, ty);
      if (!isBlocked(map, p)) tiles.push(p);
    }
  }
  return tiles.sort(
    (a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy),
  );
};
