import { describe, expect, it } from 'vitest';
import {
  MemoryChannelRepository,
  MemoryChatRepository,
  MemoryDeskRepository,
  MemoryEmailCodeRepository,
  MemoryLocalAccountRepository,
  MemoryProfileRepository,
  MemoryRateLimiter,
  MemoryReadStateRepository,
  MemoryRevocations,
  MemoryServerRepository,
} from '../../infra/persistence/memory/index.js';
import { MemoryBus, MemoryPresence } from '../../infra/redis/index.js';
import {
  callRoomName,
  callZoneId,
  dmChannelId,
  getMap,
  parseAccountAccess,
  type ServerMessage,
} from '../../shared/domain/index.js';
import { AuthService } from '../auth/auth.service.js';
import { CodeService } from '../auth/codes.service.js';
import { signSession } from '../auth/token.js';
import { ChatService } from '../chat/chat.service.js';
import { DeskService } from '../desks/desks.service.js';
import { MediaService } from '../media/media.service.js';
import { OfficeService, type Outgoing } from '../office/office.service.js';
import { Cluster } from './cluster.js';
import { Connection, POSITION_SAVE_MS } from './connection.js';

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres';

const world = (
  media = new MediaService(null),
  options?: { servers?: MemoryServerRepository },
) => {
  let time = 1_000_000;
  const profiles = new MemoryProfileRepository();
  const office = new OfficeService({ now: () => time });
  const sockets = new Map<string, Client>();

  const deliver = (sender: string, out: Outgoing) => {
    const targetServerId = out.serverId ?? office.serverIdOf(sender);
    for (const [id, client] of sockets) {
      if (out.to === 'self' && id !== sender) continue;
      if (out.to === 'others' && id === sender) continue;
      if (out.to !== 'self' && office.serverIdOf(id) !== targetServerId) {
        continue;
      }
      if (out.map && office.players.get(id)?.map !== out.map) continue;
      if (out.emails) {
        const email = office.emailOf(id);
        if (!email || !out.emails.includes(email)) continue;
      }
      client.inbox.push(out.message);
    }
  };
  const cluster = new Cluster({
    origin: 'teste',
    bus: new MemoryBus(),
    presence: new MemoryPresence(),
    deliver,
    onRemote: (message) => office.applyRemote(message),
  });
  const accounts = new MemoryLocalAccountRepository();
  const auth = new AuthService({
    accounts,
    secret: SECRET,
    adminEmails: [],
    access: parseAccountAccess('empresa.com,parceiro.com:externo', ''),
    loginLimiter: new MemoryRateLimiter(10, 60_000),
    revocations: new MemoryRevocations(),
    codes: new CodeService({
      codes: new MemoryEmailCodeRepository(),
      mailer: { send: async () => {} },
      secret: SECRET,
    }),
    now: () => time,
  });
  let counter = 0;
  const desks = new DeskService(new MemoryDeskRepository());
  const chat = new ChatService({
    channels: new MemoryChannelRepository(),
    chat: new MemoryChatRepository(),
    reads: new MemoryReadStateRepository(),
    profiles,
    now: () => time,
    newId: () => `m${++counter}`,
  });

  const activeByEmail = new Map<
    string,
    { id: string; displace: () => Promise<void> }
  >();

  const connect = (id: string): Client => {
    const client: Client = {
      inbox: [],
      closed: null,
      connection: null as unknown as Connection,
      send: (data) => client.connection.handle(data),
      ofType: ((type: string) =>
        client.inbox.filter((m) => m.type === type)) as Client['ofType'],
    };
    client.connection = new Connection({
      id,
      office,
      cluster,
      auth,
      chat,
      desks,
      media,
      profiles,
      accounts,
      ...(options?.servers ? { servers: options.servers } : {}),
      now: () => time,
      send: (message) => client.inbox.push(message),
      close: (code, reason) => (client.closed = { code, reason }),
      attach: () => sockets.set(id, client),
      detach: () => sockets.delete(id),
      claimSession: async (email) => {
        const prev = activeByEmail.get(email);
        const hadOther = prev !== undefined && prev.id !== id;
        if (hadOther) await prev.displace();
        activeByEmail.set(email, {
          id,
          displace: () => client.connection.displace(),
        });
        return hadOther;
      },
      releaseSession: (email) => {
        if (activeByEmail.get(email)?.id === id) activeByEmail.delete(email);
      },
    });
    return client;
  };

  const sessionFor = (email: string, name: string) =>
    signSession(
      { email, name, admin: false, kind: 'company' },
      SECRET,
      3600,
      time,
    );

  const login = async (
    id: string,
    email: string,
    name: string,
    serverId?: string,
  ) => {
    const client = connect(id);
    await client.send({
      type: 'join',
      token: sessionFor(email, name),
      ...(serverId ? { serverId } : {}),
    });
    return client;
  };

  return {
    office,
    accounts,
    chat,
    desks,
    cluster,
    connect,
    login,
    sessionFor,
    advance: (ms = 400) => {
      time += ms;
    },
  };
};

