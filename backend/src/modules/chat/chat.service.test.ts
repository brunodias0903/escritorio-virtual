import { beforeEach, describe, expect, it } from 'vitest';
import {
  MemoryChannelRepository,
  MemoryChatRepository,
  MemoryProfileRepository,
  MemoryReadStateRepository,
} from '../../infra/persistence/memory/index.js';
import {
  CHAT_TEXT_MAX_LENGTH,
  dmChannelId,
} from '../../shared/domain/index.js';
import { CHAT_MIN_INTERVAL_MS, ChatService } from './chat.service.js';

const ANA = { email: 'ana@empresa.com', name: 'Ana', color: 1 };
const BIA = { email: 'bia@empresa.com', name: 'Bia', color: 2 };
const CAIO = { email: 'caio@parceiro.com', name: 'Caio', color: 3 };

let time: number;
let counter: number;
let service: ChatService;
let profiles: MemoryProfileRepository;

const advance = (ms = CHAT_MIN_INTERVAL_MS) => {
  time += ms;
};

beforeEach(async () => {
  time = 1_000_000;
  counter = 0;
  profiles = new MemoryProfileRepository();
  service = new ChatService({
    channels: new MemoryChannelRepository(),
    chat: new MemoryChatRepository(),
    reads: new MemoryReadStateRepository(),
    profiles,
    now: () => time,
    newId: () => `m${++counter}`,
  });
  for (const person of [ANA, BIA, CAIO]) {
    await profiles.touch(person.email, person.name, time);
  }
});

describe('canais públicos', () => {
  it('cada pessoa vê os três canais iniciais', async () => {
    const channels = await service.channelsFor(ANA.email);
    expect(channels.map((c) => c.id)).toEqual([
      'aleatorio',
      'geral',
      'projetos',
    ]);
    expect(channels.every((c) => c.unread === 0 && c.mentions === 0)).toBe(
      true,
    );
  });

  it('cria um canal e recusa nome inválido ou repetido', async () => {
    expect(await service.createChannel(ANA.email, ' Design ')).toMatchObject({
      ok: true,
      value: { id: 'design', kind: 'public' },
    });
    expect(await service.createChannel(BIA.email, 'design')).toEqual({
      ok: false,
      error: 'name_taken',
    });
    for (const bad of ['a', 'Com Espaço', '-inicio', 'x'.repeat(40), 'ação']) {
      expect(await service.createChannel(ANA.email, bad)).toEqual({
        ok: false,
        error: 'invalid_name',
      });
    }
    expect((await service.channelsFor(BIA.email)).map((c) => c.id)).toContain(
      'design',
    );
  });

  it('só quem criou (ou um administrador) arquiva; os iniciais, só administrador', async () => {
    await service.createChannel(ANA.email, 'design');
    expect(await service.archiveChannel(BIA.email, 'design', false)).toEqual({
      ok: false,
      error: 'forbidden',
    });
    expect(await service.archiveChannel(ANA.email, 'geral', false)).toEqual({
      ok: false,
      error: 'forbidden',
    });
    expect(
      await service.archiveChannel(ANA.email, 'design', false),
    ).toMatchObject({ ok: true });
    expect(
      await service.archiveChannel(BIA.email, 'geral', true),
    ).toMatchObject({ ok: true });
    expect(await service.archiveChannel(ANA.email, 'nao-existe', true)).toEqual(
      { ok: false, error: 'not_found' },
    );

    const visible = (await service.channelsFor(ANA.email)).map((c) => c.id);
    expect(visible).not.toContain('design');
    expect(visible).not.toContain('geral');
  });

  it('não aceita mensagem em canal arquivado ou inexistente', async () => {
    await service.archiveChannel(ANA.email, 'projetos', true);
    expect(await service.send(ANA, 'projetos', 'oi')).toEqual({
      ok: false,
      error: 'archived',
    });
    expect(await service.send(ANA, 'nada', 'oi')).toEqual({
      ok: false,
      error: 'not_found',
    });
  });
});

