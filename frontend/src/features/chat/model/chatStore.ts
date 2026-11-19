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
  /** Código do último erro do chat (veja `errorMessage`). */
  error: string | null;
  setMe: (email: string) => void;
  setChannels: (channels: ChannelInfo[]) => void;
  /** Acrescenta o canal à lista, se ainda não estiver (ex.: conversa recém-aberta). */
  addChannel: (channel: ChannelInfo) => void;
  setHistory: (messages: ChatMessage[]) => void;
  /** Devolve 'unknown-channel' quando o canal ainda não está na lista (peça a lista de novo). */
  receive: (message: ChatMessage) => 'ok' | 'unknown-channel';
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

      return { messages, thread, channels };
    });
    return known ? 'ok' : 'unknown-channel';
  },

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
