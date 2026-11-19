import { deskKey, type DeskInfo } from '@/shared/domain';
import { create } from 'zustand';

type DeskState = {
  /** Só as mesinhas com dono, por `deskKey(sala, mesa)`. As outras estão livres. */
  desks: Record<string, DeskInfo>;
  setAll: (desks: DeskInfo[]) => void;
  /** Aplica uma mudança: mesinha devolvida (sem dono) sai da lista. */
  upsert: (desk: DeskInfo) => void;
  reset: () => void;
};

export const useDeskStore = create<DeskState>((set) => ({
  desks: {},

  setAll: (list) =>
    set({
      desks: Object.fromEntries(
        list
          .filter((desk) => desk.owner !== null)
          .map((desk) => [deskKey(desk.map, desk.deskId), desk]),
      ),
    }),

  upsert: (desk) =>
    set((state) => {
      const key = deskKey(desk.map, desk.deskId);
      const desks = { ...state.desks };
      if (desk.owner) desks[key] = desk;
      else delete desks[key];
      return { desks };
    }),

  reset: () => set({ desks: {} }),
}));

/** A mesinha que a pessoa adotou, se houver. */
export const myDesk = (
  desks: Record<string, DeskInfo>,
  email: string,
): DeskInfo | undefined =>
  Object.values(desks).find((desk) => desk.owner?.email === email);
