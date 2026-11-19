import { describe, expect, it } from 'vitest';
import {
  SHIRT_COLORS,
  TILE,
  defaultAppearance,
  getMap,
  tileCenter,
  type Player,
} from '../../shared/domain/index.js';
import { EMOTE_MIN_INTERVAL_MS, OfficeService } from './office.service.js';

const appearance = defaultAppearance('teste');
const lobby = getMap('lobby');

const newOffice = () => new OfficeService();

/** Escritório com a Ana já dentro. */
const withAna = () => {
  let time = 1_000_000;
  const office = new OfficeService({ now: () => time });
  office.join('a', 'Ana', 'ana@x.com', appearance);
  return {
    office,
    advance: (ms: number) => {
      time += ms;
    },
  };
};

describe('OfficeService.join', () => {
  it('envia init ao novo jogador e joined aos outros da sala', () => {
    const out = newOffice().join('a', 'Ana', 'ana@x.com', appearance);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      to: 'self',
      message: { type: 'init', id: 'a', map: 'lobby' },
    });
    expect(out[1]).toMatchObject({
      to: 'others',
      map: 'lobby',
      message: {
        type: 'joined',
        player: {
          name: 'Ana',
          status: 'available',
          map: 'lobby',
          ...lobby.spawn,
        },
      },
    });
  });

  it('usa a cor da camisa e limpa o nome', () => {
    const office = newOffice();
    office.join('a', '<b>Ana</b>', 'ana@x.com', appearance);
    const player = office.players.get('a')!;
    expect(player.name).toBe('bAnab');
    expect(player.color).toBe(
      parseInt(SHIRT_COLORS[appearance.shirt].slice(1), 16),
    );
  });

  it('ignora um segundo join do mesmo id', () => {
    const office = newOffice();
    office.join('a', 'Ana', 'ana@x.com', appearance);
    expect(office.join('a', 'Outro', 'o@x.com', appearance)).toEqual([]);
  });

  it('o init traz também quem está em outras instâncias, na mesma sala', () => {
    const office = newOffice();
    const remote: Player = {
      id: 'r',
      name: 'Rui',
      color: 1,
      x: 5,
      y: 5,
      map: 'lobby',
      status: 'available',
      appearance,
    };
    office.replaceRemote([remote, { ...remote, id: 'r2', map: 'andar-2' }]);
    const init = office.join('a', 'Ana', 'ana@x.com', appearance)[0]!.message;
    if (init.type !== 'init') throw new Error('esperava init');
    expect(init.players.map((p) => p.id).sort()).toEqual(['a', 'r']);
  });
});

