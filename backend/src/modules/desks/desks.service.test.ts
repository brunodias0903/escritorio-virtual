import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryDeskRepository } from '../../infra/persistence/memory/index.js';
import {
  DeskConfigSchema,
  FREE_DESK_CONFIG,
  type DeskConfig,
} from '../../shared/domain/index.js';
import { DeskService, freeDesk } from './desks.service.js';

const ANA = { email: 'ana@empresa.com', name: 'Ana' };
const BIA = { email: 'bia@empresa.com', name: 'Bia' };

/** Um ponto dentro da zona de cada mesa da recepção (dentro da faixa de chão). */
const AT_DESK_1 = { map: 'lobby' as const, x: 430, y: 160 };
const AT_DESK_2 = { map: 'lobby' as const, x: 590, y: 160 };
const ON_ROAD = { map: 'lobby' as const, x: 480, y: 580 };

let service: DeskService;
let time: number;

beforeEach(() => {
  time = 1_000;
  service = new DeskService(new MemoryDeskRepository(), () => time);
});

const config = (over: Partial<DeskConfig> = {}): DeskConfig => ({
  color: 2,
  rug: 1,
  items: ['lamp', 'mug'],
  label: 'Meu canto',
  computer: 'desktop',
  locked: false,
  position: null,
  ...over,
});

describe('adotar', () => {
  it('adota a mesa em que está, com a decoração padrão e o nome na plaquinha', async () => {
    const result = await service.adopt(ANA, AT_DESK_1, 'mesa-1');
    expect(result).toMatchObject({
      ok: true,
      value: {
        map: 'lobby',
        deskId: 'mesa-1',
        owner: ANA,
        config: { label: 'Mesa de Ana', items: ['plant'] },
      },
    });
    expect(await service.list()).toHaveLength(1);
  });

  it('só adota estando na zona daquela mesa', async () => {
    expect(await service.adopt(ANA, ON_ROAD, 'mesa-1')).toEqual({
      ok: false,
      error: 'not_in_desk',
    });
    expect(await service.adopt(ANA, AT_DESK_2, 'mesa-1')).toEqual({
      ok: false,
      error: 'not_in_desk',
    });
  });

  it('recusa mesa que não existe', async () => {
    expect(await service.adopt(ANA, AT_DESK_1, 'mesa-99')).toEqual({
      ok: false,
      error: 'invalid_desk',
    });
    expect(await service.adopt(ANA, AT_DESK_1, 'sala-reuniao')).toEqual({
      ok: false,
      error: 'invalid_desk',
    });
  });

  it('mesa com dono não pode ser adotada por outra pessoa', async () => {
    await service.adopt(ANA, AT_DESK_1, 'mesa-1');
    expect(await service.adopt(BIA, AT_DESK_1, 'mesa-1')).toEqual({
      ok: false,
      error: 'desk_taken',
    });
  });

  it('cada pessoa adota uma mesa só', async () => {
    await service.adopt(ANA, AT_DESK_1, 'mesa-1');
    expect(await service.adopt(ANA, AT_DESK_2, 'mesa-2')).toEqual({
      ok: false,
      error: 'desk_limit',
    });
  });

  it('depois de devolver, pode adotar outra', async () => {
    await service.adopt(ANA, AT_DESK_1, 'mesa-1');
    await service.release({ ...ANA, admin: false }, 'lobby', 'mesa-1');
    expect(await service.adopt(ANA, AT_DESK_2, 'mesa-2')).toMatchObject({
      ok: true,
    });
  });
});