type Client = {
  inbox: ServerMessage[];
  closed: { code: number; reason: string } | null;
  connection: Connection;
  send: (data: unknown) => Promise<void>;
  ofType: <T extends ServerMessage['type']>(
    type: T,
  ) => Extract<ServerMessage, { type: T }>[];
};

describe('lista de pessoas', () => {
  it('mostra todas as contas, online primeiro, com nome, cargo e status', async () => {
    const w = world();
    const ana = await w.login('a', 'ana@empresa.com', 'Ana Souza');
    await ana.send({ type: 'status', status: 'busy' });
    await w.accounts.create({
      nickname: 'zeca',
      fullName: 'Zeca Offline',
      email: 'zeca@parceiro.com',
      role: 'Designer',
      passwordHash: 'x',
      createdAt: 1,
    });
    const bia = await w.login('b', 'bia@empresa.com', 'Bia Lima');

    await bia.send({ type: 'people' });
    const people = bia.ofType('people')[0]!.people;
    expect(people.map((p) => [p.name, p.status])).toEqual([
      ['Bia Lima', 'available'],
      ['Ana Souza', 'busy'],
      ['Zeca Offline', 'offline'],
    ]);
    expect(people[2]).toMatchObject({ role: 'Designer', map: null });
  });
});

describe('voltar ao último lugar', () => {
  const me = (client: Client, id: string) =>
    client.ofType('init')[0]?.players.find((p) => p.id === id);

  it('ao entrar de novo, a pessoa aparece onde estava ao sair', async () => {
    const w = world();
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    const spawn = getMap('lobby').spawn;
    expect(me(ana, 'a')).toMatchObject(spawn);

    await ana.send({ type: 'move', x: spawn.x + 32, y: spawn.y });
    w.advance(100);
    await ana.send({ type: 'move', x: spawn.x + 64, y: spawn.y });
    await ana.connection.dispose();

    const back = await w.login('a2', 'ana@empresa.com', 'Ana');
    expect(me(back, 'a2')).toMatchObject({ x: spawn.x + 64, y: spawn.y });
  });

  it('enquanto anda, também grava de tempos em tempos', async () => {
    const w = world();
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    const spawn = getMap('lobby').spawn;
    w.advance(POSITION_SAVE_MS);
    await ana.send({ type: 'move', x: spawn.x + 32, y: spawn.y });
    w.office.leave('a');
    const back = await w.login('a2', 'ana@empresa.com', 'Ana');
    expect(me(back, 'a2')).toMatchObject({ x: spawn.x + 32 });
  });
});

