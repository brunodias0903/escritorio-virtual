import { areaAt, type MapDef, type Point } from './maps';
import { TILE } from './tile';

/** Id da zona de chamada onde o ponto está, ou null na "estrada" (sem chamada). */
export const callZoneId = (map: MapDef, point: Point): string | null =>
  areaAt(map, point)?.id ?? null;

/** Duas pessoas se ouvem e se veem só quando estão na mesma zona de chamada. */
export const canHear = (map: MapDef, a: Point, b: Point): boolean => {
  const zone = callZoneId(map, a);
  return zone !== null && zone === callZoneId(map, b);
};

/** Na estrada, conversa quem está a até este número de quadradinhos (também na diagonal). */
export const NEAR_TILES = 1;

/** Prefixo das conversas de estrada, para não confundir com o id de uma zona. */
export const NEAR_PREFIX = 'perto-';

/** Duas pessoas estão perto: no máximo NEAR_TILES quadradinhos em cada eixo. */
export const isNear = (a: Point, b: Point): boolean =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= NEAR_TILES * TILE;

type Someone = Point & { id: string };

/**
 * A chamada em que a pessoa deve estar:
 * - numa zona (mesa ou sala), a chamada da zona (mesmo sozinha);
 * - na estrada, a conversa com quem está perto. Vale em corrente: se A está
 *   perto de B e B perto de C, os três conversam juntos;
 * - sozinha na estrada, nenhuma (null).
 * O app e o servidor usam a mesma regra, com as posições de todos na sala.
 */
export const callKey = (
  map: MapDef,
  me: Someone,
  everyone: readonly Someone[],
): string | null => {
  const zone = callZoneId(map, me);
  if (zone) return zone;

  const road = everyone.filter(
    (p) => p.id !== me.id && callZoneId(map, p) === null,
  );
  const group = new Set([me.id]);
  const queue: Someone[] = [me];
  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const other of road) {
      if (!group.has(other.id) && isNear(current, other)) {
        group.add(other.id);
        queue.push(other);
      }
    }
  }
  if (group.size < 2) return null;
  // O nome da conversa é o menor id do grupo: todos chegam ao mesmo nome.
  return NEAR_PREFIX + [...group].sort()[0]!;
};

/** A chamada é uma conversa de estrada (e não uma zona)? */
export const isNearCall = (key: string | null): boolean =>
  key?.startsWith(NEAR_PREFIX) ?? false;

/** Nome da sala de chamada no LiveKit: uma por zona (ou conversa) de cada mapa. */
export const callRoomName = (mapId: string, zoneId: string): string =>
  `zone:${mapId}:${zoneId}`;