describe('OfficeService.move', () => {
  it('aceita um passo para o quadradinho vizinho e avisa os outros da sala', () => {
    const { office } = withAna();
    const spawn = lobby.spawn;
    expect(office.move('a', spawn.x + TILE, spawn.y)).toEqual([
      {
        to: 'others',
        map: 'lobby',
        message: { type: 'moved', id: 'a', x: spawn.x + TILE, y: spawn.y },
      },
    ]);
  });

  it('corrige um salto grande, uma diagonal e um ponto fora do centro', () => {
    const { office } = withAna();
    const spawn = lobby.spawn;
    for (const [x, y] of [
      [0, 0],
      [spawn.x + 2 * TILE, spawn.y],
      [spawn.x + TILE, spawn.y + TILE],
      [spawn.x + 5, spawn.y],
    ] as const) {
      expect(office.move('a', x, y)).toEqual([
        { to: 'self', message: { type: 'correct', ...spawn } },
      ]);
    }
    expect(office.players.get('a')).toMatchObject(spawn);
  });

  it('corrige um passo para dentro de uma mesa ou de uma parede', () => {
    const { office } = withAna();
    const player = office.players.get('a')!;
    // Quadradinho da mesa 7 (coluna 13, linha 12) logo acima da sua zona.
    player.x = tileCenter(13, 13).x;
    player.y = tileCenter(13, 13).y;
    expect(office.move('a', player.x, player.y - TILE)[0]?.message.type).toBe(
      'correct',
    );
    // Parede de baixo.
    player.x = tileCenter(5, 18).x;
    player.y = tileCenter(5, 18).y;
    expect(office.move('a', player.x, player.y + TILE)[0]?.message.type).toBe(
      'correct',
    );
  });

  it('ignora jogador desconhecido', () => {
    expect(newOffice().move('x', 1, 1)).toEqual([]);
  });

  it('entrar na porta leva a outra sala: avisa os dois lados', () => {
    const { office } = withAna();
    const door = lobby.doors[0]!;
    const player = office.players.get('a')!;
    player.x = tileCenter(28, 9).x;
    player.y = tileCenter(28, 9).y;

    const out = office.move('a', tileCenter(29, 9).x, tileCenter(29, 9).y);

    expect(out.map((o) => [o.to, o.message.type, o.map])).toEqual([
      ['others', 'left', 'lobby'],
      ['self', 'map', undefined],
      ['others', 'joined', 'andar-2'],
    ]);
    expect(out[1]!.message).toMatchObject({
      type: 'map',
      map: 'andar-2',
      x: door.to.x,
      y: door.to.y,
      players: [],
    });
    expect(office.players.get('a')).toMatchObject({
      map: 'andar-2',
      x: door.to.x,
      y: door.to.y,
    });
  });

  it('na outra sala, quem está lá aparece na lista', () => {
    const { office } = withAna();
    office.join('b', 'Bia', 'bia@x.com', appearance);
    const bia = office.players.get('b')!;
    bia.map = 'andar-2';

    const ana = office.players.get('a')!;
    ana.x = tileCenter(28, 9).x;
    ana.y = tileCenter(28, 9).y;
    const map = office.move('a', tileCenter(29, 9).x, tileCenter(29, 9).y)[1]!
      .message;
    if (map.type !== 'map') throw new Error('esperava map');
    expect(map.players.map((p) => p.id)).toEqual(['b']);
  });
});

describe('status, emote e aparência', () => {
  it('muda o status e avisa a sala', () => {
    const { office } = withAna();
    expect(office.setStatus('a', 'busy')).toEqual([
      {
        to: 'all',
        map: 'lobby',
        message: { type: 'status', id: 'a', status: 'busy' },
      },
    ]);
    expect(office.players.get('a')?.status).toBe('busy');
    expect(office.setStatus('x', 'busy')).toEqual([]);
  });

  it('limita a frequência de emotes', () => {
    const { office, advance } = withAna();
    expect(office.emote('a', '👋')).toHaveLength(1);
    expect(office.emote('a', '🎉')).toEqual([]);
    advance(EMOTE_MIN_INTERVAL_MS);
    expect(office.emote('a', '🎉')).toHaveLength(1);
    expect(office.emote('x', '👋')).toEqual([]);
  });

  it('troca a aparência e a cor', () => {
    const { office } = withAna();
    const novo = { skin: 0, hair: 1, style: 2, shirt: 3 };
    const out = office.setAppearance('a', novo);
    expect(out[0]).toMatchObject({
      to: 'all',
      map: 'lobby',
      message: { type: 'appearance', id: 'a' },
    });
    expect(office.players.get('a')?.appearance).toEqual(novo);
    expect(office.players.get('a')?.color).toBe(
      parseInt(SHIRT_COLORS[3].slice(1), 16),
    );
    expect(office.setAppearance('x', novo)).toEqual([]);
  });
});

describe('OfficeService.leave', () => {
  it('remove o jogador e avisa a sala', () => {
    const { office } = withAna();
    expect(office.leave('a')).toEqual([
      { to: 'all', map: 'lobby', message: { type: 'left', id: 'a' } },
    ]);
    expect(office.players.size).toBe(0);
    expect(office.emailOf('a')).toBeUndefined();
  });

  it('ignora quem nunca entrou', () => {
    expect(newOffice().leave('x')).toEqual([]);
  });
});

