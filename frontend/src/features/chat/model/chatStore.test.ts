import {
  CHAT_HISTORY_LIMIT,
  type ChannelInfo,
  type ChatMessage,
} from '@/shared/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  channelTitle,
  totalMentions,
  totalUnread,
  useChatStore,
} from './chatStore';

const ME = 'bia@empresa.com';

const channel = (
  id: string,
  extra: Partial<ChannelInfo> = {},
): ChannelInfo => ({
  id,
  name: id,
  kind: 'public',
  archived: false,
  members: [],
  unread: 0,
  mentions: 0,
  ...extra,
});

const msg = (
  id: number,
  channelId = 'geral',
  extra: Partial<ChatMessage> = {},
): ChatMessage => ({
  id: `m${id}`,
  channel: channelId,
  authorId: 'ana@empresa.com',
  author: 'Ana',
  color: 1,
  text: `texto ${id}`,
  at: id,
  mentions: [],
  replyCount: 0,
  ...extra,
});

const state = () => useChatStore.getState();

beforeEach(() => {
  state().reset();
  state().setMe(ME);
  state().setChannels([channel('geral'), channel('projetos')]);
});

describe('useChatStore: mensagens', () => {
  it('carrega o histórico por canal', () => {
    state().setHistory([msg(1), msg(2, 'projetos')]);
    expect(state().messages.geral).toHaveLength(1);
    expect(state().messages.projetos).toHaveLength(1);
  });

  it('guarda só as últimas mensagens de cada canal e ignora repetidas', () => {
    for (let i = 0; i < CHAT_HISTORY_LIMIT + 3; i++) state().receive(msg(i));
    state().receive(msg(CHAT_HISTORY_LIMIT + 2));
    const list = state().messages.geral!;
    expect(list).toHaveLength(CHAT_HISTORY_LIMIT);
    expect(list[0]?.id).toBe('m3');
  });

  it('avisa quando o canal ainda não está na lista', () => {
    expect(state().receive(msg(1, 'dm:ana@x.com|bia@x.com'))).toBe(
      'unknown-channel',
    );
    expect(state().receive(msg(2))).toBe('ok');
  });

  it('limita o histórico carregado a um canal por vez', () => {
    state().setHistory(
      Array.from({ length: CHAT_HISTORY_LIMIT + 5 }, (_, i) => msg(i)),
    );
    expect(state().messages.geral).toHaveLength(CHAT_HISTORY_LIMIT);
  });
});

describe('useChatStore: não lidas', () => {
  it('conta com o painel fechado, separando menções', () => {
    state().receive(msg(1));
    state().receive(msg(2, 'geral', { mentions: [ME] }));
    const geral = state().channels.find((c) => c.id === 'geral')!;
    expect(geral).toMatchObject({ unread: 2, mentions: 1 });
    expect(totalUnread(state().channels)).toBe(2);
    expect(totalMentions(state().channels)).toBe(1);
  });

  it('não conta o canal aberto, nem as próprias mensagens', () => {
    state().setPanelOpen(true);
    state().receive(msg(1));
    state().receive(msg(2, 'projetos', { authorId: ME }));
    expect(totalUnread(state().channels)).toBe(0);
  });

  it('conta outro canal com o painel aberto e zera ao abri-lo', () => {
    state().setPanelOpen(true);
    state().receive(msg(1, 'projetos'));
    expect(state().channels.find((c) => c.id === 'projetos')?.unread).toBe(1);
    state().setActive('projetos');
    expect(totalUnread(state().channels)).toBe(0);
  });

  it('zera o canal ativo ao abrir o painel e mantém ao fechar', () => {
    state().receive(msg(1));
    state().setPanelOpen(true);
    expect(totalUnread(state().channels)).toBe(0);
    state().setPanelOpen(false);
    state().receive(msg(2));
    expect(totalUnread(state().channels)).toBe(1);
  });

  it('trocar de canal com o painel fechado mantém as não lidas', () => {
    state().receive(msg(1, 'projetos'));
    state().setActive('projetos');
    expect(totalUnread(state().channels)).toBe(1);
  });
});

describe('useChatStore: canais', () => {
  it('muda para outro canal se o ativo sumiu da lista (arquivado)', () => {
    state().setActive('projetos');
    state().setChannels([channel('geral')]);
    expect(state().active).toBe('geral');
  });

  it('cai no canal padrão com lista vazia', () => {
    state().setChannels([]);
    expect(state().active).toBe('geral');
  });

  it('com o painel aberto, a lista nova já vem sem não lidas no canal ativo', () => {
    state().setPanelOpen(true);
    state().setChannels([
      channel('geral', { unread: 4 }),
      channel('projetos', { unread: 2 }),
    ]);
    expect(state().channels.map((c) => c.unread)).toEqual([0, 2]);
  });

  it('acrescenta um canal novo sem duplicar', () => {
    state().addChannel(channel('design'));
    state().addChannel(channel('design', { unread: 9 }));
    expect(state().channels.filter((c) => c.id === 'design')).toHaveLength(1);
    expect(state().channels.find((c) => c.id === 'design')?.unread).toBe(0);
  });

  it('mostra o nome da outra pessoa nas conversas diretas', () => {
    const dm = channel('dm:a|b', {
      kind: 'dm',
      members: [
        { email: ME, name: 'Bia' },
        { email: 'ana@empresa.com', name: 'Ana' },
      ],
    });
    expect(channelTitle(dm, ME)).toBe('Ana');
    expect(channelTitle(dm, null)).toBe('Bia');
    expect(channelTitle(channel('geral'), ME)).toBe('geral');
    expect(
      channelTitle(channel('dm:x', { kind: 'dm', name: 'dm:x' }), ME),
    ).toBe('dm:x');
  });
});

