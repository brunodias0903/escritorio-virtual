import { describe, expect, it } from 'vitest';

import { getMap } from './maps';
import {
  TILE,
  axisOf,
  isOneStep,
  isTileCenter,
  snapToTile,
  stepTarget,
  tileCenter,
  tileOf,
} from './world';

const lobby = getMap('lobby');

describe('quadradinhos', () => {
  it('acha o quadradinho e o centro dele', () => {
    expect(tileOf({ x: 100, y: 70 })).toEqual({ tx: 3, ty: 2 });
    expect(tileCenter(3, 2)).toEqual({ x: 112, y: 80 });
    expect(snapToTile({ x: 100, y: 70 })).toEqual({ x: 112, y: 80 });
    expect(isTileCenter({ x: 112, y: 80 })).toBe(true);
    expect(isTileCenter({ x: 100, y: 80 })).toBe(false);
  });

  it('um passo é o quadradinho vizinho, sem diagonal', () => {
    const from = tileCenter(5, 5);
    expect(isOneStep(from, tileCenter(6, 5))).toBe(true);
    expect(isOneStep(from, tileCenter(5, 4))).toBe(true);
    expect(isOneStep(from, tileCenter(6, 6))).toBe(false);
    expect(isOneStep(from, tileCenter(7, 5))).toBe(false);
    expect(isOneStep(from, from)).toBe(false);
  });
});

describe('axisOf', () => {
  it('escolhe um só sentido', () => {
    expect(axisOf({ dx: 1, dy: 0 })).toEqual({ dx: 1, dy: 0 });
    expect(axisOf({ dx: -0.4, dy: 0.9 })).toEqual({ dx: 0, dy: 1 });
    expect(axisOf({ dx: 1, dy: 1 })).toEqual({ dx: 1, dy: 0 });
  });

  it('ignora um empurrãozinho', () => {
    expect(axisOf({ dx: 0.1, dy: -0.2 })).toEqual({ dx: 0, dy: 0 });
  });
});

describe('stepTarget', () => {
  it('anda um quadradinho no espaço livre', () => {
    const from = lobby.spawn;
    expect(stepTarget(lobby, from, { dx: 1, dy: 0 })).toEqual({
      x: from.x + TILE,
      y: from.y,
    });
    expect(stepTarget(lobby, from, { dx: 0, dy: 0 })).toBeNull();
  });

  it('não atravessa mesa, parede nem sai do mapa', () => {
    // Quadradinho logo abaixo da mesa 7 (a zona dela): subir bate na mesa.
    const below = tileCenter(14, 13);
    expect(stepTarget(lobby, below, { dx: 0, dy: -1 })).toBeNull();
    expect(stepTarget(lobby, tileCenter(1, 2), { dx: -1, dy: 0 })).toBeNull();
    expect(stepTarget(lobby, tileCenter(1, 2), { dx: 0, dy: -1 })).toBeNull();
  });
});