describe('espelho das outras instâncias', () => {
  const remote: Player = {
    id: 'r',
    name: 'Rui',
    color: 1,
    x: 5,
    y: 5,
    map: 'lobby',
    status: 'available',
    appearance,
  };

  it('segue entradas, movimentos, status, aparência e saídas', () => {
    const office = newOffice();
    office.applyRemote({ type: 'joined', player: remote });
    office.applyRemote({ type: 'moved', id: 'r', x: 50, y: 60 });
    office.applyRemote({ type: 'status', id: 'r', status: 'away' });
    office.applyRemote({
      type: 'appearance',
      id: 'r',
      appearance: { skin: 1, hair: 1, style: 1, shirt: 1 },
    });
    expect(office.playersIn('lobby')).toMatchObject([
      { id: 'r', x: 50, y: 60, status: 'away', appearance: { shirt: 1 } },
    ]);

    office.applyRemote({ type: 'left', id: 'r' });
    expect(office.playersIn('lobby')).toEqual([]);
  });

  it('ignora eventos de quem não conhece e mensagens que não mudam o espelho', () => {
    const office = newOffice();
    office.applyRemote({ type: 'moved', id: 'zz', x: 1, y: 1 });
    office.applyRemote({ type: 'status', id: 'zz', status: 'busy' });
    office.applyRemote({
      type: 'appearance',
      id: 'zz',
      appearance: { skin: 0, hair: 0, style: 0, shirt: 0 },
    });
    office.applyRemote({ type: 'chatError', code: 'x' });
    expect(office.playersIn('lobby')).toEqual([]);
  });

  it('a lista do Valkey substitui o espelho e nunca duplica quem é local', () => {
    const { office } = withAna();
    office.applyRemote({
      type: 'joined',
      player: { ...remote, id: 'fantasma' },
    });
    office.replaceRemote([remote, { ...remote, id: 'a' }]);
    expect(
      office
        .playersIn('lobby')
        .map((p) => p.id)
        .sort(),
    ).toEqual(['a', 'r']);
  });

  it('a lista do Valkey não desfaz um movimento que já chegou pelo aviso', () => {
    const office = newOffice();
    office.applyRemote({ type: 'joined', player: remote });
    office.applyRemote({ type: 'moved', id: 'r', x: 432, y: 432 });
    office.replaceRemote([remote]);
    expect(office.playersIn('lobby')[0]).toMatchObject({ x: 432, y: 432 });
    office.replaceRemote([{ ...remote, map: 'andar-2' }]);
    expect(office.playersIn('andar-2')[0]).toMatchObject({ x: 5, y: 5 });
  });

  it('playersIn exclui quem se pede', () => {
    const { office } = withAna();
    expect(office.playersIn('lobby', 'a')).toEqual([]);
  });
});