describe('decorar e sincronizar dono', () => {
  it('só o dono muda a decoração', async () => {
    await service.adopt(ANA, AT_DESK_1, 'mesa-1');
    time = 2_000;

    expect(
      await service.configure(BIA.email, 'lobby', 'mesa-1', config()),
    ).toEqual({
      ok: false,
      error: 'not_owner',
    });
    const result = await service.configure(
      ANA.email,
      'lobby',
      'mesa-1',
      config(),
    );
    expect(result).toMatchObject({
      ok: true,
      value: { owner: ANA, config: config() },
    });
    expect((await service.list())[0]?.config).toEqual(config());
  });

  it('não decora mesa livre', async () => {
    expect(
      await service.configure(ANA.email, 'lobby', 'mesa-1', config()),
    ).toEqual({
      ok: false,
      error: 'invalid_desk',
    });
  });

  it('a decoração padrão passa na validação', async () => {
    const result = await service.adopt(ANA, AT_DESK_1, 'mesa-1');
    expect(
      result.ok && DeskConfigSchema.safeParse(result.value.config).success,
    ).toBe(true);
  });

  it('atualiza nome e cargo do dono quando a conta muda', async () => {
    expect(await service.syncOwner(ANA)).toBeNull();
    await service.adopt(ANA, AT_DESK_1, 'mesa-1');
    expect(await service.syncOwner(ANA)).toBeNull();
    const updated = await service.syncOwner({
      email: ANA.email,
      name: 'Ana Silva',
      role: 'Tech Lead',
    });
    expect(updated?.owner).toEqual({
      email: ANA.email,
      name: 'Ana Silva',
      role: 'Tech Lead',
    });
  });
});

describe('devolver', () => {
  it('o dono devolve e a mesa volta a ficar livre', async () => {
    await service.adopt(ANA, AT_DESK_1, 'mesa-1');
    const result = await service.release(
      { ...ANA, admin: false },
      'lobby',
      'mesa-1',
    );
    expect(result).toEqual({ ok: true, value: freeDesk('lobby', 'mesa-1') });
    expect(freeDesk('lobby', 'mesa-1').config).toEqual(FREE_DESK_CONFIG);
    expect(await service.list()).toEqual([]);
  });

  it('outra pessoa não devolve a mesa de alguém', async () => {
    await service.adopt(ANA, AT_DESK_1, 'mesa-1');
    expect(
      await service.release({ ...BIA, admin: false }, 'lobby', 'mesa-1'),
    ).toEqual({
      ok: false,
      error: 'not_owner',
    });
    expect(await service.list()).toHaveLength(1);
  });

  it('um administrador devolve a mesa de qualquer pessoa', async () => {
    await service.adopt(ANA, AT_DESK_1, 'mesa-1');
    expect(
      await service.release({ ...BIA, admin: true }, 'lobby', 'mesa-1'),
    ).toMatchObject({ ok: true });
    expect(await service.list()).toEqual([]);
  });

  it('devolver mesa livre dá erro', async () => {
    expect(
      await service.release({ ...ANA, admin: true }, 'lobby', 'mesa-1'),
    ).toEqual({
      ok: false,
      error: 'invalid_desk',
    });
  });
});

describe('mover mesa', () => {
  it('dono pode mover a própria mesa para área livre ou colada em outra', async () => {
    await service.adopt(ANA, AT_DESK_1, 'mesa-1');
    // Colada ao lado da mesa-2 (que fica em col 18, row 4 -> col 15, row 4 encosta nela).
    const moved = await service.move(ANA.email, 'lobby', 'mesa-1', 15, 4);
    expect(moved).toMatchObject({
      ok: true,
      value: { deskId: 'mesa-1', config: { position: { col: 15, row: 4 } } },
    });

    // Personalizar depois de mover mantém a nova posição.
    const styled = await service.configure(
      ANA.email,
      'lobby',
      'mesa-1',
      config({ label: 'Nova' }),
    );
    expect(styled).toMatchObject({
      ok: true,
      value: {
        config: { label: 'Nova', position: { col: 15, row: 4 } },
      },
    });
  });

  it('recusa mover mesa de outro, sobre área protegida ou sobre alguém', async () => {
    await service.adopt(ANA, AT_DESK_1, 'mesa-1');
    expect(await service.move(BIA.email, 'lobby', 'mesa-1', 2, 11)).toEqual({
      ok: false,
      error: 'not_owner',
    });
    // Dentro da sala de reunião.
    expect(await service.move(ANA.email, 'lobby', 'mesa-1', 2, 3)).toEqual({
      ok: false,
      error: 'invalid_desk_position',
    });
    // Perto da porta do Andar 2.
    expect(await service.move(ANA.email, 'lobby', 'mesa-1', 26, 8)).toEqual({
      ok: false,
      error: 'invalid_desk_position',
    });
    // Em cima de um jogador parado no ponto do tampo.
    expect(
      await service.move(ANA.email, 'lobby', 'mesa-1', 2, 11, [
        { x: 2 * 32 + 16, y: 11 * 32 + 16 },
      ]),
    ).toEqual({
      ok: false,
      error: 'invalid_desk_position',
    });
  });
});
