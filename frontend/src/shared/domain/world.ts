// Regras de movimento compartilhadas entre o app e o servidor.
// O mundo é uma grade: cada passo leva a pessoa ao centro do quadradinho vizinho.

import { isBlocked, type MapDef, type Point } from './maps';
import { TILE } from './tile';

export { TILE };

/** Quanto tempo um passo leva, em milissegundos (5 passos por segundo). */
export const WALK_MS = 200;
/** Velocidade do desenho do passo, em pixels por segundo. */
export const WALK_SPEED = (TILE * 1000) / WALK_MS;

export type Direction = { dx: number; dy: number };

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Quadradinho (coluna, linha) que contém o ponto. */
export const tileOf = ({ x, y }: Point): { tx: number; ty: number } => ({
  tx: Math.floor(x / TILE),
  ty: Math.floor(y / TILE),
});

/** Centro do quadradinho (coluna, linha), onde as pessoas ficam paradas. */
export const tileCenter = (tx: number, ty: number): Point => ({
  x: tx * TILE + TILE / 2,
  y: ty * TILE + TILE / 2,
});

/** Leva um ponto qualquer ao centro do quadradinho dele. */
export const snapToTile = (point: Point): Point => {
  const { tx, ty } = tileOf(point);
  return tileCenter(tx, ty);
};

/** Está no centro de um quadradinho? */
export const isTileCenter = ({ x, y }: Point): boolean =>
  x % TILE === TILE / 2 && y % TILE === TILE / 2;

/** Reduz uma direção qualquer (setas, direcional) a um dos 4 sentidos, ou a nenhum. */
export const axisOf = ({ dx, dy }: Direction): Direction => {
  if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) return { dx: 0, dy: 0 };
  return Math.abs(dx) >= Math.abs(dy)
    ? { dx: Math.sign(dx), dy: 0 }
    : { dx: 0, dy: Math.sign(dy) };
};

/** `to` é exatamente o quadradinho vizinho (para cima, baixo, esquerda ou direita) de `from`? */
export const isOneStep = (from: Point, to: Point): boolean =>
  Math.abs(to.x - from.x) + Math.abs(to.y - from.y) === TILE &&
  (to.x === from.x || to.y === from.y);

/** Para onde um passo na direção pedida leva, ou null se algo bloqueia. */
export const stepTarget = (
  map: MapDef,
  from: Point,
  direction: Direction,
): Point | null => {
  const { dx, dy } = axisOf(direction);
  if (dx === 0 && dy === 0) return null;
  const target = { x: from.x + dx * TILE, y: from.y + dy * TILE };
  return isBlocked(map, target) ? null : target;
};