describe('entrada', () => {
  it('com sessão válida recebe canais, histórico e init, e vira jogador', async () => {
    const w = world();
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    expect(ana.inbox.map((m) => m.type)).toEqual([
      'channels',
      'history',
      'desks',
      'init',
    ]);
    expect(ana.connection.joined).toBe(true);
    expect(w.office.players.get('a')).toMatchObject({
      name: 'Ana',
      map: 'lobby',
    });
  });

  it('com sessão falsa fecha com 4401 e não entra', async () => {
    const w = world();
    const client = w.connect('a');
    await client.send({ type: 'join', token: 'lixo' });
    expect(client.closed?.code).toBe(4401);
    expect(client.connection.started).toBe(false);
    expect(w.office.players.size).toBe(0);
  });

  it('ignora mensagens antes de entrar, lixo e um segundo join', async () => {
    const w = world();
    const client = w.connect('a');
    await client.send({ type: 'move', x: 1, y: 1 });
    await client.send({ type: 'nada' });
    expect(client.inbox).toEqual([]);

    await client.send({
      type: 'join',
      token: w.sessionFor('ana@empresa.com', 'Ana'),
    });
    const count = client.inbox.length;
    await client.send({
      type: 'join',
      token: w.sessionFor('ana@empresa.com', 'Ana'),
    });
    expect(client.inbox).toHaveLength(count);
  });

  it('usa a aparência salva e avisa os outros da sala', async () => {
    const w = world();
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    const novo = { skin: 1, hair: 2, style: 3, shirt: 4 };
    await ana.send({ type: 'appearance', appearance: novo });
    await ana.connection.dispose();

    const volta = await w.login('a2', 'ana@empresa.com', 'Ana');
    expect(w.office.players.get('a2')?.appearance).toEqual(novo);
    expect(volta.ofType('init')).toHaveLength(1);
  });
});

describe('sala', () => {
  it('movimento, status e emote chegam só a quem está na mesma sala', async () => {
    const w = world();
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    const bia = await w.login('b', 'bia@empresa.com', 'Bia');
    const caio = await w.login('c', 'caio@empresa.com', 'Caio');
    w.office.players.get('c')!.map = 'andar-2';
    for (const c of [ana, bia, caio]) c.inbox.length = 0;

    const spawn = getMap('lobby').spawn;
    await ana.send({ type: 'move', x: spawn.x + 32, y: spawn.y });
    await ana.send({ type: 'status', status: 'busy' });
    await ana.send({ type: 'emote', emote: '👋' });

    expect(bia.inbox.map((m) => m.type)).toEqual(['moved', 'status', 'emote']);
    expect(caio.inbox).toEqual([]);
    expect(ana.inbox.map((m) => m.type)).toEqual(['status', 'emote']);
  });

  it('sair avisa os outros e tira o jogador', async () => {
    const w = world();
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    const bia = await w.login('b', 'bia@empresa.com', 'Bia');
    bia.inbox.length = 0;
    await ana.connection.dispose();
    expect(bia.ofType('left')).toEqual([{ type: 'left', id: 'a' }]);
    expect(w.office.players.has('a')).toBe(false);
    await ana.connection.dispose();
  });

  it('quem nunca entrou pode ser descartado sem efeito', async () => {
    const w = world();
    await expect(w.connect('x').connection.dispose()).resolves.toBeUndefined();
  });
});

