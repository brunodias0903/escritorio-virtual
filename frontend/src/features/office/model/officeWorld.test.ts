import { defaultAppearance, getMap, type Player } from '@/shared/domain';
import { describe, expect, it } from 'vitest';
import { EMOTE_DURATION_MS, OfficeWorld } from './officeWorld';

const appearance = defaultAppearance('x');
const player = (
  id: string,
  name: string,
  x: number,
  y: number,
  map: Player['map'] = 'lobby',
): Player => ({
  id,
  name,
  color: 1,
  x,
  y,
  map,
  status: 'available',
  appearance,
});

const ana = player('a', 'Ana', 496, 560);
const bia = player('b', 'Bia', 112, 112);

const started = () => {
  const world = new OfficeWorld();
  world.apply({ type: 'init', id: 'a', map: 'lobby', players: [ana, bia] });
  return world;
};

describe('OfficeWorld', () => {
  it('carrega jogadores no init e identifica o meu', () => {
    const world = started();
    expect(world.meId).toBe('a');
    expect(world.map).toBe('lobby');
    expect(world.snapshot().players).toHaveLength(2);
    expect(world.me()?.name).toBe('Ana');
  });

  it('adiciona, atualiza e remove jogadores', () => {
    const world = started();
    world.apply({ type: 'joined', player: player('c', 'Caio', 5, 5) });
    world.apply({
      type: 'joined',
      player: player('d', 'Dani', 5, 5, 'andar-2'),
    });
    expect(world.snapshot().players).toHaveLength(3);

    world.apply({ type: 'status', id: 'c', status: 'busy' });
    world.apply({ type: 'status', id: 'zz', status: 'busy' });
    const novo = { skin: 1, hair: 2, style: 3, shirt: 4 };
    world.apply({ type: 'appearance', id: 'c', appearance: novo });
    world.apply({ type: 'appearance', id: 'zz', appearance: novo });
    const caio = world.snapshot().players.find((p) => p.id === 'c')!;
    expect(caio).toMatchObject({ status: 'busy', appearance: novo });

    world.apply({ type: 'left', id: 'c' });
    expect(world.snapshot().players).toHaveLength(2);
  });

  /** Deixa o passo em andamento terminar (sem pedir outro). */
  const finishStep = (world: OfficeWorld) => {
    for (let i = 0; i < 20; i++) world.moveMe({ dx: 0, dy: 0 }, 0.05);
  };

  it('anda um quadradinho por vez, informa o destino e vira para o lado certo', () => {
    const world = started();
    const next = world.moveMe({ dx: 1, dy: 0 }, 0.05);
    expect(next).toEqual({ x: 528, y: 560 });
    expect(world.me()).toMatchObject({ facing: 'right', moving: true });
    // Ainda a caminho: o desenho está entre os dois quadradinhos.
    expect(world.me()!.x).toBeGreaterThan(496);
    expect(world.me()!.x).toBeLessThan(528);
    // Enquanto anda, pedir outra direção não começa outro passo.
    expect(world.moveMe({ dx: 0, dy: -1 }, 0.05)).toBeNull();

    finishStep(world);
    expect(world.me()).toMatchObject({ x: 528, y: 560, moving: false });

    for (const [dx, dy, facing, x, y] of [
      [0, -1, 'up', 528, 528],
      [-1, 0, 'left', 496, 528],
      [0, 1, 'down', 496, 560],
    ] as const) {
      expect(world.moveMe({ dx, dy }, 0.05)).toEqual({ x, y });
      expect(world.me()?.facing).toBe(facing);
      finishStep(world);
    }
  });

  it('segurando a direção, emenda os passos sem parar', () => {
    const world = started();
    const steps: unknown[] = [];
    for (let i = 0; i < 20; i++) {
      const step = world.moveMe({ dx: 1, dy: 0 }, 0.05);
      if (step) steps.push(step);
    }
    // 1 segundo = 5 quadradinhos andados (o 6º começa no último instante).
    expect(steps.length).toBeGreaterThanOrEqual(5);
    expect(steps.length).toBeLessThanOrEqual(6);
  });

  it('devolve null e para de andar quando não há movimento ou antes do init', () => {
    const world = started();
    world.moveMe({ dx: 1, dy: 0 }, 0.05);
    finishStep(world);
    expect(world.moveMe({ dx: 0, dy: 0 }, 0.05)).toBeNull();
    expect(world.me()?.moving).toBe(false);
    expect(new OfficeWorld().moveMe({ dx: 1, dy: 0 }, 0.05)).toBeNull();
  });

  it('não atravessa mesas, mas vira para elas', () => {
    const world = new OfficeWorld();
    // Primeiro lugar da mesa 1: a mesa fica logo acima.
    world.apply({
      type: 'init',
      id: 'a',
      map: 'lobby',
      players: [{ ...ana, x: 432, y: 176 }],
    });
    const table = getMap('lobby').solids.find(
      (s) => s.kind === 'desk' && s.x === 416 && s.y === 128,
    )!;
    expect(table).toBeDefined();
    expect(world.moveMe({ dx: 0, dy: -1 }, 0.05)).toBeNull();
    expect(world.me()).toMatchObject({ y: 176, facing: 'up', moving: false });
  });

  it('move os outros aos poucos, vira o rosto e ignora a mensagem sobre mim', () => {
    const world = started();
    world.apply({ type: 'moved', id: 'b', x: 144, y: 112 });
    world.apply({ type: 'moved', id: 'a', x: 1, y: 1 });
    world.apply({ type: 'moved', id: 'zz', x: 1, y: 1 });
    world.tick(0.05);
    const b = world.snapshot().players.find((p) => p.id === 'b')!;
    expect(b.x).toBeGreaterThan(112);
    expect(b.x).toBeLessThan(144);
    expect(b).toMatchObject({ facing: 'right', moving: true });
    expect(world.me()?.x).toBe(496);

    for (let i = 0; i < 20; i++) world.tick(0.05);
    expect(world.snapshot().players.find((p) => p.id === 'b')).toMatchObject({
      x: 144,
      moving: false,
    });
  });

  it('aplica a correção do servidor, no centro do quadradinho', () => {
    const world = started();
    world.apply({ type: 'correct', x: 304, y: 304 });
    expect(world.me()).toMatchObject({ x: 304, y: 304, tx: 304, ty: 304 });
  });
  it('ignora correção antes do init', () => {
    const world = new OfficeWorld();
    world.apply({ type: 'correct', x: 1, y: 1 });
    expect(world.me()).toBeUndefined();
  });

  it('mostra o emote por alguns segundos e depois apaga', () => {
    const world = started();
    world.apply({ type: 'emote', id: 'b', emote: '🎉' }, 1000);
    world.apply({ type: 'emote', id: 'zz', emote: '🎉' }, 1000);
    world.tick(0.016, 1000 + EMOTE_DURATION_MS - 1);
    expect(world.snapshot().players.find((p) => p.id === 'b')?.emote).toBe(
      '🎉',
    );
    world.tick(0.016, 1000 + EMOTE_DURATION_MS);
    expect(
      world.snapshot().players.find((p) => p.id === 'b')?.emote,
    ).toBeNull();
  });

  it('ao mudar de sala, troca a lista e mantém a minha pessoa na nova posição', () => {
    const world = started();
    world.apply({ type: 'status', id: 'a', status: 'busy' });
    world.apply({
      type: 'map',
      map: 'andar-2',
      x: 80,
      y: 304,
      players: [player('d', 'Dani', 304, 304, 'andar-2')],
    });
    const snapshot = world.snapshot();
    expect(snapshot.map).toBe('andar-2');
    expect(snapshot.players.map((p) => p.id).sort()).toEqual(['a', 'd']);
    expect(world.me()).toMatchObject({
      x: 80,
      y: 304,
      map: 'andar-2',
      status: 'busy',
    });
  });

  it('mudar de sala antes do init não quebra', () => {
    const world = new OfficeWorld();
    world.apply({ type: 'map', map: 'andar-2', x: 1, y: 1, players: [] });
    expect(world.snapshot().players).toEqual([]);
  });
});

