import type { Person } from '@/shared/domain';
import { create } from 'zustand';

type PeopleState = {
  /** Todas as pessoas que já entraram, já em ordem (online primeiro). */
  people: Person[];
  setPeople: (people: Person[]) => void;
  reset: () => void;
};

/** Lista de pessoas: usada na aba Pessoas e nas menções (@) do chat. */
export const usePeopleStore = create<PeopleState>((set) => ({
  people: [],
  setPeople: (people) => set({ people }),
  reset: () => set({ people: [] }),
}));