describe('chat', () => {
  it('mensagem pública chega a todos, inclusive a quem enviou', async () => {
    const w = world();
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    const bia = await w.login('b', 'bia@empresa.com', 'Bia');
    await ana.send({ type: 'chat', channel: 'geral', text: 'oi' });
    expect(ana.ofType('chat')[0]?.message.text).toBe('oi');
    expect(bia.ofType('chat')[0]?.message.author).toBe('Ana');
  });

  it('conversa direta chega só às duas pessoas e avisa a outra da nova conversa', async () => {
    const w = world();
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    const bia = await w.login('b', 'bia@empresa.com', 'Bia');
    const caio = await w.login('c', 'caio@empresa.com', 'Caio');

    await ana.send({ type: 'openDm', email: 'bia@empresa.com' });
    expect(ana.ofType('channelOpened')[0]?.channel.kind).toBe('dm');
    expect(bia.ofType('channelsChanged')).toHaveLength(1);
    expect(caio.ofType('channelsChanged')).toHaveLength(0);

    w.advance();
    const id = dmChannelId('ana@empresa.com', 'bia@empresa.com');
    await ana.send({ type: 'chat', channel: id, text: 'segredo' });
    expect(bia.ofType('chat')).toHaveLength(1);
    expect(caio.ofType('chat')).toHaveLength(0);

    await caio.send({ type: 'chat', channel: id, text: 'intruso' });
    expect(caio.ofType('chatError')[0]?.code).toBe('forbidden');
  });

  it('devolve o erro quando não pode enviar', async () => {
    const w = world();
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    await ana.send({ type: 'chat', channel: 'geral', text: '   ' });
    await ana.send({ type: 'chat', channel: 'nada', text: 'oi' });
    expect(ana.ofType('chatError').map((e) => e.code)).toEqual([
      'empty',
      'not_found',
    ]);
  });

  it('responde em conversa e busca a conversa inteira', async () => {
    const w = world();
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    await ana.send({ type: 'chat', channel: 'geral', text: 'pergunta' });
    const id = ana.ofType('chat')[0]!.message.id;
    w.advance();
    await ana.send({
      type: 'chat',
      channel: 'geral',
      text: 'resposta',
      threadId: id,
    });
    await ana.send({ type: 'thread', threadId: id });
    expect(ana.ofType('thread')[0]?.messages.map((m) => m.text)).toEqual([
      'pergunta',
      'resposta',
    ]);

    await ana.send({ type: 'thread', threadId: 'nada' });
    expect(ana.ofType('chatError').at(-1)?.code).toBe('not_found');
  });

  it('cria e arquiva canais avisando todos', async () => {
    const w = world();
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    const bia = await w.login('b', 'bia@empresa.com', 'Bia');

    await ana.send({ type: 'createChannel', name: 'design' });
    expect(ana.ofType('channelOpened')[0]?.channel.id).toBe('design');
    expect(bia.ofType('channelsChanged')).toHaveLength(1);

    await bia.send({ type: 'channels' });
    expect(
      bia
        .ofType('channels')
        .at(-1)
        ?.channels.map((c) => c.id),
    ).toContain('design');

    await bia.send({ type: 'archiveChannel', id: 'design' });
    expect(bia.ofType('chatError').at(-1)?.code).toBe('forbidden');
    await ana.send({ type: 'archiveChannel', id: 'design' });
    expect(bia.ofType('channelsChanged')).toHaveLength(2);

    await ana.send({ type: 'createChannel', name: 'X' });
    expect(ana.ofType('chatError').at(-1)?.code).toBe('invalid_name');
  });

  it('marca como lido e lista o diretório de pessoas', async () => {
    const w = world();
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    await w.login('b', 'bia@empresa.com', 'Bia');
    await ana.send({ type: 'markRead', channel: 'geral' });
    await ana.send({ type: 'directory' });
    expect(ana.ofType('directory')[0]?.people).toEqual([
      { email: 'ana@empresa.com', name: 'Ana' },
      { email: 'bia@empresa.com', name: 'Bia' },
    ]);
    await ana.send({ type: 'openDm', email: 'fantasma@x.com' });
    expect(ana.ofType('chatError').at(-1)?.code).toBe('not_found');
  });

  it('isola diretório e conversas diretas apenas aos membros do servidor atual', async () => {
    const servers = new MemoryServerRepository();
    await servers.create(
      {
        id: 'srv-b',
        name: 'Servidor B',
        description: '',
        accentColor: '#5b6cff',
        visibility: 'invite',
        ownerEmail: 'ana@empresa.com',
        planTier: 'starter',
        maxMembers: null,
        maxPendingInvites: null,
        createdAt: 1,
      },
      'ana@empresa.com',
    );
    await servers.addMember('srv-b', 'bia@empresa.com', 'member');
    await servers.addMember('srv-b', 'duda@empresa.com', 'member');

    const w = world(new MediaService(null), { servers });
    // Duda já tem conta e é membro do srv-b, mas ainda não conectou via socket.
    await w.accounts.create({
      nickname: 'duda',
      fullName: 'Duda Membro',
      email: 'duda@empresa.com',
      role: 'QA',
      passwordHash: 'x',
      createdAt: 1,
    });
    // Caio está apenas no servidor padrão (não é membro de srv-b).
    await w.login('c', 'caio@empresa.com', 'Caio Fora', 'default');
    // Bia está online no srv-b e Ana também.
    const bia = await w.login('b', 'bia@empresa.com', 'Bia Dentro', 'srv-b');
    const ana = await w.login('a', 'ana@empresa.com', 'Ana Dona', 'srv-b');

    // Diretório no srv-b lista somente membros do srv-b (não inclui Caio).
    await ana.send({ type: 'directory' });
    expect(ana.ofType('directory')[0]?.people).toEqual([
      { email: 'ana@empresa.com', name: 'Ana Dona' },
      { email: 'bia@empresa.com', name: 'Bia Dentro' },
      { email: 'duda@empresa.com', name: 'Duda Membro' },
    ]);

    // Tentar abrir DM com usuário fora do srv-b retorna forbidden.
    await ana.send({ type: 'openDm', email: 'caio@empresa.com' });
    expect(ana.ofType('chatError').at(-1)?.code).toBe('forbidden');

    // Abrir DM com membro do srv-b (mesmo offline/sem perfil prévio) funciona.
    await ana.send({ type: 'openDm', email: 'duda@empresa.com' });
    expect(ana.ofType('channelOpened').at(-1)?.channel).toMatchObject({
      id: dmChannelId('ana@empresa.com', 'duda@empresa.com', 'srv-b'),
      kind: 'dm',
    });

    // Abrir DM com Bia no srv-b não vaza para o servidor default nem lista DMs de fora.
    await ana.send({ type: 'openDm', email: 'bia@empresa.com' });
    expect(bia.ofType('channelsChanged')).toHaveLength(1);
    await bia.send({ type: 'channels' });
    const biaDms = bia
      .ofType('channels')
      .at(-1)!
      .channels.filter((c) => c.kind === 'dm');
    expect(biaDms.map((c) => c.id)).toEqual([
      dmChannelId('ana@empresa.com', 'bia@empresa.com', 'srv-b'),
    ]);

    // Mesmo se existir uma DM prévia gravada no srv-b com quem não é membro, ela é ocultada.
    await w.chat.openDirect('ana@empresa.com', 'caio@empresa.com', 'srv-b');
    await ana.send({ type: 'channels' });
    const anaDmIds = ana
      .ofType('channels')
      .at(-1)!
      .channels.filter((c) => c.kind === 'dm')
      .map((c) => c.id);
    expect(anaDmIds).not.toContain(
      dmChannelId('ana@empresa.com', 'caio@empresa.com', 'srv-b'),
    );
  });
});

