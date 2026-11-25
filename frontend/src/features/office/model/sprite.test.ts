import {
  AVATAR_ACCESSORIES,
  HAIR_STYLE_COUNT,
  defaultAppearance,
} from '@/shared/domain';
import { describe, expect, it } from 'vitest';

import { SPRITE_H, SPRITE_W, buildSprite, spriteRows } from './sprite';

const appearance = defaultAppearance('ana');
const FACINGS = ['down', 'up', 'left', 'right'] as const;
const STYLES = Array.from({ length: HAIR_STYLE_COUNT }, (_, i) => i);

describe('sprite', () => {
  it('toda pose tem 16 x 24, em qualquer direção, quadro, cabelo e acessório', () => {
    for (const facing of FACINGS) {
      for (const frame of [0, 1, 2] as const) {
        for (const style of STYLES) {
          const rows = spriteRows({ ...appearance, style }, facing, frame);
          expect(rows).toHaveLength(SPRITE_H);
          for (const row of rows) expect(row).toHaveLength(SPRITE_W);
        }
        for (const accessory of AVATAR_ACCESSORIES) {
          const rows = spriteRows({ ...appearance, accessory }, facing, frame);
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

  it('mantém a cabeça do mesmo tamanho no biotipo gordo (chubby) e alarga apenas o tronco', () => {
    const regular = spriteRows(
      { ...appearance, bodyShape: 'regular' },
      'down',
      0,
    );
    const chubby = spriteRows(
      { ...appearance, bodyShape: 'chubby' },
      'down',
      0,
    );
    // Linhas da cabeça (1 a 10) idênticas
    expect(chubby.slice(1, 11)).toEqual(regular.slice(1, 11));
    // Linhas do tronco (11 a 17) mais largas no chubby
    const countBodyPixels = (rows: string[]) =>
      rows.slice(11, 18).join('').replace(/\./g, '').length;
    expect(countBodyPixels(chubby)).toBeGreaterThan(countBodyPixels(regular));
  });

  it('boné (cap) oculta cabelo curto, mas exibe as pontas inferiores quando o cabelo é longo', () => {
    const shortCap = spriteRows(
      { ...appearance, style: 2, hairLength: 'short', accessory: 'cap' },
      'down',
      0,
    );
    const longCap = spriteRows(
      { ...appearance, style: 2, hairLength: 'long', accessory: 'cap' },
      'down',
      0,
    );
    expect(shortCap.slice(0, 12).join('')).not.toMatch(/[Hhd]/);
    expect(longCap.slice(5, 14).join('')).toMatch(/[Hd]/);
  });
});
