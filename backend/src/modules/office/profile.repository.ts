import type { Appearance, MapId } from '../../shared/domain/index.js';

export type SavedPosition = { map: MapId; x: number; y: number };

export type Profile = {
  email: string;
  name: string;
  appearance: Appearance | null;
  lastSeen: number;
  /** Onde a pessoa estava ao sair da última vez (null se nunca saiu). */
  position: SavedPosition | null;
};

/** Quem já entrou no app: aparência escolhida, última posição e diretório de pessoas. */
export interface ProfileRepository {
  get(email: string): Promise<Profile | undefined>;
  /** Cria ou atualiza o nome e a hora do último acesso. Não mexe na aparência. */
  touch(email: string, name: string, at: number): Promise<void>;
  setAppearance(email: string, appearance: Appearance): Promise<void>;
  /** Guarda onde a pessoa está em um servidor, para ela voltar ao mesmo lugar ao entrar de novo. */
  setPosition(
    email: string,
    position: SavedPosition,
    serverId?: string,
  ): Promise<void>;
  /** Recupera a última posição salva da pessoa no servidor informado. */
  getPosition(email: string, serverId?: string): Promise<SavedPosition | null>;
  /** Perfis cujo início do e-mail (antes do @) está na lista. */
  byHandles(handles: string[]): Promise<Profile[]>;
  directory(limit: number): Promise<Profile[]>;
}