describe('chamada de voz e vídeo', () => {
  const liveKit = () =>
    new MediaService({
      url: 'wss://virtual-office.exemplo.com/livekit',
      apiKey: 'chave',
      apiSecret: 'segredo-de-teste-com-mais-de-32-caracteres-ok',
    });

  const sitAtTable = (w: ReturnType<typeof world>, id: string, offset = 0) => {
    const player = w.office.players.get(id)!;
    player.x = 432 + offset * 32;
    player.y = 432;
  };

  it('na estrada não há chamada, mesmo com LiveKit', async () => {
    const w = world(liveKit());
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    await ana.send({ type: 'media' });
    expect(ana.ofType('mediaNone')).toHaveLength(1);
    expect(ana.ofType('media')).toHaveLength(0);
  });

  it('na estrada, quem está ao lado entra numa conversa com a outra pessoa', async () => {
    const w = world(liveKit());
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    const bia = await w.login('b', 'bia@empresa.com', 'Bia');
    const spawn = getMap('lobby').spawn;
    w.office.players.get('b')!.x = spawn.x + 32;
    await ana.send({ type: 'media' });
    await bia.send({ type: 'media' });
    expect(ana.ofType('media')[0]?.zone).toBe('perto-a');
    expect(bia.ofType('media')[0]?.zone).toBe('perto-a');

    w.office.players.get('b')!.x = spawn.x + 64;
    await bia.send({ type: 'media' });
    expect(bia.ofType('mediaNone')).toHaveLength(1);
  });

  it('numa mesa, sem LiveKit configurado, avisa que não há chamadas', async () => {
    const w = world();
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    sitAtTable(w, 'a');
    await ana.send({ type: 'media' });
    expect(ana.ofType('mediaUnavailable')).toHaveLength(1);
  });

  it('numa mesa, com LiveKit, devolve o acesso à chamada daquela zona', async () => {
    const w = world(liveKit());
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    sitAtTable(w, 'a');
    await ana.send({ type: 'media' });
    const media = ana.ofType('media')[0]!;
    expect(media.zone).toBe('mesa-7');
    expect(media.url).toBe('wss://virtual-office.exemplo.com/livekit');
    expect(media.token.split('.')).toHaveLength(3);
    const room = JSON.parse(atob(media.token.split('.')[1]!)).video.room;
    expect(room).toBe(callRoomName('lobby', 'mesa-7'));
    expect(callZoneId(getMap('lobby'), w.office.players.get('a')!)).toBe(
      'mesa-7',
    );
  });
});

