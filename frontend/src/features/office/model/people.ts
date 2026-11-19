import {
  matchesPerson,
  sortPeople,
  type DeskInfo,
  type Person,
  type PersonStatus,
} from '@/shared/domain';

export const PERSON_STATUS_COLORS: Record<PersonStatus, string> = {
  available: '#31e0c1',
  busy: '#ff6b81',
  away: '#f1c40f',
  offline: '#6b72a8',
};

/** Uma pessoa na lista, com a mesinha dela (se adotou uma). */
export type PersonRow = { person: Person; desk: DeskInfo | undefined };

/**
 * Lista de pessoas: eu primeiro, separado; os outros na ordem de status
 * (disponível, ocupado, ausente, offline) e nome, filtrados pela busca.
 */
export const peopleList = (
  people: readonly Person[],
  desks: Record<string, DeskInfo>,
  myEmail: string,
  query = '',
): { me: PersonRow | null; others: PersonRow[] } => {
  const byOwner = new Map(
    Object.values(desks)
      .filter((desk) => desk.owner)
      .map((desk) => [desk.owner!.email, desk]),
  );
  const row = (person: Person): PersonRow => ({
    person,
    desk: byOwner.get(person.email),
  });
  const mine = people.find((p) => p.email === myEmail);
  return {
    me: mine ? row(mine) : null,
    others: sortPeople(
      people.filter((p) => p.email !== myEmail && matchesPerson(p, query)),
    ).map(row),
  };
};
