import { beforeEach, describe, expect, it } from 'vitest';

import { usePeopleStore } from './peopleStore';

describe('peopleStore', () => {
  beforeEach(() => usePeopleStore.getState().reset());

  it('guarda e limpa a lista de pessoas', () => {
    usePeopleStore.getState().setPeople([
      {
        email: 'ana@empresa.com',
        name: 'Ana Silva',
        nickname: 'ana',
        role: 'Dev',
        status: 'available',
        appearance: null,
        map: 'lobby',
      },
    ]);
    expect(usePeopleStore.getState().people).toHaveLength(1);

    usePeopleStore.getState().reset();
    expect(usePeopleStore.getState().people).toEqual([]);
  });
});