describe('mesinhas adotáveis', () => {
  const config = {
    color: 2,
    rug: 1,
    items: ['lamp' as const, 'mug' as const],
    label: 'Meu canto',
    computer: 'laptopMonitor' as const,
    locked: false,
    position: null,
  };

  const goToDesk1 = (w: ReturnType<typeof world>, id: string) => {
    const player = w.office.players.get(id)!;
    player.x = 430;
    player.y = 160;
  };

  it('quem entra recebe a lista das mesas que já têm dono', async () => {
    const w = world();
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    expect(ana.ofType('desks')[0]?.desks).toEqual([]);

    goToDesk1(w, 'a');
    await ana.send({ type: 'deskAdopt', deskId: 'mesa-1' });
    const bia = await w.login('b', 'bia@empresa.com', 'Bia');
    expect(bia.ofType('desks')[0]?.desks).toMatchObject([
      {
        deskId: 'mesa-1',
        owner: { email: 'ana@empresa.com', name: 'Ana' },
      },
    ]);
  });

  it('adotar, decorar e devolver avisam todo mundo, em qualquer sala', async () => {
    const w = world();
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    const bia = await w.login('b', 'bia@empresa.com', 'Bia');
    w.office.players.get('b')!.map = 'andar-2';

    goToDesk1(w, 'a');
    await ana.send({ type: 'deskAdopt', deskId: 'mesa-1' });
    expect(bia.ofType('desk').at(-1)?.desk).toMatchObject({
      map: 'lobby',
      deskId: 'mesa-1',
      owner: { name: 'Ana' },
      config: { label: 'Mesa de Ana' },
    });

    await ana.send({ type: 'deskConfig', deskId: 'mesa-1', config });
    expect(bia.ofType('desk').at(-1)?.desk.config).toEqual(config);

    await ana.send({ type: 'deskRelease', deskId: 'mesa-1' });
    expect(bia.ofType('desk').at(-1)?.desk).toMatchObject({
      owner: null,
      deskId: 'mesa-1',
    });
  });

  it('só o dono decora ou devolve; os outros recebem o erro', async () => {
    const w = world();
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    const bia = await w.login('b', 'bia@empresa.com', 'Bia');
    goToDesk1(w, 'a');
    await ana.send({ type: 'deskAdopt', deskId: 'mesa-1' });
    goToDesk1(w, 'b');

    await bia.send({ type: 'deskConfig', deskId: 'mesa-1', config });
    await bia.send({ type: 'deskRelease', deskId: 'mesa-1' });
    await bia.send({ type: 'deskAdopt', deskId: 'mesa-1' });
    expect(bia.ofType('deskError').map((e) => e.code)).toEqual([
      'not_owner',
      'not_owner',
      'desk_taken',
    ]);
    expect(ana.ofType('desk')).toHaveLength(1);
  });

  it('não adota de longe nem uma segunda mesa', async () => {
    const w = world();
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    await ana.send({ type: 'deskAdopt', deskId: 'mesa-1' });
    expect(ana.ofType('deskError')[0]?.code).toBe('not_in_desk');

    goToDesk1(w, 'a');
    await ana.send({ type: 'deskAdopt', deskId: 'mesa-1' });
    w.office.players.get('a')!.x = 590;
    await ana.send({ type: 'deskAdopt', deskId: 'mesa-2' });
    expect(ana.ofType('deskError').at(-1)?.code).toBe('desk_limit');
  });

  it('recusa decoração fora das regras, antes mesmo de chegar à mesa', async () => {
    const w = world();
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    goToDesk1(w, 'a');
    await ana.send({ type: 'deskAdopt', deskId: 'mesa-1' });
    await ana.send({
      type: 'deskConfig',
      deskId: 'mesa-1',
      config: { ...config, items: ['plant', 'plant'] },
    });
    expect(ana.ofType('desk')).toHaveLength(1);
  });

  it('mesinha cheia: a quarta pessoa não entra e recebe o aviso', async () => {
    const w = world();
    const people = ['a', 'b', 'c', 'd'];
    const clients = [];
    for (const id of people) {
      const client = await w.login(id, `${id}@empresa.com`, id.toUpperCase());
      const player = w.office.players.get(id)!;
      player.x = [432, 464, 496, 496][people.indexOf(id)]!;
      player.y = 464;
      clients.push(client);
    }
    for (const [i, client] of clients.slice(0, 3).entries()) {
      await client.send({ type: 'move', x: [432, 464, 496][i]!, y: 432 });
    }
    await clients[3]!.send({ type: 'move', x: 496, y: 432 });
    expect(clients[3]!.ofType('zoneFull')[0]?.zone).toBe('Mesa 7');
    expect(clients[3]!.ofType('correct')).toHaveLength(1);
    expect(w.office.players.get('d')!.y).toBe(464);
  });

  it('desloca o dispositivo anterior ao logar em outro e permite assumir de volta com takeover', async () => {
    const w = world();
    const pc = await w.login('pc', 'ana@empresa.com', 'Ana');
    expect(w.office.players.has('pc')).toBe(true);

    // Segundo dispositivo com a mesma conta
    const mobile = await w.login('mobile', 'ana@empresa.com', 'Ana');
    expect(pc.ofType('sessionDisplaced')).toHaveLength(1);
    expect(mobile.ofType('multiDeviceNotice')).toEqual([
      { type: 'multiDeviceNotice', activeElsewhere: true },
    ]);
    expect(w.office.players.has('pc')).toBe(false);
    expect(w.office.players.has('mobile')).toBe(true);

    // Dispositivo anterior clica em "Usar aqui" (takeover)
    await pc.send({ type: 'takeover' });
    expect(mobile.ofType('sessionDisplaced')).toHaveLength(1);
    expect(pc.ofType('multiDeviceNotice')).toHaveLength(1);
    expect(w.office.players.has('pc')).toBe(true);
    expect(w.office.players.has('mobile')).toBe(false);

    // Fechar o socket deslocado não derruba o ativo
    await mobile.connection.dispose();
    expect(w.office.players.has('pc')).toBe(true);
  });

  it('kick desconecta o usuário, revoga o token e envia accountModerated', async () => {
    const w = world();
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    const bia = await w.login('b', 'bia@empresa.com', 'Bia');
    bia.inbox.length = 0;

    await ana.connection.kick('banned', 'Violação');
    expect(ana.ofType('accountModerated')).toEqual([
      { type: 'accountModerated', action: 'banned', reason: 'Violação' },
    ]);
    expect(ana.closed).toEqual({ code: 4403, reason: 'banned' });
    expect(w.office.players.has('a')).toBe(false);
    expect(bia.ofType('left')).toEqual([{ type: 'left', id: 'a' }]);
  });

  it('usuário no modo Ocupado não recebe acesso a chamadas (mediaNone)', async () => {
    const w = world();
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    const player = w.office.players.get('a')!;
    player.x = 432;
    player.y = 160;
    await ana.send({ type: 'status', status: 'busy' });
    ana.inbox.length = 0;

    await ana.send({ type: 'media' });
    expect(ana.ofType('mediaNone')).toHaveLength(1);
    expect(ana.ofType('media')).toHaveLength(0);
  });

  it('restrição automática no chat (chat_muted) remove automaticamente a mesa do usuário', async () => {
    const w = world();
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    const bia = await w.login('b', 'bia@empresa.com', 'Bia');
    // Coloca Ana na Mesa 1 e adota
    const player = w.office.players.get('a')!;
    player.x = 432;
    player.y = 160;
    await ana.send({ type: 'deskAdopt', deskId: 'mesa-1' });
    expect(await w.desks.list()).toHaveLength(1);
    bia.inbox.length = 0;

    // 3 mensagens com discurso de ódio disparam chat_muted na 3ª
    for (let i = 0; i < 3; i++) {
      w.advance(500);
      await ana.send({
        type: 'chat',
        channel: 'geral',
        text: `mensagem nazista ${i}`,
      });
    }
    expect(ana.ofType('chatError').at(-1)).toEqual({
      type: 'chatError',
      code: 'chat_muted',
    });
    expect(await w.desks.list()).toEqual([]);
    expect(bia.ofType('desk')).toEqual([
      expect.objectContaining({
        type: 'desk',
        desk: expect.objectContaining({ deskId: 'mesa-1', owner: null }),
      }),
    ]);
  });

  it('transmite digitando, edição e exclusão de mensagem em tempo real', async () => {
    const w = world();
    const ana = await w.login('a', 'ana@empresa.com', 'Ana');
    const bia = await w.login('b', 'bia@empresa.com', 'Bia');

    await ana.send({ type: 'typing', channel: 'geral', typing: true });
    expect(bia.ofType('typing')).toEqual([
      {
        type: 'typing',
        channel: 'geral',
        userId: 'ana@empresa.com',
        name: 'Ana',
        typing: true,
      },
    ]);

    await ana.send({ type: 'chat', channel: 'geral', text: 'oi pessoal' });
    const sent = ana.ofType('chat')[0]!;
    expect(sent.message.text).toBe('oi pessoal');

    await ana.send({
      type: 'editChat',
      channel: 'geral',
      messageId: sent.message.id,
      text: 'oi editado',
    });
    expect(bia.ofType('chatUpdated').at(-1)?.message.text).toBe('oi editado');

    await bia.send({
      type: 'editChat',
      channel: 'geral',
      messageId: sent.message.id,
      text: 'sem permissao',
    });
    expect(bia.ofType('chatError').at(-1)?.code).toBe('forbidden');

    await bia.send({
      type: 'deleteChat',
      channel: 'geral',
      messageId: sent.message.id,
    });
    expect(bia.ofType('chatError').at(-1)?.code).toBe('forbidden');

    await ana.send({ type: 'typing', channel: 'inexistente', typing: true });

    await ana.send({
      type: 'deleteChat',
      channel: 'geral',
      messageId: sent.message.id,
    });
    expect(bia.ofType('chatUpdated').at(-1)?.message.deletedAt).toBeDefined();
  });
});