describe('useChatStore: respostas', () => {
  it('abre a conversa com a mensagem inicial e recebe as respostas ao vivo', () => {
    state().setHistory([msg(1)]);
    state().openThread('m1');
    expect(state().thread?.messages.map((m) => m.id)).toEqual(['m1']);

    state().receive(msg(2, 'geral', { threadId: 'm1' }));
    expect(state().messages.geral![0]?.replyCount).toBe(1);
    state().receive(msg(2, 'geral', { threadId: 'm1' }));
    expect(state().thread?.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(state().messages.geral).toHaveLength(1);
  });

  it('respostas não entram na lista principal e contam como não lidas', () => {
    state().setHistory([msg(1)]);
    state().receive(msg(2, 'geral', { threadId: 'm1' }));
    expect(state().messages.geral).toHaveLength(1);
    expect(state().channels.find((c) => c.id === 'geral')?.unread).toBe(1);
  });

  it('troca pela conversa vinda do servidor e fecha ao mudar de canal', () => {
    state().setThread('m1', [msg(1), msg(2, 'geral', { threadId: 'm1' })]);
    expect(state().thread?.messages).toHaveLength(2);
    state().setActive('projetos');
    expect(state().thread).toBeNull();

    state().openThread('inexistente');
    expect(state().thread).toEqual({ rootId: 'inexistente', messages: [] });
    state().closeThread();
    expect(state().thread).toBeNull();
  });

  it('guarda pessoas e erros', () => {
    state().setPeople([{ email: 'a@x.com', name: 'Ana' }]);
    state().setError('rate_limited');
    expect(state().people).toHaveLength(1);
    expect(state().error).toBe('rate_limited');
    state().setError(null);
    expect(state().error).toBeNull();
  });

  it('reordena canais públicos mantendo DMs preservadas', () => {
    state().setChannels([
      {
        id: 'geral',
        name: 'geral',
        kind: 'public',
        archived: false,
        members: [],
        unread: 0,
        mentions: 0,
      },
      {
        id: 'projetos',
        name: 'projetos',
        kind: 'public',
        archived: false,
        members: [],
        unread: 0,
        mentions: 0,
      },
      {
        id: 'dm:a@x.com|b@x.com',
        name: 'Bia',
        kind: 'dm',
        archived: false,
        members: [
          { email: 'a@x.com', name: 'Ana' },
          { email: 'b@x.com', name: 'Bia' },
        ],
        unread: 1,
        mentions: 0,
      },
    ]);
    state().reorderPublicChannels(['projetos', 'geral']);
    expect(state().channels.map((c) => c.id)).toEqual([
      'projetos',
      'geral',
      'dm:a@x.com|b@x.com',
    ]);
  });
});

describe('useChatStore: edição, exclusão e digitando', () => {
  it('atualiza mensagem editada ou apagada no canal e na thread', () => {
    state().setHistory([msg(1)]);
    state().openThread('m1');
    state().updateMessage({
      ...msg(1),
      text: 'texto editado',
      editedAt: 99,
    });
    expect(state().messages.geral?.[0]?.text).toBe('texto editado');
    expect(state().messages.geral?.[0]?.editedAt).toBe(99);
    expect(state().thread?.messages[0]?.text).toBe('texto editado');

    state().updateMessage({ ...msg(1), text: '', deletedAt: 100 });
    expect(state().messages.geral?.[0]?.deletedAt).toBe(100);
  });

  it('controla estado de digitando e limpa ao receber mensagem', () => {
    state().setTyping('geral', 'ana@empresa.com', 'Ana', true);
    expect(state().typingByChannel.geral?.['ana@empresa.com']?.name).toBe(
      'Ana',
    );

    state().receive(msg(10, 'geral', { authorId: 'ana@empresa.com' }));
    expect(state().typingByChannel.geral?.['ana@empresa.com']).toBeUndefined();

    state().setTyping('geral', 'ana@empresa.com', 'Ana', true);
    state().setTyping('geral', 'ana@empresa.com', 'Ana', false);
    expect(state().typingByChannel.geral?.['ana@empresa.com']).toBeUndefined();
  });
});