describe('mesinha cheia (3 pessoas)', () => {
  const SEATS = [tileCenter(13, 13), tileCenter(14, 13), tileCenter(15, 13)];
  const BELOW = [tileCenter(13, 14), tileCenter(14, 14), tileCenter(15, 14)];

  const crowd = () => {
    const office = new OfficeService();
    ['a', 'b', 'c', 'd'].forEach((id, i) => {
      office.join(id, id.toUpperCase(), `${id}@x.com`, appearance);
      const player = office.players.get(id)!;
      Object.assign(player, BELOW[Math.min(i, 2)]!);
    });
    return office;
  };

  const sit = (office: OfficeService, ids: string[]) =>
    ids.forEach((id, i) => Object.assign(office.players.get(id)!, SEATS[i]!));

  it('deixa três entrarem e recusa a quarta, avisando', () => {
    const office = crowd();
    ['a', 'b', 'c'].forEach((id, i) => {
      expect(office.move(id, SEATS[i]!.x, SEATS[i]!.y)[0]?.message.type).toBe(
        'moved',
      );
    });
    expect(office.occupants('lobby', 'mesa-7')).toBe(3);

    const blocked = office.move('d', SEATS[2]!.x, SEATS[2]!.y);
    expect(blocked.map((o) => o.message.type)).toEqual(['correct', 'zoneFull']);
    expect(blocked[1]?.message).toEqual({ type: 'zoneFull', zone: 'Mesa 7' });
    expect(office.players.get('d')).toMatchObject(BELOW[2]!);
  });

  it('duas pessoas não ficam no mesmo quadradinho da mesinha', () => {
    const office = crowd();
    sit(office, ['a']);
    Object.assign(office.players.get('b')!, BELOW[0]!);
    const out = office.move('b', SEATS[0]!.x, SEATS[0]!.y);
    expect(out.map((o) => o.message.type)).toEqual(['correct']);
  });

  it('quem está dentro não pisa no lugar de outra pessoa, mas pode sair', () => {
    const office = crowd();
    sit(office, ['a', 'b', 'c']);
    expect(
      office.move('b', SEATS[2]!.x, SEATS[2]!.y).map((o) => o.message.type),
    ).toEqual(['correct']);
    expect(office.move('b', BELOW[1]!.x, BELOW[1]!.y)[0]?.message.type).toBe(
      'moved',
    );
  });

  it('abre vaga quando alguém sai ou vai embora', () => {
    const office = crowd();
    sit(office, ['a', 'b', 'c']);
    expect(office.move('d', SEATS[2]!.x, SEATS[2]!.y)[0]?.message.type).toBe(
      'correct',
    );

    office.leave('c');
    expect(office.move('d', SEATS[2]!.x, SEATS[2]!.y)[0]?.message.type).toBe(
      'moved',
    );
  });

  it('conta também as pessoas de outras instâncias', () => {
    const office = new OfficeService();
    office.join('d', 'D', 'd@x.com', appearance);
    Object.assign(office.players.get('d')!, BELOW[2]!);
    const remote = (id: string, seat: { x: number; y: number }) => ({
      id,
      name: id,
      color: 1,
      ...seat,
      map: 'lobby' as const,
      status: 'available' as const,
      appearance,
    });
    office.replaceRemote([
      remote('r1', SEATS[0]!),
      remote('r2', SEATS[1]!),
      remote('r3', SEATS[2]!),
    ]);
    expect(office.move('d', SEATS[2]!.x, SEATS[2]!.y)[0]?.message.type).toBe(
      'correct',
    );
  });

  it('a sala de reunião e a estrada não têm limite', () => {
    const office = new OfficeService();
    for (const id of ['a', 'b', 'c', 'd', 'e']) {
      office.join(id, id, `${id}@x.com`, appearance);
      Object.assign(office.players.get(id)!, tileCenter(6, 8));
      expect(
        office.move(id, tileCenter(6, 7).x, tileCenter(6, 7).y)[0]?.message
          .type,
      ).toBe('moved');
    }
    expect(office.occupants('lobby', 'sala-reuniao')).toBe(5);
  });
});

