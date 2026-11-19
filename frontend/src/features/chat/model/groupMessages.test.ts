import type { ChatMessage } from '@/shared/domain';
import { describe, expect, it } from 'vitest';
import { GROUP_WINDOW_MS, groupMessages } from './groupMessages';

const msg = (authorId: string, at: number): ChatMessage => ({
  id: `${authorId}${at}`,
  channel: 'geral',
  authorId,
  author: authorId,
  color: 0,
  text: 'oi',
  at,
  mentions: [],
  replyCount: 0,
});

describe('groupMessages', () => {
  it('mostra o cabeçalho na primeira mensagem', () => {
    expect(groupMessages([msg('a', 0)])[0]?.showHeader).toBe(true);
  });

  it('agrupa mensagens seguidas do mesmo autor', () => {
    const rows = groupMessages([msg('a', 0), msg('a', 1000)]);
    expect(rows.map((r) => r.showHeader)).toEqual([true, false]);
  });

  it('separa quando o autor muda ou passa o intervalo', () => {
    const rows = groupMessages([
      msg('a', 0),
      msg('b', 1000),
      msg('b', 1000 + GROUP_WINDOW_MS + 1),
    ]);
    expect(rows.map((r) => r.showHeader)).toEqual([true, true, true]);
  });

  it('devolve lista vazia para nenhuma mensagem', () => {
    expect(groupMessages([])).toEqual([]);
  });
});
