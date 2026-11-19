import { defaultAppearance } from '@/shared/domain';
import { describe, expect, it } from 'vitest';

import { SPRITE_H, SPRITE_W, buildSprite, spriteRows } from './sprite';

const appearance = defaultAppearance('ana');
const FACINGS = ['down', 'up', 'left', 'right'] as const;
const STYLES = [0, 1, 2, 3];

describe('sprite', () => {
  it('toda pose tem 16 x 24, em qualquer direção, quadro e cabelo', () => {
    for (const facing of FACINGS) {
      for (const frame of [0, 1, 2] as const) {
        for (const style of STYLES) {
          const rows = spriteRows({ ...appearance, style }, facing, frame);
          expect(rows).toHaveLength(SPRITE_H);
          for (const row of rows) expect(row).toHaveLength(SPRITE_W);
        }
      }
    }
  });

  it('olhar para a direita é o espelho de olhar para a esquerda', () => {
    const left = spriteRows(appearance, 'left', 0);
    const right = spriteRows(appearance, 'right', 0);
    expect(right).toEqual(left.map((row) => [...row].reverse().join('')));
  });

  it('as poses de andar mudam só as pernas', () => {
    const idle = spriteRows(appearance, 'down', 0);
    const step = spriteRows(appearance, 'down', 1);
    expect(step.slice(0, 18)).toEqual(idle.slice(0, 18));
    expect(step.slice(18)).not.toEqual(idle.slice(18));
  });

  it('de frente aparecem os olhos; de costas não', () => {
    const eyes = (facing: (typeof FACINGS)[number]) =>
      spriteRows(appearance, facing, 0).join('').includes('W');
    expect(eyes('down')).toBe(true);
    expect(eyes('up')).toBe(false);
  });

  it('careca não tem cabelo na cabeça', () => {
    const rows = spriteRows({ ...appearance, style: 3 }, 'down', 0);
    expect(rows.slice(1, 11).join('')).not.toMatch(/[Hhd]/);
  });

  it('os retângulos ficam dentro da grade e usam cores de verdade', () => {
    for (const facing of FACINGS) {
      for (const r of buildSprite(appearance, facing, 1)) {
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(SPRITE_W);
        expect(r.y + r.h).toBeLessThanOrEqual(SPRITE_H);
        expect(r.fill).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });
});
