import { describe, expect, it } from 'vitest';
import {
  matchesPerson,
  onlineCount,
  sortPeople,
  type Person,
} from './people.js';

const person = (
  name: string,
  status: Person['status'],
  extra: Partial<Person> = {},
): Person => ({
  email: `${name.toLowerCase().replace(/\s+/g, '.')}@empresa.com`,
  name,
  nickname: name.toLowerCase().split(' ')[0]!,
  role: '',
  status,
  appearance: null,
  map: status === 'offline' ? null : 'lobby',
  ...extra,
});

describe('sortPeople', () => {
  it('online primeiro, depois ocupado, ausente e offline; cada grupo por nome', () => {
    const sorted = sortPeople([
      person('Zeca Lima', 'offline'),
      person('Bia Rocha', 'away'),
      person('Caio Dias', 'busy'),
      person('Ana Souza', 'offline'),
      person('Davi Melo', 'available'),
      person('Ágata Reis', 'available'),
    ]);
    expect(sorted.map((p) => p.name)).toEqual([
      'Ágata Reis',
      'Davi Melo',
      'Caio Dias',
      'Bia Rocha',
      'Ana Souza',
      'Zeca Lima',
    ]);
  });
});

describe('matchesPerson', () => {
  const bruno = person('Bruno Dias', 'available', {
    nickname: 'bruno.dias',
    role: 'Desenvolvedor Mobile',
  });

  it('acha pelo nome, nickname, e-mail ou cargo, sem acento nem maiúscula', () => {
    for (const query of ['bruno', 'DIAS', 'bruno.dias', 'empresa', 'mobile']) {
      expect(matchesPerson(bruno, query)).toBe(true);
    }
    expect(matchesPerson({ ...bruno, name: 'José Silva' }, 'jose')).toBe(true);
  });

  it('todas as palavras precisam aparecer', () => {
    expect(matchesPerson(bruno, 'bruno mobile')).toBe(true);
    expect(matchesPerson(bruno, 'bruno design')).toBe(false);
  });

  it('busca vazia mostra todos', () => {
    expect(matchesPerson(bruno, '   ')).toBe(true);
  });
});

describe('onlineCount', () => {
  it('conta disponível, ocupado e ausente; offline não', () => {
    expect(
      onlineCount([
        person('A A', 'available'),
        person('B B', 'busy'),
        person('C C', 'away'),
        person('D D', 'offline'),
      ]),
    ).toBe(3);
  });
});