describe('OfficeWorld: mesinha cheia', () => {
  // Mesa 7: lugares nos quadradinhos (13..15, 13); a estrada fica na linha 14.
  const SEATS = [
    { x: 432, y: 432 },
    { x: 464, y: 432 },
    { x: 496, y: 432 },
  ];

  const at = (id: string, x: number, y: number): Player => ({
    ...ana,
    id,
    name: id,
    x,
    y,
  });

  /** Eu na estrada, embaixo do 3º lugar, com `inside` pessoas já sentadas. */
  const crowded = (inside: number) => {
    const world = new OfficeWorld();
    const people = SEATS.slice(0, inside).map((seat, i) =>
      at(`p${i}`, seat.x, seat.y),
    );
    world.apply({
      type: 'init',
      id: 'a',
      map: 'lobby',
      players: [at('a', 496, 464), ...people],
    });
    return world;
  };

  it('com lugar, entra na mesinha', () => {
    const world = crowded(2);
    expect(world.moveMe({ dx: 0, dy: -1 }, 0.05)).toEqual(SEATS[2]);
    expect(world.fullZone).toBeNull();
  });

  it('com 3 dentro, fica de fora e avisa qual mesa está cheia', () => {
    const world = crowded(3);
    expect(world.moveMe({ dx: 0, dy: -1 }, 0.05)).toBeNull();
    expect(world.me()).toMatchObject({ x: 496, y: 464, facing: 'up' });
    expect(world.snapshot().fullZone).toBe('Mesa 7');
    expect(world.occupants('mesa-7')).toBe(3);
    expect(world.occupants('mesa-7', 'p0')).toBe(2);
  });

  it('o aviso some quando a pessoa volta a andar', () => {
    const world = crowded(3);
    world.moveMe({ dx: 0, dy: -1 }, 0.05);
    expect(world.fullZone).toBe('Mesa 7');
    expect(world.moveMe({ dx: 0, dy: 1 }, 0.05)).not.toBeNull();
    expect(world.fullZone).toBeNull();
  });

  it('o lugar de outra pessoa é barrado mesmo com a mesinha vaga', () => {
    const world = crowded(1);
    // Ana vem pelo lado do lugar 1 (onde p0 está).
    world.apply({ type: 'correct', x: 432, y: 464 });
    expect(world.moveMe({ dx: 0, dy: -1 }, 0.05)).toBeNull();
    expect(world.fullZone).toBeNull();
  });

  it('quem já está dentro não pisa no lugar de outro, mas pode sair', () => {
    const world = new OfficeWorld();
    world.apply({
      type: 'init',
      id: 'a',
      map: 'lobby',
      players: [
        at('a', SEATS[1]!.x, SEATS[1]!.y),
        at('p0', SEATS[0]!.x, SEATS[0]!.y),
        at('p2', SEATS[2]!.x, SEATS[2]!.y),
      ],
    });
    expect(world.moveMe({ dx: -1, dy: 0 }, 0.05)).toBeNull();
    expect(world.moveMe({ dx: 1, dy: 0 }, 0.05)).toBeNull();
    expect(world.fullZone).toBeNull();
    expect(world.moveMe({ dx: 0, dy: 1 }, 0.05)).toEqual({ x: 464, y: 464 });
  });

  it('também aceita o aviso do servidor', () => {
    const world = crowded(0);
    world.apply({ type: 'zoneFull', zone: 'Mesa 9' });
    expect(world.snapshot().fullZone).toBe('Mesa 9');
  });
});

