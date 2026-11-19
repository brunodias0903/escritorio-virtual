import { describe, expect, it } from 'vitest';
import {
  FOCUS_SIDEBAR_WIDTH,
  SCREEN_RATIO,
  TILE_GAP,
  TILE_MAX_WIDTH,
  TILE_MIN_WIDTH,
  TILE_RATIO,
  focusLayout,
  rowLayout,
  tileWidth,
} from './tileLayout';

describe('tileWidth', () => {
  it('um quadro só nunca passa do máximo', () => {
    expect(tileWidth(1400, 1)).toBe(TILE_MAX_WIDTH);
  });

  it('divide o espaço entre os quadros da fileira', () => {
    const width = tileWidth(900, 3);
    expect(width * 3 + TILE_GAP * 2).toBeLessThanOrEqual(900 - TILE_GAP * 2);
    expect(width).toBeGreaterThan(TILE_MIN_WIDTH);
  });

  it('com muita gente, fica no mínimo (e quebra linha)', () => {
    expect(tileWidth(700, 8)).toBe(TILE_MIN_WIDTH);
  });

  it('sem quadros devolve o máximo', () => {
    expect(tileWidth(900, 0)).toBe(TILE_MAX_WIDTH);
  });
});

describe('rowLayout', () => {
  it('câmeras e telas ficam com a mesma altura; a tela é 16:9', () => {
    const row = rowLayout(1200, 2, 1);
    expect(row.height).toBe(Math.round(row.cameraWidth * TILE_RATIO));
    expect(row.screenWidth).toBe(Math.round(row.height / SCREEN_RATIO));
    expect(row.screenWidth).toBeGreaterThan(row.cameraWidth);
  });

  it('uma tela a mais deixa as câmeras menores', () => {
    expect(rowLayout(900, 3, 1).cameraWidth).toBeLessThanOrEqual(
      rowLayout(900, 3, 0).cameraWidth,
    );
  });
});

describe('focusLayout', () => {
  it('a tela grande cabe ao lado da coluna de pessoas', () => {
    const big = focusLayout(1200, 600);
    expect(big.width + FOCUS_SIDEBAR_WIDTH + TILE_GAP * 3).toBeLessThanOrEqual(
      1200,
    );
    expect(big.height).toBeLessThanOrEqual(600);
  });

  it('em área baixa, a altura manda', () => {
    expect(focusLayout(2000, 360)).toEqual({ width: 640, height: 360 });
  });

  it('nunca fica negativa', () => {
    expect(focusLayout(100, -5)).toEqual({ width: 0, height: 0 });
  });
});
