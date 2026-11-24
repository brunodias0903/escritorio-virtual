import type { ChannelInfo } from '@/shared/domain';
import { describe, expect, it } from 'vitest';
import {
  effectiveNotificationCounts,
  readSavedNotifyMode,
  useNotificationPrefsStore,
} from './notificationPrefsStore';

const sample: ChannelInfo[] = [
  {
    id: 'geral',
    name: 'geral',
    kind: 'public',
    archived: false,
    members: [],
    unread: 5,
    mentions: 1,
  },
  {
    id: 'dm:a|b',
    name: 'dm:a|b',
    kind: 'dm',
    archived: false,
    members: [],
    unread: 3,
    mentions: 2,
  },
];

describe('effectiveNotificationCounts', () => {
  it('filtra contadores conforme preferência de notificação', () => {
    expect(effectiveNotificationCounts(sample, 'all')).toMatchObject({
      totalUnread: 8,
      totalMentions: 3,
    });
    expect(
      effectiveNotificationCounts(sample, 'mentions_and_dms'),
    ).toMatchObject({
      channelUnread: 1,
      dmUnread: 3,
      totalUnread: 4,
      totalMentions: 3,
    });
    expect(effectiveNotificationCounts(sample, 'dms_only')).toMatchObject({
      channelUnread: 0,
      dmUnread: 3,
      totalUnread: 3,
      totalMentions: 2,
    });
    expect(effectiveNotificationCounts(sample, 'mentions_only')).toMatchObject({
      totalUnread: 3,
      totalMentions: 3,
    });
    expect(effectiveNotificationCounts(sample, 'muted')).toMatchObject({
      totalUnread: 0,
      totalMentions: 0,
    });
  });

  it('atualiza e lê o modo de notificação salvo', () => {
    expect(readSavedNotifyMode()).toBe('all');
    useNotificationPrefsStore.getState().setMode('mentions_only');
    expect(useNotificationPrefsStore.getState().mode).toBe('mentions_only');

    const storage = new Map<string, string>([
      ['ev.chat.notifyMode', 'dms_only'],
    ]);
    (globalThis as unknown as { window?: unknown }).window = {
      localStorage: {
        getItem: (k: string) => storage.get(k) ?? null,
        setItem: (k: string, v: string) => storage.set(k, v),
      },
    };
    expect(readSavedNotifyMode()).toBe('dms_only');
    storage.set('ev.chat.notifyMode', 'invalid');
    expect(readSavedNotifyMode()).toBe('all');
    delete (globalThis as unknown as { window?: unknown }).window;

    useNotificationPrefsStore.getState().setMode('all');
    expect(useNotificationPrefsStore.getState().mode).toBe('all');
  });
});
