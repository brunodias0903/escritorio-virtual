import { describe, expect, it } from 'vitest';
import {
  BASE_VIEW_WIDTH,
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  clampZoom,
  computeViewBox,
  pinchZoom,
  touchDistance,
  wheelZoom,
} from './camera';

const map = { width: 960, height: 640 };
const screen = { width: 1000, height: 600 };

describe('zoom', () => {
  it('o padrão mostra um bom pedaço da sala e nunca sai dos limites', () => {
    expect(DEFAULT_ZOOM).toBe(0.6);
    expect(BASE_VIEW_WIDTH / DEFAULT_ZOOM).toBe(800);
    expect(clampZoom(0.1)).toBe(MIN_ZOOM);
    expect(clampZoom(9)).toBe(MAX_ZOOM);
    expect(clampZoom(1.2)).toBe(1.2);
  });

  it('a roda aproxima para cima e afasta para baixo', () => {
    expect(wheelZoom(1, -100)).toBeGreaterThan(1);
    expect(wheelZoom(1, 100)).toBeLessThan(1);
    expect(wheelZoom(MAX_ZOOM, -1000)).toBe(MAX_ZOOM);
    expect(wheelZoom(MIN_ZOOM, 1000)).toBe(MIN_ZOOM);
  });

  it('a pinça segue a distância entre os dedos', () => {
    expect(pinchZoom(1, 100, 150)).toBeCloseTo(1.5);
    expect(pinchZoom(1, 100, 50)).toBeCloseTo(0.5);
    expect(pinchZoom(1, 100, 900)).toBe(MAX_ZOOM);
    expect(pinchZoom(1.3, 0, 50)).toBe(1.3);
    expect(touchDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});
describe('computeViewBox', () => {
  it('no zoom 1 mostra 480 px de largura, centrado na pessoa', () => {
    const view = computeViewBox(map, screen, 1, { x: 480, y: 320 });
    expect(view.w).toBe(BASE_VIEW_WIDTH);
    expect(view.h).toBeCloseTo(BASE_VIEW_WIDTH * 0.6);
    expect(view.x).toBeCloseTo(480 - BASE_VIEW_WIDTH / 2);
    expect(view.y).toBeCloseTo(320 - view.h / 2);
  });

  it('afastar o zoom mostra mais do mapa, e aproximar mostra menos', () => {
    const near = computeViewBox(map, screen, 2, { x: 480, y: 320 });
    const normal = computeViewBox(map, screen, 1, { x: 480, y: 320 });
    const far = computeViewBox(map, screen, 0.5, { x: 480, y: 320 });
    expect(near.w).toBeLessThan(normal.w);
    expect(far.w).toBeGreaterThan(normal.w);
    expect(far.w).toBe(map.width);
  });

  it('não sai do mapa quando a pessoa está na borda', () => {
    const corner = computeViewBox(map, screen, 1, { x: 5, y: 5 });
    expect(corner.x).toBe(0);
    expect(corner.y).toBe(0);
    const opposite = computeViewBox(map, screen, 1, { x: 955, y: 635 });
    expect(opposite.x + opposite.w).toBeCloseTo(map.width);
    expect(opposite.y + opposite.h).toBeCloseTo(map.height);
  });

  it('em tela muito alta, limita pela altura do mapa', () => {
    const tall = computeViewBox(map, { width: 400, height: 2000 }, 0.5, {
      x: 480,
      y: 320,
    });
    expect(tall.h).toBe(map.height);
    expect(tall.w).toBeCloseTo(map.height / 5);
    expect(tall.y).toBe(0);
  });
});