describe('OfficeWorld: ir andando até a mesa', () => {
  const idle = { dx: 0, dy: 0 };

  /** Roda o relógio, como o laço do app, e devolve os passos enviados. */
  const run = (world: OfficeWorld, seconds: number) => {
    const steps: { x: number; y: number }[] = [];
    for (let t = 0; t < seconds; t += 0.05) {
      const step = world.moveMe(idle, 0.05);
      if (step) steps.push(step);
    }
    return steps;
  };

  it('anda um quadradinho por vez até o lugar do meio da mesa', () => {
    const world = started(); // Ana na estrada (496, 560)
    world.goTo({ map: 'lobby', deskId: 'mesa-7' });
    expect(world.autoWalking).toBe(true);
    const steps = run(world, 3);
    expect(world.me()).toMatchObject({ x: 464, y: 432 });
    expect(world.autoWalking).toBe(false);
    for (let i = 1; i < steps.length; i++) {
      const a = steps[i - 1]!;
      const b = steps[i]!;
      expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBe(32);
    }
  });

  it('com o meio ocupado, senta ao lado', () => {
    const world = new OfficeWorld();
    world.apply({
      type: 'init',
      id: 'a',
      map: 'lobby',
      players: [ana, player('b', 'Bia', 464, 432)],
    });
    world.goTo({ map: 'lobby', deskId: 'mesa-7' });
    run(world, 3);
    expect(world.me()).toMatchObject({ y: 432 });
    expect([432, 496]).toContain(world.me()!.x);
  });

  it('mesa cheia: para em frente e avisa', () => {
    const world = new OfficeWorld();
    world.apply({
      type: 'init',
      id: 'a',
      map: 'lobby',
      players: [
        ana,
        player('b', 'B', 432, 432),
        player('c', 'C', 464, 432),
        player('d', 'D', 496, 432),
      ],
    });
    world.goTo({ map: 'lobby', deskId: 'mesa-7' });
    run(world, 3);
    expect(world.me()).toMatchObject({ x: 464, y: 464 });
    expect(world.fullZone).toBe('Mesa 7');
  });

  it('mexer nas setas cancela a ida', () => {
    const world = started();
    world.goTo({ map: 'lobby', deskId: 'mesa-7' });
    run(world, 0.3);
    for (let i = 0; i < 10; i++) world.moveMe({ dx: 1, dy: 0 }, 0.05);
    expect(world.autoWalking).toBe(false);
  });

  it('mesa em outra sala: vai até a porta e, depois da troca, segue até a mesa', () => {
    const world = started();
    world.goTo({ map: 'andar-2', deskId: 'mesa-1' });
    const steps = run(world, 6);
    // O último passo entra na porta (coluna 29, linhas 8 a 10).
    expect(steps.at(-1)!.x).toBe(944);
    expect(world.autoWalking).toBe(true);

    world.apply({ type: 'map', map: 'andar-2', x: 80, y: 304, players: [] });
    run(world, 6);
    expect(world.me()).toMatchObject({ x: 464, y: 208 });
    expect(world.autoWalking).toBe(false);
  });

  it('mesa que não existe: não sai do lugar', () => {
    const world = started();
    world.goTo({ map: 'lobby', deskId: 'mesa-99' });
    expect(world.autoWalking).toBe(false);
    expect(run(world, 1)).toEqual([]);
  });

  it('mesa bloqueada pelo dono: para em frente para outros e permite o dono entrar', () => {
    const world = new OfficeWorld();
    world.apply({
      type: 'init',
      id: 'b',
      map: 'lobby',
      players: [{ ...ana, id: 'b', email: 'bia@x.com' }],
    });
    world.setDesks([
      {
        map: 'lobby',
        deskId: 'mesa-7',
        owner: { email: 'ana@x.com', name: 'Ana', role: '' },
        config: {
          color: 0,
          rug: null,
          items: [],
          label: 'Mesa de Ana',
          computer: 'desktop',
          locked: true,
          position: null,
        },
      },
    ]);

    world.goTo({ map: 'lobby', deskId: 'mesa-7' });
    run(world, 3);
    expect(world.me()).toMatchObject({ x: 464, y: 464 });
    expect(world.lockedZone).toBe('Mesa 7');
  });

  it('ir para uma sala (ex.: sala de reunião) caminha automaticamente até lá dentro', () => {
    const world = started();
    world.goTo({ map: 'lobby', areaId: 'sala-reuniao' });
    run(world, 6);
    const me = world.me()!;
    expect(me.x).toBeGreaterThanOrEqual(32);
    expect(me.x).toBeLessThan(11 * 32);
    expect(me.y).toBeGreaterThanOrEqual(2 * 32);
    expect(me.y).toBeLessThan(8 * 32);
    expect(world.autoWalking).toBe(false);
  });
});
