import { describe, expect, it } from 'vitest';
import {
  DESK_CAPACITY,
  MAPS,
  MAP_IDS,
  areaAt,
  canPlaceDesk,
  deskOf,
  doorAt,
  getMap,
  isBlocked,
  resolveMap,
  type MapDef,
} from './maps.js';
import { isTileCenter } from './world.js';

describe.each(MAP_IDS)('mapa %s', (id) => {
  const map: MapDef = MAPS[id];

  it('o ponto de entrada é livre e fora de portas', () => {
    expect(isTileCenter(map.spawn)).toBe(true);
    expect(isBlocked(map, map.spawn)).toBe(false);
    expect(doorAt(map, map.spawn)).toBeUndefined();
  });

  it('todas as portas levam a um ponto livre, fora de portas', () => {
    for (const door of map.doors) {
      const target = getMap(door.to.map);
      expect(isTileCenter(door.to)).toBe(true);
      expect(isBlocked(target, door.to)).toBe(false);
      expect(doorAt(target, door.to)).toBeUndefined();
    }
  });

  it('tem portas de ida e volta entre os andares', () => {
    for (const door of map.doors) {
      const back = getMap(door.to.map).doors.map((d) => d.to.map);
      expect(back).toContain(map.id);
    }
  });

  it('nenhum objeto sai do mapa', () => {
    for (const solid of map.solids) {
      expect(solid.x).toBeGreaterThanOrEqual(0);
      expect(solid.y).toBeGreaterThanOrEqual(0);
      expect(solid.x + solid.w).toBeLessThanOrEqual(map.width);
      expect(solid.y + solid.h).toBeLessThanOrEqual(map.height);
    }
  });
});

describe('consultas', () => {
  const lobby = getMap('lobby');

  it('acha porta e área pelo ponto', () => {
    const door = lobby.doors[0]!;
    expect(doorAt(lobby, { x: door.x + 5, y: door.y + 5 })?.label).toBe(
      'Andar 2',
    );
    expect(areaAt(lobby, { x: 100, y: 100 })?.id).toBe('sala-reuniao');
    expect(areaAt(lobby, { x: 600, y: 600 })).toBeUndefined();
  });

  it('a sala de reunião tem entrada livre pelo vão da parede', () => {
    // Vão entre as paredes de baixo: quadradinhos 5 a 7 (x de 160 a 256).
    expect(isBlocked(lobby, { x: 208, y: 272 })).toBe(false);
    expect(isBlocked(lobby, { x: 100, y: 272 })).toBe(true);
  });
});

