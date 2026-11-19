import { defaultDeskConfig, deskKey, type DeskInfo } from '@/shared/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import { myDesk, useDeskStore } from './deskStore';

const owned = (
  deskId: string,
  email: string,
  map: DeskInfo['map'] = 'lobby',
): DeskInfo => ({
  map,
  deskId,
  owner: { email, name: email.split('@')[0]!, role: '' },
  config: defaultDeskConfig(email),
});

const freed = (deskId: string, map: DeskInfo['map'] = 'lobby'): DeskInfo => ({
  map,
  deskId,
  owner: null,
  config: defaultDeskConfig('x'),
});

const state = () => useDeskStore.getState();

beforeEach(() => state().reset());

describe('useDeskStore', () => {
  it('carrega só as mesas com dono', () => {
    state().setAll([owned('mesa-1', 'a@x.com'), freed('mesa-2')]);
    expect(Object.keys(state().desks)).toEqual([deskKey('lobby', 'mesa-1')]);
  });

  it('adotar e decorar trocam a entrada da mesa', () => {
    state().upsert(owned('mesa-1', 'a@x.com'));
    const decorated = {
      ...owned('mesa-1', 'a@x.com'),
      config: { ...defaultDeskConfig('a'), color: 3 },
    };
    state().upsert(decorated);
    expect(Object.values(state().desks)).toEqual([decorated]);
  });

  it('devolver tira a mesa da lista, sem mexer nas outras', () => {
    state().upsert(owned('mesa-1', 'a@x.com'));
    state().upsert(owned('mesa-1', 'b@x.com', 'andar-2'));
    state().upsert(freed('mesa-1'));
    expect(Object.keys(state().desks)).toEqual([deskKey('andar-2', 'mesa-1')]);
  });

  it('mesas de salas diferentes com o mesmo id não se misturam', () => {
    state().upsert(owned('mesa-1', 'a@x.com', 'lobby'));
    state().upsert(owned('mesa-1', 'b@x.com', 'andar-2'));
    expect(Object.keys(state().desks)).toHaveLength(2);
  });
});

describe('myDesk', () => {
  it('acha a mesa da pessoa', () => {
    state().setAll([owned('mesa-1', 'a@x.com'), owned('mesa-2', 'b@x.com')]);
    expect(myDesk(state().desks, 'b@x.com')?.deskId).toBe('mesa-2');
    expect(myDesk(state().desks, 'c@x.com')).toBeUndefined();
  });
});
