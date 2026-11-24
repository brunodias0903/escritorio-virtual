import {
  CHAT_HISTORY_LIMIT,
  DEFAULT_CHANNEL,
  type ChannelInfo,
  type ChatMessage,
} from '@/shared/domain';
import { create } from 'zustand';

export type Person = { email: string; name: string };

type ChatState = {
  /** E-mail de quem está usando o app (para não contar as próprias mensagens). */
  me: string | null;
  channels: ChannelInfo[];
  /** Mensagens que abrem conversa, por canal. As respostas ficam em `thread`. */
  messages: Record<string, ChatMessage[]>;
  active: string;
  /** Painel visível. Mensagens lidas só contam como lidas com ele aberto. */
  panelOpen: boolean;
  thread: { rootId: string; messages: ChatMessage[] } | null;
  people: Person[];
  typingByChannel: Record<string, Record<string, { name: string; at: number }>>;
  /** Código do último erro do chat (veja `errorMessage`). */
  error: string | null;
  setMe: (email: string) => void;
  setChannels: (channels: ChannelInfo[]) => void;
  /** Reordena os canais públicos localmente (otimista) enquanto salva no servidor. */
  reorderPublicChannels: (orderedIds: string[]) => void;
  /** Acrescenta o canal à lista, se ainda não estiver (ex.: conversa recém-aberta). */
  addChannel: (channel: ChannelInfo) => void;
  setHistory: (messages: ChatMessage[]) => void;
  /** Devolve 'unknown-channel' quando o canal ainda não está na lista (peça a lista de novo). */
  receive: (message: ChatMessage) => 'ok' | 'unknown-channel';
  updateMessage: (message: ChatMessage) => void;
  setTyping: (
    channel: string,
    userId: string,
    name: string,
    typing: boolean,
  ) => void;
  setActive: (channel: string) => void;
  setPanelOpen: (open: boolean) => void;
  openThread: (rootId: string) => void;
  setThread: (rootId: string, messages: ChatMessage[]) => void;
  closeThread: () => void;
  setPeople: (people: Person[]) => void;
  setError: (code: string | null) => void;
  reset: () => void;
};

const initial = () => ({
  me: null as string | null,
  channels: [] as ChannelInfo[],
  messages: {} as Record<string, ChatMessage[]>,
  active: DEFAULT_CHANNEL,
  panelOpen: false,
  thread: null as ChatState['thread'],
  people: [] as Person[],
  typingByChannel: {} as ChatState['typingByChannel'],
  error: null as string | null,
});

const capped = (list: ChatMessage[]) => list.slice(-CHAT_HISTORY_LIMIT);

const clearCounts = (channels: ChannelInfo[], id: string): ChannelInfo[] =>
  channels.map((c) => (c.id === id ? { ...c, unread: 0, mentions: 0 } : c));