describe('enviar mensagens', () => {
  it('grava com autor, hora e e-mail como identidade', async () => {
    const result = await service.send(ANA, 'geral', '  oi  ');
    expect(result).toEqual({
      ok: true,
      value: {
        message: {
          id: 'm1',
          channel: 'geral',
          authorId: ANA.email,
          author: 'Ana',
          color: 1,
          text: 'oi',
          at: 1_000_000,
          mentions: [],
          replyCount: 0,
        },
      },
    });
  });

  it('recusa texto vazio e corta textos longos', async () => {
    expect(await service.send(ANA, 'geral', '   ')).toEqual({
      ok: false,
      error: 'empty',
    });
    advance();
    const long = await service.send(
      ANA,
      'geral',
      'ab '.repeat(CHAT_TEXT_MAX_LENGTH),
    );
    expect(long.ok && long.value.message.text).toHaveLength(
      CHAT_TEXT_MAX_LENGTH,
    );
  });

  it('limita a frequência por pessoa, não por conexão', async () => {
    expect(await service.send(ANA, 'geral', 'um')).toMatchObject({ ok: true });
    expect(await service.send(ANA, 'geral', 'dois')).toEqual({
      ok: false,
      error: 'rate_limited',
    });
    expect(await service.send(BIA, 'geral', 'outra pessoa')).toMatchObject({
      ok: true,
    });
    advance();
    expect(await service.send(ANA, 'geral', 'três')).toMatchObject({
      ok: true,
    });
  });

  it('o histórico traz as mensagens de cada canal em ordem', async () => {
    await service.send(ANA, 'geral', 'primeira');
    advance();
    await service.send(ANA, 'geral', 'segunda');
    advance();
    await service.send(ANA, 'projetos', 'outro canal');
    const history = await service.history(BIA.email);
    expect(
      history.filter((m) => m.channel === 'geral').map((m) => m.text),
    ).toEqual(['primeira', 'segunda']);
    expect(history.some((m) => m.text === 'outro canal')).toBe(true);
  });
});

describe('conversas diretas', () => {
  it('abre a conversa e só as duas pessoas a veem', async () => {
    const opened = await service.openDirect(ANA.email, 'BIA@empresa.com');
    expect(opened).toMatchObject({
      ok: true,
      value: {
        id: dmChannelId(ANA.email, BIA.email),
        kind: 'dm',
        name: 'Bia',
        members: [
          { email: ANA.email, name: 'Ana' },
          { email: BIA.email, name: 'Bia' },
        ],
      },
    });
    expect((await service.channelsFor(BIA.email)).map((c) => c.kind)).toContain(
      'dm',
    );
    expect(
      (await service.channelsFor(CAIO.email)).map((c) => c.kind),
    ).not.toContain('dm');
  });

  it('reabre a mesma conversa sem duplicar', async () => {
    await service.openDirect(ANA.email, BIA.email);
    await service.openDirect(BIA.email, ANA.email);
    const dms = (await service.channelsFor(ANA.email)).filter(
      (c) => c.kind === 'dm',
    );
    expect(dms).toHaveLength(1);
  });

  it('recusa conversa consigo mesmo e com quem nunca entrou', async () => {
    expect(await service.openDirect(ANA.email, ANA.email)).toEqual({
      ok: false,
      error: 'invalid_name',
    });
    expect(await service.openDirect(ANA.email, 'fantasma@x.com')).toEqual({
      ok: false,
      error: 'not_found',
    });
  });

  it('a mensagem vai só para as duas pessoas e terceiros não escrevem nem leem', async () => {
    await service.openDirect(ANA.email, BIA.email);
    const id = dmChannelId(ANA.email, BIA.email);

    const sent = await service.send(ANA, id, 'segredo');
    expect(sent).toMatchObject({
      ok: true,
      value: { emails: [ANA.email, BIA.email] },
    });

    expect(await service.send(CAIO, id, 'intruso')).toEqual({
      ok: false,
      error: 'forbidden',
    });
    expect(await service.thread(CAIO.email, 'm1')).toEqual({
      ok: false,
      error: 'forbidden',
    });
    expect(await service.markRead(CAIO.email, id)).toEqual({
      ok: false,
      error: 'forbidden',
    });
    const history = await service.history(CAIO.email);
    expect(history.some((m) => m.text === 'segredo')).toBe(false);
  });
});