describe.each(MAP_IDS)('zonas de chamada do mapa %s', (id) => {
  const map: MapDef = MAPS[id];

  it('têm ids únicos e ficam dentro do mapa', () => {
    const ids = map.areas.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const area of map.areas) {
      expect(area.x).toBeGreaterThanOrEqual(0);
      expect(area.y).toBeGreaterThanOrEqual(0);
      expect(area.x + area.w).toBeLessThanOrEqual(map.width);
      expect(area.y + area.h).toBeLessThanOrEqual(map.height);
    }
  });

  it('o ponto de entrada e as chegadas das portas ficam na estrada', () => {
    expect(areaAt(map, map.spawn)).toBeUndefined();
    for (const other of MAP_IDS.map((m) => MAPS[m])) {
      for (const door of other.doors) {
        if (door.to.map === map.id)
          expect(areaAt(map, door.to)).toBeUndefined();
      }
    }
  });

  it('as portas ficam na estrada', () => {
    for (const door of map.doors) {
      expect(
        areaAt(map, { x: door.x + door.w / 2, y: door.y + door.h / 2 }),
      ).toBeUndefined();
    }
  });

  it('cada mesinha tem a sua zona, que a cobre inteira, com lugar para 3', () => {
    expect(map.desks.length).toBeGreaterThan(0);
    for (const desk of map.desks) {
      const zone = map.areas.find((a) => a.id === desk.id);
      expect(zone, `zona da ${desk.name}`).toBeDefined();
      expect(zone!.desk).toBe(true);
      expect(zone!.capacity).toBe(DESK_CAPACITY);
      expect(zone!.x).toBe(desk.x);
      expect(zone!.w).toBe(3 * 32);
      expect(zone!.h).toBe(32);
      expect(zone!.y).toBe(desk.y + desk.h);
      expect(
        map.solids.some(
          (s) => s.kind === 'desk' && s.x === desk.x && s.y === desk.y,
        ),
      ).toBe(true);
      expect(deskOf(map, desk.id)).toBe(desk);
    }
  });

  it('as zonas não se sobrepõem, então cada ponto pertence a uma zona só', () => {
    for (const a of map.areas) {
      for (const b of map.areas) {
        if (a === b) continue;
        const apart =
          a.x + a.w <= b.x ||
          b.x + b.w <= a.x ||
          a.y + a.h <= b.y ||
          b.y + b.h <= a.y;
        expect(apart, `${a.id} com ${b.id}`).toBe(true);
      }
    }
  });

  it('há espaço livre ao redor de cada mesinha para sentar', () => {
    for (const desk of map.desks) {
      const seats = [16, 48, 80].map((dx) => ({
        x: desk.x + dx,
        y: desk.y + desk.h + 16,
      }));
      for (const seat of seats) {
        expect(
          isBlocked(map, seat),
          `${desk.name} em ${seat.x},${seat.y}`,
        ).toBe(false);
        expect(areaAt(map, seat)?.id).toBe(desk.id);
      }
    }
  });

  it('as mesinhas não ficam dentro de salas fechadas', () => {
    for (const desk of map.desks) {
      expect(
        areaAt(map, { x: desk.x + desk.w / 2, y: desk.y + desk.h + 16 })
          ?.private,
      ).toBe(false);
    }
  });
});

describe('mover mesinhas (resolveMap e canPlaceDesk)', () => {
  it('permite mesas coladas lado a lado e bloqueia áreas protegidas', () => {
    const lobby = getMap('lobby');
    // Colada à esquerda da mesa-2 (col 18, row 4) -> col 15, row 4 encosta nela.
    expect(canPlaceDesk(lobby, 'mesa-1', 15, 4)).toBe(true);
    // Área aberta abaixo da sala de reunião.
    expect(canPlaceDesk(lobby, 'mesa-1', 2, 11)).toBe(true);
    // Sobrepõe mesa-2.
    expect(canPlaceDesk(lobby, 'mesa-1', 16, 4)).toBe(false);
    // Dentro da sala de reunião.
    expect(canPlaceDesk(lobby, 'mesa-1', 2, 3)).toBe(false);
    // Bloqueando a entrada da sala de reunião.
    expect(canPlaceDesk(lobby, 'mesa-1', 5, 8)).toBe(false);
    // Bloqueando a porta do Andar 2.
    expect(canPlaceDesk(lobby, 'mesa-1', 26, 8)).toBe(false);
    // Bloqueando o ponto de chegada (spawn).
    expect(canPlaceDesk(lobby, 'mesa-1', 14, 16)).toBe(false);
    // Fora dos limites ou mesa inexistente.
    expect(canPlaceDesk(lobby, 'mesa-1', 0, 1)).toBe(false);
    expect(canPlaceDesk(lobby, 'mesa-99', 2, 11)).toBe(false);
  });

  it('resolveMap aplica a nova posição no tampo, na colisão e na zona', () => {
    const moved = resolveMap('lobby', [
      {
        map: 'lobby',
        deskId: 'mesa-1',
        owner: { email: 'a@x.com' },
        config: { position: { col: 15, row: 4 } },
      },
    ]);
    const desk = deskOf(moved, 'mesa-1')!;
    expect({ x: desk.x, y: desk.y }).toEqual({ x: 15 * 32, y: 4 * 32 });
    expect(isBlocked(moved, { x: 15 * 32 + 16, y: 4 * 32 + 16 })).toBe(true);
    expect(areaAt(moved, { x: 15 * 32 + 16, y: 5 * 32 + 16 })?.id).toBe(
      'mesa-1',
    );
  });
});
