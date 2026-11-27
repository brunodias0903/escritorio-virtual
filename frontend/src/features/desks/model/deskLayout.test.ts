import { describe, expect, it } from 'vitest';

import { DESK_HEIGHT, DESK_WIDTH, type DeskDef } from '@/shared/domain';

import { DESK_ITEM_SIZE, deskItemSlot } from './deskLayout';

const DESK: DeskDef = {
  id: 'mesa-1',
  name: 'Mesa 1',
  x: 0,
  y: 0,
  w: DESK_WIDTH,
  h: DESK_HEIGHT,
};

describe('deskItemSlot', () => {
  it('alinha o 4º item verticalmente com o 2º item no desktop sem colidir com o gabinete', () => {
    const setup = { machine: 'desktop' as const, monitor: 'triple' as const };
    const slot1 = deskItemSlot(DESK, 1, setup);
    const slot3 = deskItemSlot(DESK, 3, setup);
    const towerRightEdge = DESK.x + DESK.w / 2 + 18 + 8;

    expect(slot3.x).toBe(slot1.x);
    expect(slot3.x).toBeGreaterThan(towerRightEdge);
    expect(slot3.y).toBeGreaterThanOrEqual(slot1.y + DESK_ITEM_SIZE);
    expect(slot3.y + DESK_ITEM_SIZE).toBeLessThanOrEqual(DESK.y + DESK.h - 8);
  });

  it('mantém os 4 itens dentro da área útil do tampo em desktop e notebook', () => {
    for (const machine of ['desktop', 'laptop'] as const) {
      for (const monitor of [
        'none',
        'single',
        'dual',
        'triple',
        'ultrawide',
      ] as const) {
        for (let i = 0; i < 4; i++) {
          const slot = deskItemSlot(DESK, i, { machine, monitor });
          expect(slot.x).toBeGreaterThanOrEqual(DESK.x);
          expect(slot.x + DESK_ITEM_SIZE).toBeLessThanOrEqual(DESK.x + DESK.w);
          expect(slot.y).toBeGreaterThanOrEqual(DESK.y);
          expect(slot.y + DESK_ITEM_SIZE).toBeLessThanOrEqual(
            DESK.y + DESK.h - 8,
          );
        }
      }
    }
  });
});
