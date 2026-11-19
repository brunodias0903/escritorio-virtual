import type { DeskConfig } from '../../shared/domain/index.js';

/** Mesinha adotada: de quem é e como está decorada. */
export type DeskRecord = {
  map: string;
  deskId: string;
  ownerEmail: string;
  ownerName: string;
  /** Cargo do dono (pode ficar em branco). */
  ownerRole: string;
  config: DeskConfig;
  updatedAt: number;
};

/** Mesinhas adotadas. Mesinha livre é a que não tem registro. */
export interface DeskRepository {
  all(): Promise<DeskRecord[]>;
  get(map: string, deskId: string): Promise<DeskRecord | undefined>;
  byOwner(email: string): Promise<DeskRecord | undefined>;
  /** Adota. Devolve false se a mesa já tem dono ou se a pessoa já tem outra mesa. */
  adopt(record: DeskRecord): Promise<boolean>;
  release(map: string, deskId: string): Promise<boolean>;
  setConfig(
    map: string,
    deskId: string,
    config: DeskConfig,
    at: number,
  ): Promise<boolean>;
  /** A pessoa mudou o nome ou o cargo: atualiza a mesa dela, se tiver. */
  setOwner(email: string, name: string, role: string): Promise<boolean>;
}
