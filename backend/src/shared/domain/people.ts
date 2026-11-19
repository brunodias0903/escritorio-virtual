import { z } from 'zod';
import { AppearanceSchema, StatusSchema } from './appearance.js';
import { MapIdSchema } from './maps.js';

/** Status na lista de pessoas: os três do escritório e "offline". */
export const PersonStatusSchema = z.union([StatusSchema, z.literal('offline')]);
export type PersonStatus = z.infer<typeof PersonStatusSchema>;

/** Alguém que já entrou no sistema, online ou não. */
export const PersonSchema = z.object({
  email: z.string(),
  /** Nome completo (o que aparece). */
  name: z.string(),
  nickname: z.string(),
  role: z.string(),
  status: PersonStatusSchema,
  appearance: AppearanceSchema.nullable(),
  /** Sala onde está, se estiver online. */
  map: MapIdSchema.nullable(),
});
export type Person = z.infer<typeof PersonSchema>;

/** Ordem da lista: disponível, ocupado, ausente e, por último, offline. */
const STATUS_ORDER: Record<PersonStatus, number> = {
  available: 0,
  busy: 1,
  away: 2,
  offline: 3,
};

export const PERSON_STATUS_LABELS: Record<PersonStatus, string> = {
  available: 'Disponível',
  busy: 'Ocupado',
  away: 'Ausente',
  offline: 'Offline',
};

/** Ordena por status (online primeiro) e, dentro de cada um, pelo nome. */
export const sortPeople = <T extends Pick<Person, 'status' | 'name'>>(
  people: readonly T[],
): T[] =>
  [...people].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
  );

/** Sem acentos e em minúsculas: "José" acha "jose". */
const fold = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/** A pessoa combina com a busca pelo nome, nickname, e-mail ou cargo? */
export const matchesPerson = (
  person: Pick<Person, 'name' | 'nickname' | 'email' | 'role'>,
  query: string,
): boolean => {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fold(
    [person.name, person.nickname, person.email, person.role].join(' '),
  );
  return words.every((word) => haystack.includes(word));
};

/** Quantas pessoas estão online (disponível, ocupado ou ausente). */
export const onlineCount = (
  people: readonly Pick<Person, 'status'>[],
): number => people.filter((p) => p.status !== 'offline').length;