export const useChatStore = create<ChatState>((set, get) => ({
  ...initial(),

  setMe: (email) => set({ me: email }),

  setChannels: (channels) =>
    set((state) => {
      const stillThere = channels.some((c) => c.id === state.active);
      const active = stillThere
        ? state.active
        : (channels[0]?.id ?? DEFAULT_CHANNEL);
      const visible = state.panelOpen
        ? clearCounts(channels, active)
        : channels;
      return { channels: visible, active };
    }),

  reorderPublicChannels: (orderedIds) =>
    set((state) => {
      const publicMap = new Map(
        state.channels
          .filter((c) => c.kind === 'public')
          .map((c) => [c.id, c] as const),
      );
      const dms = state.channels.filter((c) => c.kind === 'dm');
      const reordered: ChannelInfo[] = [];
      for (const id of orderedIds) {
        const ch = publicMap.get(id);
        if (ch) {
          reordered.push({ ...ch, position: reordered.length });
          publicMap.delete(id);
        }
      }
      for (const ch of publicMap.values()) {
        reordered.push({ ...ch, position: reordered.length });
      }
      return { channels: [...reordered, ...dms] };
    }),

  addChannel: (channel) =>
    set((state) =>
      state.channels.some((c) => c.id === channel.id)
        ? state
        : { channels: [...state.channels, channel] },
    ),

  setHistory: (history) =>
    set(() => {
      const messages: Record<string, ChatMessage[]> = {};
      for (const message of history) {
        messages[message.channel] = capped([
          ...(messages[message.channel] ?? []),
          message,
        ]);
      }
      return { messages };
    }),

  receive: (message) => {
    const state = get();
    const known = state.channels.some((c) => c.id === message.channel);
    const mine = message.authorId === state.me;
    const seen = state.panelOpen && state.active === message.channel;

    set((current) => {
      const list = current.messages[message.channel] ?? [];
      let messages = current.messages;

      if (message.threadId) {
        messages = {
          ...messages,
          [message.channel]: list.map((m) =>
            m.id === message.threadId
              ? { ...m, replyCount: m.replyCount + 1 }
              : m,
          ),
        };
      } else if (!list.some((m) => m.id === message.id)) {
        messages = {
          ...messages,
          [message.channel]: capped([...list, message]),
        };
      }

      const thread =
        message.threadId &&
        current.thread?.rootId === message.threadId &&
        !current.thread.messages.some((m) => m.id === message.id)
          ? {
              ...current.thread,
              messages: [...current.thread.messages, message],
            }
          : current.thread;

      const channels =
        mine || seen
          ? current.channels
          : current.channels.map((c) =>
              c.id === message.channel
                ? {
                    ...c,
                    unread: c.unread + 1,
                    mentions:
                      c.mentions +
                      (state.me && message.mentions.includes(state.me) ? 1 : 0),
                  }
                : c,
            );

      const prevTyping = current.typingByChannel[message.channel];
      const nextTyping =
        prevTyping && prevTyping[message.authorId]
          ? (() => {
              const copy = { ...prevTyping };
              delete copy[message.authorId];
              return { ...current.typingByChannel, [message.channel]: copy };
            })()
          : current.typingByChannel;

      return { messages, thread, channels, typingByChannel: nextTyping };
    });
    return known ? 'ok' : 'unknown-channel';
  },

  updateMessage: (message) =>
    set((current) => {
      const list = current.messages[message.channel] ?? [];
      const messages = {
        ...current.messages,
        [message.channel]: list.map((m) =>
          m.id === message.id ? { ...m, ...message } : m,
        ),
      };
      const thread = current.thread
        ? {
            ...current.thread,
            messages: current.thread.messages.map((m) =>
              m.id === message.id ? { ...m, ...message } : m,
            ),
          }
        : null;
      return { messages, thread };
    }),

  setTyping: (channel, userId, name, typing) =>
    set((current) => {
      const prev = current.typingByChannel[channel] ?? {};
      const next = { ...prev };
      if (typing) {
        next[userId] = { name, at: Date.now() };
      } else {
        delete next[userId];
      }
      return {
        typingByChannel: { ...current.typingByChannel, [channel]: next },
      };
    }),

  setActive: (channel) =>
    set((state) => ({
      active: channel,
      thread: null,
      channels: state.panelOpen
        ? clearCounts(state.channels, channel)
        : state.channels,
    })),

  setPanelOpen: (open) =>
    set((state) => ({
      panelOpen: open,
      channels: open
        ? clearCounts(state.channels, state.active)
        : state.channels,
    })),

  openThread: (rootId) =>
    set((state) => {
      const root = (state.messages[state.active] ?? []).find(
        (m) => m.id === rootId,
      );
      return { thread: { rootId, messages: root ? [root] : [] } };
    }),

  setThread: (rootId, messages) => set({ thread: { rootId, messages } }),

  closeThread: () => set({ thread: null }),

  setPeople: (people) => set({ people }),

  setError: (error) => set({ error }),

  reset: () => set(initial()),
}));

export const totalUnread = (channels: ChannelInfo[]): number =>
  channels.reduce((sum, c) => sum + c.unread, 0);

export const totalMentions = (channels: ChannelInfo[]): number =>
  channels.reduce((sum, c) => sum + c.mentions, 0);

/** Nome mostrado de um canal: `# nome` ou o nome da outra pessoa na conversa direta. */
export const channelTitle = (
  channel: ChannelInfo,
  me: string | null,
): string => {
  if (channel.kind === 'public') return channel.name;
  const other =
    channel.members.find((m) => m.email !== me) ?? channel.members[0];
  return other?.name ?? channel.name;
};