describe('OfficeService.join com o último lugar', () => {
  const seat = { map: 'lobby' as const, ...tileCenter(13, 13) };

  it('volta exatamente para onde a pessoa estava, até em outra sala', () => {
    const office = new OfficeService();
    office.join('a', 'Ana', 'a@x.com', appearance, seat);
    expect(office.players.get('a')).toMatchObject(seat);

    const upstairs = { map: 'andar-2' as const, ...tileCenter(5, 9) };
    office.join('b', 'Bia', 'b@x.com', appearance, upstairs);
    expect(office.players.get('b')).toMatchObject(upstairs);
  });

  it('lugar que não vale mais leva para a entrada', () => {
    const spawn = { map: 'lobby', ...lobby.spawn };
    for (const [i, start] of [
      null,
      { map: 'lobby' as const, x: 100, y: 101 },
      { map: 'lobby' as const, ...tileCenter(13, 12) },
      { map: 'lobby' as const, ...tileCenter(29, 9) },
      { map: 'sotao' as 'lobby', ...tileCenter(5, 5) },
    ].entries()) {
      const office = new OfficeService();
      office.join(`p${i}`, 'P', 'p@x.com', appearance, start);
      expect(office.players.get(`p${i}`)).toMatchObject(spawn);
    }
  });

  it('se o lugar da mesinha está ocupado ou a mesa está cheia, vai para a entrada', () => {
    const office = new OfficeService();
    office.join('a', 'Ana', 'a@x.com', appearance, seat);
    office.join('b', 'Bia', 'b@x.com', appearance, seat);
    expect(office.players.get('b')).toMatchObject(lobby.spawn);

    office.join('c', 'Caio', 'c@x.com', appearance, {
      map: 'lobby',
      ...tileCenter(14, 13),
    });
    office.join('d', 'Dani', 'd@x.com', appearance, {
      map: 'lobby',
      ...tileCenter(15, 13),
    });
    expect(office.occupants('lobby', 'mesa-7')).toBe(3);
  });

  it('mesa bloqueada pelo dono barra entrada de outros mas libera o dono', () => {
    const office = new OfficeService();
    office.setDeskLock({
      map: 'lobby',
      deskId: 'mesa-7',
      owner: { email: 'a@x.com', name: 'Ana', role: '' },
      config: {
        color: 0,
        rug: null,
        items: [],
        label: 'Mesa de Ana',
        computer: 'desktop',
        locked: true,
        position: null,
      },
    });

    // Dono pode começar e andar na própria mesa bloqueada.
    office.join('a', 'Ana', 'a@x.com', appearance, seat);
    expect(office.players.get('a')).toMatchObject(seat);

    // Outra pessoa não pode começar nem entrar em nenhum bloco da mesa bloqueada.
    office.join('b', 'Bia', 'b@x.com', appearance, {
      map: 'lobby',
      ...tileCenter(14, 13),
    });
    expect(office.players.get('b')).toMatchObject(lobby.spawn);

    const front = tileCenter(14, 14);
    office.players.get('b')!.x = front.x;
    office.players.get('b')!.y = front.y;
    const target = tileCenter(14, 13);
    expect(office.move('b', target.x, target.y)).toEqual([
      { to: 'self', message: { type: 'correct', x: front.x, y: front.y } },
      { to: 'self', message: { type: 'zoneLocked', zone: 'Mesa 7' } },
    ]);

    // Ao desbloquear, outra pessoa consegue entrar normalmente.
    office.setDeskLock({
      map: 'lobby',
      deskId: 'mesa-7',
      owner: { email: 'a@x.com', name: 'Ana', role: '' },
      config: {
        color: 0,
        rug: null,
        items: [],
        label: 'Mesa de Ana',
        computer: 'desktop',
        locked: false,
        position: null,
      },
    });
    expect(office.move('b', target.x, target.y)).toEqual([
      {
        to: 'others',
        map: 'lobby',
        message: { type: 'moved', id: 'b', x: target.x, y: target.y },
      },
    ]);
  });
});

describe('OfficeService.everyone', () => {
  it('everyone lista todas as salas, com o e-mail de cada um', () => {
    const office = new OfficeService();
    office.join('a', 'Ana', 'a@x.com', appearance);
    office.join('b', 'Bia', 'b@x.com', appearance);
    office.players.get('b')!.map = 'andar-2';
    expect(
      office
        .everyone()
        .map((p) => [p.email, p.map])
        .sort(),
    ).toEqual([
      ['a@x.com', 'lobby'],
      ['b@x.com', 'andar-2'],
    ]);
  });
});
