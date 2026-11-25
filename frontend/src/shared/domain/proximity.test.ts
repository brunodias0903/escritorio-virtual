import { describe, expect, it } from 'vitest';
import { getMap } from './maps';
import {
  callKey,
  callRoomName,
  callZoneId,
  canHear,
  isNear,
  isNearCall,
} from './proximity';

const lobby = getMap('lobby');
const road = { x: 496, y: 560 };

describe('callZoneId', () => {
  it('acha a mesa e a sala de reunião', () => {
    expect(callZoneId(lobby, { x: 432, y: 176 })).toBe('mesa-1');
    expect(callZoneId(lobby, { x: 592, y: 176 })).toBe('mesa-2');
    expect(callZoneId(lobby, { x: 432, y: 432 })).toBe('mesa-7');
    expect(callZoneId(lobby, { x: 112, y: 112 })).toBe('sala-reuniao');
  });

  it('na estrada não há zona', () => {
    expect(callZoneId(lobby, road)).toBeNull();
    expect(callZoneId(lobby, lobby.spawn)).toBeNull();
  });

  it('só os 3 quadradinhos da frente da mesa contam', () => {
    // Ao lado, abaixo da zona e na mesa em si: estrada.
    expect(callZoneId(lobby, { x: 400, y: 176 })).toBeNull();
    expect(callZoneId(lobby, { x: 528, y: 176 })).toBeNull();
    expect(callZoneId(lobby, { x: 432, y: 208 })).toBeNull();
    expect(callZoneId(lobby, { x: 432, y: 144 })).toBeNull();
  });
});

describe('canHear', () => {
  it('só quem está na mesma zona se ouve', () => {
    expect(canHear(lobby, { x: 432, y: 176 }, { x: 496, y: 176 })).toBe(true);
    expect(canHear(lobby, { x: 80, y: 80 }, { x: 304, y: 208 })).toBe(true);
  });

  it('quem está em outra zona ou na estrada não se ouve, mesmo encostado', () => {
    expect(canHear(lobby, { x: 496, y: 176 }, { x: 528, y: 176 })).toBe(false);
    expect(canHear(lobby, { x: 496, y: 176 }, { x: 592, y: 176 })).toBe(false);
    expect(canHear(lobby, road, { x: 496, y: 464 })).toBe(false);
    expect(canHear(lobby, { x: 208, y: 240 }, { x: 208, y: 304 })).toBe(false);
  });

  it('duas pessoas na estrada não se ouvem', () => {
    expect(canHear(lobby, road, { x: 528, y: 560 })).toBe(false);
  });
});

describe('callRoomName', () => {
  it('é única por mapa e por zona', () => {
    expect(callRoomName('lobby', 'mesa-1')).toBe('zone:lobby:mesa-1');
    expect(callRoomName('lobby', 'mesa-1')).not.toBe(
      callRoomName('andar-2', 'mesa-1'),
    );
    expect(callRoomName('lobby', 'mesa-1')).not.toBe(
      callRoomName('lobby', 'mesa-2'),
    );
  });
});

describe('callKey', () => {
  const at = (id: string, x: number, y: number) => ({ id, x, y });
  // Estrada da recepção, linha 17: x = 496, 528, 560...
  const a = at('a', 496, 560);

  it('sozinho na estrada não há chamada', () => {
    expect(callKey(lobby, a, [a])).toBeNull();
    expect(callKey(lobby, a, [a, at('b', 560, 560)])).toBeNull();
  });

  it('ao lado ou na diagonal, conversa', () => {
    expect(callKey(lobby, a, [a, at('b', 528, 560)])).toBe('perto-a');
    expect(callKey(lobby, a, [a, at('b', 528, 528)])).toBe('perto-a');
    expect(isNear({ x: 0, y: 0 }, { x: 32, y: 32 })).toBe(true);
    expect(isNear({ x: 0, y: 0 }, { x: 64, y: 0 })).toBe(false);
  });

  it('em corrente, todos ficam na mesma conversa, com o mesmo nome', () => {
    const b = at('b', 528, 560);
    const c = at('c', 560, 560);
    const everyone = [c, b, a];
    expect(callKey(lobby, a, everyone)).toBe('perto-a');
    expect(callKey(lobby, c, everyone)).toBe('perto-a');
    expect(isNearCall('perto-a')).toBe(true);
    expect(isNearCall('mesa-1')).toBe(false);
    expect(isNearCall(null)).toBe(false);
  });

  it('na zona vale a zona, e quem está numa zona não entra na conversa da estrada', () => {
    const seat = at('s', 432, 432); // mesa 7
    const below = at('b', 432, 464); // estrada logo abaixo
    expect(callKey(lobby, seat, [seat, below])).toBe('mesa-7');
    expect(callKey(lobby, below, [seat, below])).toBeNull();
  });

  it('quem está tomando café, almoçando ou ocupado não entra em chamadas nem inicia conversa por perto', () => {
    const coffee = { ...at('b', 528, 560), status: 'coffee' as const };
    const lunch = { ...at('c', 528, 560), status: 'lunch' as const };
    expect(callKey(lobby, a, [a, coffee])).toBeNull();
    expect(callKey(lobby, coffee, [a, coffee])).toBeNull();
    expect(callKey(lobby, a, [a, lunch])).toBeNull();
    expect(callKey(lobby, lunch, [a, lunch])).toBeNull();
  });
});
