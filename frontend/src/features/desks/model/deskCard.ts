import { DESK_CAPACITY, type DeskInfo } from '@/shared/domain';

export type DeskCardState =
  /** Mesa livre e a pessoa ainda não tem mesa: pode adotar. */
  | { kind: 'free'; name: string; people: number; canAdopt: true }
  /** Mesa livre, mas a pessoa já tem outra: precisa devolver a dela antes. */
  | { kind: 'free'; name: string; people: number; canAdopt: false }
  /** A mesa é da pessoa. */
  | { kind: 'mine'; name: string; people: number; locked: boolean }
  /** A mesa é de outra pessoa. `canRelease`: administradores podem devolvê-la. */
  | {
      kind: 'other';
      name: string;
      people: number;
      ownerName: string;
      /** Cargo do dono (pode ficar em branco). */
      ownerRole: string;
      locked: boolean;
      canRelease: boolean;
    };

type Input = {
  /** Nome da zona (ex.: "Mesa 7"). */
  name: string;
  /** Quantas pessoas estão na mesinha (inclusive eu). */
  people: number;
  info: DeskInfo | undefined;
  myEmail: string;
  iHaveDesk: boolean;
  isAdmin: boolean;
};

/** O que o cartão da mesinha deve oferecer a quem está sobre ela. */
export const deskCardState = ({
  name,
  people,
  info,
  myEmail,
  iHaveDesk,
  isAdmin,
}: Input): DeskCardState => {
  const owner = info?.owner;
  if (!owner) {
    return iHaveDesk
      ? { kind: 'free', name, people, canAdopt: false }
      : { kind: 'free', name, people, canAdopt: true };
  }
  const locked = info?.config.locked ?? false;
  if (owner.email === myEmail) return { kind: 'mine', name, people, locked };
  return {
    kind: 'other',
    name,
    people,
    ownerName: owner.name,
    ownerRole: owner.role,
    locked,
    canRelease: isAdmin,
  };
};

export const capacityText = (people: number): string =>
  `${Math.min(people, DESK_CAPACITY)}/${DESK_CAPACITY}`;
