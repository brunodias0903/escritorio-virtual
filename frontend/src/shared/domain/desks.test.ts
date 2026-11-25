import { describe, expect, it } from 'vitest';
import {
  DESK_COLORS,
  DESK_DECOR_TAG,
  DESK_ITEMS,
  DESK_ITEM_LIMIT,
  DESK_ITEM_TAGS,
  DESK_LABEL_MAX_LENGTH,
  DeskConfigSchema,
  DeskInfoSchema,
  RUG_COLORS,
  defaultDeskConfig,
  deskKey,
  resolveDeskSetup,
} from './desks';

describe('defaultDeskConfig', () => {
  it('é válida e leva o nome de quem adotou', () => {
    const config = defaultDeskConfig('Bruno');
    expect(DeskConfigSchema.safeParse(config).success).toBe(true);
    expect(config.label).toBe('Mesa de Bruno');
  });

  it('corta nomes muito longos na plaquinha', () => {
    const config = defaultDeskConfig('x'.repeat(40));
    expect(config.label).toHaveLength(DESK_LABEL_MAX_LENGTH);
  });
});

describe('DeskConfigSchema: computador', () => {
  const old = { color: 1, rug: null, items: [], label: 'Antiga' };

  it('mesa antiga, sem computador escolhido, fica com o PC de mesa', () => {
    expect(DeskConfigSchema.parse(old).computer).toBe('desktop');
  });

  it('aceita os 6 tipos e recusa outros', () => {
    for (const computer of [
      'desktop',
      'dualMonitor',
      'ultrawide',
      'tripleMonitor',
      'laptop',
      'laptopMonitor',
    ]) {
      expect(DeskConfigSchema.parse({ ...old, computer }).computer).toBe(
        computer,
      );
    }
    expect(
      DeskConfigSchema.safeParse({ ...old, computer: 'tablet' }).success,
    ).toBe(false);
  });

  it('resolveDeskSetup converte setups legados e separa máquina de monitor', () => {
    expect(resolveDeskSetup({ computer: 'laptop' })).toEqual({
      machine: 'laptop',
      monitor: 'none',
    });
    expect(resolveDeskSetup({ computer: 'laptopMonitor' })).toEqual({
      machine: 'laptop',
      monitor: 'single',
    });
    expect(resolveDeskSetup({ computer: 'ultrawide' })).toEqual({
      machine: 'desktop',
      monitor: 'ultrawide',
    });
    expect(
      resolveDeskSetup({
        computer: 'desktop',
        machine: 'desktop',
        monitor: 'none',
      }),
    ).toEqual({ machine: 'desktop', monitor: 'single' });
    expect(
      resolveDeskSetup({
        computer: 'laptopMonitor',
        machine: 'laptop',
        monitor: 'triple',
      }),
    ).toEqual({ machine: 'laptop', monitor: 'triple' });
  });
});

describe('DeskConfigSchema', () => {
  const valid = {
    color: 1,
    rug: 2,
    items: ['plant', 'lamp'],
    label: ' Minha mesa ',
  };

  it('aceita uma decoração válida e limpa o texto', () => {
    const parsed = DeskConfigSchema.parse(valid);
    expect(parsed.label).toBe('Minha mesa');
    expect(DeskConfigSchema.safeParse({ ...valid, rug: null }).success).toBe(
      true,
    );
  });

  it('marca todos os 24 enfeites com a tag desk-decor', () => {
    expect(DESK_ITEMS).toHaveLength(24);
    for (const item of DESK_ITEMS) {
      expect(DESK_ITEM_TAGS[item]).toContain(DESK_DECOR_TAG);
      expect(
        DeskConfigSchema.safeParse({ ...valid, items: [item] }).success,
      ).toBe(true);
    }
  });

  it.each([
    ['cor fora da paleta', { color: DESK_COLORS.length }],
    ['tapete fora da paleta', { rug: RUG_COLORS.length }],
    ['item desconhecido', { items: ['bomba'] }],
    ['itens repetidos', { items: ['plant', 'plant'] }],
    ['itens demais', { items: DESK_ITEMS.slice(0, DESK_ITEM_LIMIT + 1) }],
    ['plaquinha longa', { label: 'x'.repeat(DESK_LABEL_MAX_LENGTH + 1) }],
    ['cor quebrada', { color: 1.5 }],
  ])('recusa %s', (_name, override) => {
    expect(DeskConfigSchema.safeParse({ ...valid, ...override }).success).toBe(
      false,
    );
  });
});

describe('DeskInfoSchema', () => {
  it('aceita mesa livre e mesa com dono', () => {
    const config = defaultDeskConfig('Ana');
    expect(
      DeskInfoSchema.safeParse({
        map: 'lobby',
        deskId: 'mesa-1',
        owner: null,
        config,
      }).success,
    ).toBe(true);
    expect(
      DeskInfoSchema.safeParse({
        map: 'lobby',
        deskId: 'mesa-1',
        owner: { email: 'a@x.com', name: 'Ana' },
        config,
      }).success,
    ).toBe(true);
    expect(
      DeskInfoSchema.safeParse({
        map: 'outro',
        deskId: 'mesa-1',
        owner: null,
        config,
      }).success,
    ).toBe(false);
  });
});

describe('deskKey', () => {
  it('é única por sala e por mesa', () => {
    expect(deskKey('lobby', 'mesa-1')).toBe('lobby:mesa-1');
    expect(deskKey('lobby', 'mesa-1')).not.toBe(deskKey('andar-2', 'mesa-1'));
  });
});
