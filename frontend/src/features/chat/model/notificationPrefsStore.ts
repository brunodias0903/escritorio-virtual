import { create } from 'zustand';

import type { ChannelInfo } from '@/shared/domain';

import { totalMentions, totalUnread } from './chatStore';

export type ChatNotifyMode =
  'all' | 'mentions_and_dms' | 'mentions_only' | 'dms_only' | 'muted';

export const CHAT_NOTIFY_MODES: { value: ChatNotifyMode; label: string }[] = [
  { value: 'all', label: 'Todas as mensagens (canais e DMs)' },
  {
    value: 'mentions_and_dms',
    label: 'Menções (@) nos canais + todas as DMs',
  },
  { value: 'dms_only', label: 'Somente mensagens diretas (DMs)' },
  { value: 'mentions_only', label: 'Somente menções (@)' },
  { value: 'muted', label: 'Silenciado (sem contador nem som)' },
];

const STORAGE_KEY = 'ev.chat.notifyMode';

export const readSavedNotifyMode = (): ChatNotifyMode => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (
      raw === 'all' ||
      raw === 'mentions_and_dms' ||
      raw === 'mentions_only' ||
      raw === 'dms_only' ||
      raw === 'muted'
    ) {
      return raw;
    }
  } catch {
    // ignore storage errors
  }
  return 'all';
};

type NotificationPrefsState = {
  mode: ChatNotifyMode;
  setMode: (mode: ChatNotifyMode) => void;
};

export const useNotificationPrefsStore = create<NotificationPrefsState>(
  (set) => ({
    mode: typeof window !== 'undefined' ? readSavedNotifyMode() : 'all',
    setMode: (mode) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // ignore storage errors
      }
      set({ mode });
    },
  }),
);

/** Calcula os contadores de notificação para o ícone do servidor e título conforme a preferência do usuário. */
export function effectiveNotificationCounts(
  channels: ChannelInfo[],
  mode: ChatNotifyMode,
): {
  channelUnread: number;
  channelMentions: number;
  dmUnread: number;
  dmMentions: number;
  totalUnread: number;
  totalMentions: number;
} {
  const pub = channels.filter((c) => c.kind === 'public');
  const dms = channels.filter((c) => c.kind === 'dm');
  const rawPubUnread = totalUnread(pub);
  const rawPubMentions = totalMentions(pub);
  const rawDmUnread = totalUnread(dms);
  const rawDmMentions = totalMentions(dms);

  switch (mode) {
    case 'muted':
      return {
        channelUnread: 0,
        channelMentions: 0,
        dmUnread: 0,
        dmMentions: 0,
        totalUnread: 0,
        totalMentions: 0,
      };
    case 'mentions_only':
      return {
        channelUnread: rawPubMentions,
        channelMentions: rawPubMentions,
        dmUnread: rawDmMentions,
        dmMentions: rawDmMentions,
        totalUnread: rawPubMentions + rawDmMentions,
        totalMentions: rawPubMentions + rawDmMentions,
      };
    case 'mentions_and_dms':
      return {
        channelUnread: rawPubMentions,
        channelMentions: rawPubMentions,
        dmUnread: rawDmUnread,
        dmMentions: rawDmMentions,
        totalUnread: rawPubMentions + rawDmUnread,
        totalMentions: rawPubMentions + rawDmMentions,
      };
    case 'dms_only':
      return {
        channelUnread: 0,
        channelMentions: 0,
        dmUnread: rawDmUnread,
        dmMentions: rawDmMentions,
        totalUnread: rawDmUnread,
        totalMentions: rawDmMentions,
      };
    case 'all':
    default:
      return {
        channelUnread: rawPubUnread,
        channelMentions: rawPubMentions,
        dmUnread: rawDmUnread,
        dmMentions: rawDmMentions,
        totalUnread: rawPubUnread + rawDmUnread,
        totalMentions: rawPubMentions + rawDmMentions,
      };
  }
}