describe('respostas (threads)', () => {
  it('responde a uma mensagem e conta as respostas', async () => {
    await service.send(ANA, 'geral', 'pergunta');
    advance();
    expect(await service.send(BIA, 'geral', 'resposta', 'm1')).toMatchObject({
      ok: true,
      value: { message: { threadId: 'm1', text: 'resposta' } },
    });

    const history = await service.history(ANA.email);
    expect(history.map((m) => [m.text, m.replyCount])).toEqual([
      ['pergunta', 1],
    ]);

    const thread = await service.thread(ANA.email, 'm1');
    expect(thread.ok && thread.value.map((m) => m.text)).toEqual([
      'pergunta',
      'resposta',
    ]);
    expect(thread.ok && thread.value[0]?.replyCount).toBe(1);
  });

  it('não responde a resposta, a outro canal ou a mensagem que não existe', async () => {
    await service.send(ANA, 'geral', 'pergunta');
    advance();
    await service.send(BIA, 'geral', 'resposta', 'm1');
    advance();
    expect(await service.send(ANA, 'geral', 'x', 'm2')).toEqual({
      ok: false,
      error: 'invalid_thread',
    });
    expect(await service.send(ANA, 'projetos', 'x', 'm1')).toEqual({
      ok: false,
      error: 'invalid_thread',
    });
    expect(await service.send(ANA, 'geral', 'x', 'nada')).toEqual({
      ok: false,
      error: 'invalid_thread',
    });
    expect(await service.thread(ANA.email, 'm2')).toEqual({
      ok: false,
      error: 'not_found',
    });
  });
});

describe('menções', () => {
  it('acha quem foi citado, sem contar a si mesmo', async () => {
    const result = await service.send(
      ANA,
      'geral',
      'oi @bia e @ana e @ninguem',
    );
    expect(result.ok && result.value.message.mentions).toEqual([BIA.email]);
  });

  it('em conversa direta, só cita quem participa', async () => {
    await service.openDirect(ANA.email, BIA.email);
    const result = await service.send(
      ANA,
      dmChannelId(ANA.email, BIA.email),
      '@bia e @caio',
    );
    expect(result.ok && result.value.message.mentions).toEqual([BIA.email]);
  });
});

describe('não lidas', () => {
  it('conta o que chegou depois da última leitura, separando menções', async () => {
    await service.channelsFor(BIA.email);
    advance();
    await service.send(ANA, 'geral', 'oi');
    advance();
    await service.send(ANA, 'geral', 'oi @bia');
    advance();

    const geral = (await service.channelsFor(BIA.email)).find(
      (c) => c.id === 'geral',
    );
    expect(geral).toMatchObject({ unread: 2, mentions: 1 });
  });

  it('mensagens próprias não contam e ler zera', async () => {
    await service.channelsFor(BIA.email);
    advance();
    await service.send(BIA, 'geral', 'minha');
    advance();
    await service.send(ANA, 'geral', 'dela');
    advance();
    expect(
      (await service.channelsFor(BIA.email)).find((c) => c.id === 'geral')
        ?.unread,
    ).toBe(1);

    expect(await service.markRead(BIA.email, 'geral')).toEqual({
      ok: true,
      value: null,
    });
    expect(
      (await service.channelsFor(BIA.email)).find((c) => c.id === 'geral')
        ?.unread,
    ).toBe(0);
    expect(await service.markRead(BIA.email, 'nada')).toEqual({
      ok: false,
      error: 'not_found',
    });
  });

  it('quem nunca entrou começa em dia, sem histórico antigo como não lido', async () => {
    await service.send(ANA, 'geral', 'antiga');
    advance();
    const geral = (await service.channelsFor(CAIO.email)).find(
      (c) => c.id === 'geral',
    );
    expect(geral?.unread).toBe(0);
  });
});

describe('diretório', () => {
  it('lista as pessoas que já entraram, por nome', async () => {
    const people = await service.directory();
    expect(people.map((p) => p.name)).toEqual(['Ana', 'Bia', 'Caio']);
  });
});

