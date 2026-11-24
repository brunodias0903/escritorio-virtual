import type { AccountTier, ChatMessage } from '../../shared/domain/index.js';

export type ChannelRow = {
  id: string;
  name: string;
  kind: 'public' | 'dm';
  archived: boolean;
  position?: number;
  topic?: string;
  viewTiers?: AccountTier[];
  writeTiers?: AccountTier[];
  allowedEmails?: string[];
  blockedEmails?: string[];
  createdBy: string | null;
  createdAt: number;
};

/** Canais públicos e conversas diretas. */
export interface ChannelRepository {
  get(id: string): Promise<ChannelRow | undefined>;
  /** Canais públicos (inclusive arquivados). Conversas diretas ficam de fora. */
  listPublic(): Promise<ChannelRow[]>;
  /** Conversas diretas que têm este e-mail como uma das pessoas. */
  listDirect(email: string): Promise<ChannelRow[]>;
  /** Cria o canal. Devolve false se o id ou o nome já existe. */
  create(channel: ChannelRow): Promise<boolean>;
  setArchived(id: string, archived: boolean): Promise<boolean>;
  updateConfig?(
    id: string,
    patch: {
      topic?: string;
      viewTiers?: AccountTier[];
      writeTiers?: AccountTier[];
      allowedEmails?: string[];
      blockedEmails?: string[];
      archived?: boolean;
    },
  ): Promise<boolean>;
  reorder?(orderedIds: string[]): Promise<void>;
}

/** Histórico de mensagens do chat. */
export interface ChatRepository {
  /** Grava a mensagem. Gravar o mesmo id duas vezes não duplica. */
  save(message: ChatMessage): Promise<void>;
  byId(id: string): Promise<ChatMessage | undefined>;
  /**
   * As últimas `limit` mensagens que abrem conversa em cada canal, da mais
   * antiga para a mais nova, já com o número de respostas.
   */
  recentRoots(channels: string[], limit: number): Promise<ChatMessage[]>;
  /** Respostas de uma conversa, da mais antiga para a mais nova. */
  replies(threadId: string): Promise<ChatMessage[]>;
  /** Mensagens de outras pessoas depois de `since`, e quantas citam `email`. */
  countSince(
    channel: string,
    since: number,
    email: string,
  ): Promise<{ unread: number; mentions: number }>;
}

/** Até onde cada pessoa leu cada canal. */
export interface ReadStateRepository {
  all(email: string): Promise<Map<string, number>>;
  set(email: string, channel: string, readAt: number): Promise<void>;
}
