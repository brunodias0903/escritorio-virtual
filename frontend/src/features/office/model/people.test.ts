import { defaultDeskConfig, type DeskInfo, type Person } from '@/shared/domain';
import { describe, expect, it } from 'vitest';

import { peopleList } from './people';

const person = (name: string, status: Person['status'], role = ''): Person => ({
  email: `${name.split(' ')[0]!.toLowerCase()}@empresa.com`,
  name,
  nickname: name.split(' ')[0]!.toLowerCase(),
  role,
  status,
  appearance: null,
  map: status === 'offline' ? null : 'lobby',
});

const desk = (deskId: string, email: string): DeskInfo => ({
  map: 'lobby',
  deskId,
  owner: { email, name: email, role: '' },
  config: defaultDeskConfig(email),
});

describe('peopleList', () => {
  const people = [
    person('Caio Dias', 'offline'),
    person('Ana Souza', 'busy', 'Designer'),
    person('Bia Lima', 'available'),
    person('Davi Melo', 'away'),
  ];
  const desks = {
    'lobby:mesa-1': desk('mesa-1', 'bia@empresa.com'),
  };

  it('eu no topo; os outros por status e nome', () => {
    const { me, others } = peopleList(people, desks, 'caio@empresa.com');
    expect(me?.person.name).toBe('Caio Dias');
    expect(others.map((r) => r.person.name)).toEqual([
      'Bia Lima',
      'Ana Souza',
      'Davi Melo',
    ]);
  });

  it('liga cada pessoa à mesinha que adotou', () => {
    const { others } = peopleList(people, desks, 'x@empresa.com');
    expect(others.find((r) => r.person.name === 'Bia Lima')?.desk?.deskId).toBe(
      'mesa-1',
    );
    expect(
      others.find((r) => r.person.name === 'Ana Souza')?.desk,
    ).toBeUndefined();
  });

  it('a busca filtra os outros, mas eu continuo no topo', () => {
    const { me, others } = peopleList(
      people,
      desks,
      'caio@empresa.com',
      'design',
    );
    expect(me).not.toBeNull();
    expect(others.map((r) => r.person.name)).toEqual(['Ana Souza']);
  });
});