describe('visibilidade, escrita por cargo e exceções individuais', () => {
  it('oculta canais restritos, bloqueia leitura/escrita e respeita exceções por e-mail', async () => {
    const repo = new MemoryChannelRepository();
    const scoped = new ChatService({
      channels: repo,
      chat: new MemoryChatRepository(),
      reads: new MemoryReadStateRepository(),
      profiles,
      now: () => time,
      newId: () => `m${++counter}`,
    });
    await repo.create({
      id: 'diretoria',
      name: 'diretoria',
      kind: 'public',
      archived: false,
      position: 5,
      viewTiers: ['master', 'admin', 'developer'],
      writeTiers: ['master', 'admin'],
      allowedEmails: [CAIO.email],
      blockedEmails: [BIA.email],
      createdBy: ANA.email,
      createdAt: time,
    });

    // Master sempre vê e escreve
    expect(
      (await scoped.channelsFor(ANA.email, ['master'])).map((c) => c.id),
    ).toContain('diretoria');

    // Tester sem exceção não vê nem pode enviar mensagem
    expect(
      (await scoped.channelsFor('outro@empresa.com', ['tester'])).map(
        (c) => c.id,
      ),
    ).not.toContain('diretoria');
    expect(
      await scoped.send(
        {
          email: 'outro@empresa.com',
          name: 'Outro',
          color: 4,
          tiers: ['tester'],
        },
        'diretoria',
        'oi',
      ),
    ).toEqual({ ok: false, error: 'forbidden' });

    // Bia tem tier developer mas está bloqueada individualmente
    expect(
      (await scoped.channelsFor(BIA.email, ['developer'])).map((c) => c.id),
    ).not.toContain('diretoria');
    expect(
      await scoped.markRead(BIA.email, 'diretoria', ['developer']),
    ).toEqual({
      ok: false,
      error: 'forbidden',
    });

    // Caio é tester mas foi liberado individualmente (vê o canal, mas escrita é só master/admin)
    expect(
      (await scoped.channelsFor(CAIO.email, ['tester'])).map((c) => c.id),
    ).toContain('diretoria');
    expect(
      await scoped.send({ ...CAIO, tiers: ['tester'] }, 'diretoria', 'oi'),
    ).toEqual({ ok: false, error: 'channel_read_only' });

    // Admin pode enviar e retorna restrictedAccess para filtrar entrega em tempo real
    const sent = await scoped.send(
      { ...ANA, tiers: ['admin'] },
      'diretoria',
      'aviso',
    );
    expect(sent.ok).toBe(true);
    if (sent.ok) {
      expect(sent.value.restrictedAccess?.viewTiers).toEqual([
        'master',
        'admin',
        'developer',
      ]);
      // Histórico oculta mensagens para quem não tem acesso
      expect(await scoped.history('outro@empresa.com', ['tester'])).toEqual([]);
      expect(await scoped.history(CAIO.email, ['tester'])).toHaveLength(1);
    }
  });

  it('permite editar, apagar para todos, enviar digitando e arquivar DM', async () => {
    const sent = await service.send(ANA, 'geral', 'mensagem original');
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    const msgId = sent.value.message.id;

    // Outro usuário não pode editar nem apagar
    expect(await service.editMessage(BIA, 'geral', msgId, 'invasão')).toEqual({
      ok: false,
      error: 'forbidden',
    });
    expect(await service.deleteMessage(BIA, 'geral', msgId)).toEqual({
      ok: false,
      error: 'forbidden',
    });

    // Autor edita
    const edited = await service.editMessage(ANA, 'geral', msgId, 'editada');
    expect(edited.ok).toBe(true);
    if (edited.ok) {
      expect(edited.value.message.text).toBe('editada');
      expect(edited.value.message.editedAt).toBeDefined();
    }

    // Indicador de digitando
    expect(await service.typingTargets(ANA.email, 'geral')).toEqual({
      ok: true,
      value: {},
    });

    // Autor apaga para todos e não pode editar depois
    const deleted = await service.deleteMessage(ANA, 'geral', msgId);
    expect(deleted.ok).toBe(true);
    if (deleted.ok) {
      expect(deleted.value.message.text).toBe('');
      expect(deleted.value.message.deletedAt).toBeDefined();
    }
    expect(
      await service.editMessage(ANA, 'geral', msgId, 'tarde demais'),
    ).toEqual({ ok: false, error: 'archived' });

    // DM: membro pode arquivar/apagar conversa e reabrir depois
    const dm = await service.openDirect(ANA.email, BIA.email);
    expect(dm.ok).toBe(true);
    if (!dm.ok) return;
    expect(await service.typingTargets(ANA.email, dm.value.id)).toMatchObject({
      ok: true,
    });
    expect(
      await service.archiveChannel(CAIO.email, dm.value.id, false),
    ).toEqual({ ok: false, error: 'forbidden' });
    expect(await service.archiveChannel(ANA.email, dm.value.id, false)).toEqual(
      {
        ok: true,
        value: null,
      },
    );
  });
});
