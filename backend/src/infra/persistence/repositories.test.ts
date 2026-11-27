import { join } from 'node:path';
import { newDb } from 'pg-mem';
import { beforeEach, describe, expect, it } from 'vitest';
import type {
  EmailCodeRepository,
  LocalAccountRepository,
} from '../../modules/auth/auth.repository.js';
import type {
  ChannelRepository,
  ChatRepository,
  ReadStateRepository,
} from '../../modules/chat/chat.repository.js';
import type { DeskRepository } from '../../modules/desks/desks.repository.js';
import type { ProfileRepository } from '../../modules/office/profile.repository.js';
import {
  CHAT_HISTORY_LIMIT,
  type ChatMessage,
} from '../../shared/domain/index.js';
import { loadMigrations, runMigrations } from '../database/migrate.js';
import type { SqlClient } from '../database/sql-client.js';
import {
  MemoryChannelRepository,
  MemoryChatRepository,
  MemoryDeskRepository,
  MemoryEmailCodeRepository,
  MemoryLocalAccountRepository,
  MemoryProfileRepository,
  MemoryReadStateRepository,
  MemoryRevocations,
} from './memory/index.js';
import {
  PgChannelRepository,
  PgChatRepository,
  PgDeskRepository,
  PgEmailCodeRepository,
  PgLocalAccountRepository,
  PgProfileRepository,
  PgReadStateRepository,
} from './postgres/index.js';

const message = (
  id: number,
  channel = 'geral',
  extra: Partial<ChatMessage> = {},
): ChatMessage => ({
  id: `m${String(id).padStart(4, '0')}`,
  channel,
  authorId: 'ana@empresa.com',
  author: 'Ana',
  color: 255,
  text: `texto ${id}`,
  at: 1000 + id,
  mentions: [],
  replyCount: 0,
  ...extra,
});

type Repos = {
  channels: ChannelRepository;
  chat: ChatRepository;
  reads: ReadStateRepository;
  profiles: ProfileRepository;
  desks: DeskRepository;
  local: LocalAccountRepository;
  emailCodes: EmailCodeRepository;
};

// A mesma bateria de testes roda na versão em memória e na do Postgres.
const suites: [string, () => Promise<Repos>][] = [
  [
    'memória',
    async () => ({
      channels: new MemoryChannelRepository(),
      chat: new MemoryChatRepository(),
      reads: new MemoryReadStateRepository(),
      profiles: new MemoryProfileRepository(),
      desks: new MemoryDeskRepository(),
      local: new MemoryLocalAccountRepository(),
      emailCodes: new MemoryEmailCodeRepository(),
    }),
  ],
  [
    'Postgres (pg-mem)',
    async () => {
      const { Pool } = newDb().adapters.createPg();
      const db = new Pool() as unknown as SqlClient;
      const migrations = loadMigrations(
        join(import.meta.dirname, '../../../migrations'),
      );
      await runMigrations(db, migrations, { lock: false });
      return {
        channels: new PgChannelRepository(db),
        chat: new PgChatRepository(db),
        reads: new PgReadStateRepository(db),
        profiles: new PgProfileRepository(db),
        desks: new PgDeskRepository(db),
        local: new PgLocalAccountRepository(db),
        emailCodes: new PgEmailCodeRepository(db),
      };
    },
  ],
];

describe.each(suites)('repositórios (%s)', (_name, setup) => {
  let repos: Repos;

  beforeEach(async () => {
    repos = await setup();
  });

  describe('canais', () => {
    it('já nasce com os canais iniciais', async () => {
      const names = (await repos.channels.listPublic()).map((c) => c.name);
      expect(names.sort()).toEqual(['aleatorio', 'geral', 'projetos']);
      expect(await repos.channels.get('geral')).toMatchObject({
        kind: 'public',
        archived: false,
      });
      expect(await repos.channels.get('nada')).toBeUndefined();
    });

    it('cria canais e recusa id repetido', async () => {
      const { channels } = repos;
      const design = {
        id: 'design',
        name: 'design',
        kind: 'public' as const,
        archived: false,
        createdBy: 'ana@x.com',
        createdAt: 5,
      };
      expect(await channels.create(design)).toBe(true);
      expect(await channels.create(design)).toBe(false);
      expect((await channels.get('design'))?.createdBy).toBe('ana@x.com');
    });

    it('arquiva canais', async () => {
      const { channels } = repos;
      expect(await channels.setArchived('geral', true)).toBe(true);
      expect((await channels.get('geral'))?.archived).toBe(true);
      expect(await channels.setArchived('nada', true)).toBe(false);
    });

    it('atualiza permissões e reordena canais públicos', async () => {
      const { channels } = repos;
      expect(
        await channels.updateConfig?.('projetos', {
          topic: 'Projetos ativos',
          viewTiers: ['master', 'admin', 'developer'],
          writeTiers: ['master', 'admin'],
          allowedEmails: ['extra@x.com'],
          blockedEmails: ['fora@x.com'],
        }),
      ).toBe(true);
      expect(await channels.updateConfig?.('inexistente', { topic: 'x' })).toBe(
        false,
      );
      const updated = await channels.get('projetos');
      expect(updated).toMatchObject({
        topic: 'Projetos ativos',
        viewTiers: ['master', 'admin', 'developer'],
        writeTiers: ['master', 'admin'],
        allowedEmails: ['extra@x.com'],
        blockedEmails: ['fora@x.com'],
      });

      await channels.reorder?.(['projetos', 'aleatorio', 'geral']);
      expect((await channels.listPublic()).map((c) => c.id)).toEqual([
        'projetos',
        'aleatorio',
        'geral',
      ]);
    });

    it('lista só as conversas diretas da pessoa', async () => {
      const { channels } = repos;
      const dm = (id: string) => ({
        id,
        name: id,
        kind: 'dm' as const,
        archived: false,
        createdBy: null,
        createdAt: 1,
      });
      await channels.create(dm('dm:ana@x.com|bia@x.com'));
      await channels.create(dm('dm:bia@x.com|caio@x.com'));
      await channels.create(dm('dm:ana@x.com|caio@x.com'));

      expect(
        (await channels.listDirect('bia@x.com')).map((c) => c.id).sort(),
      ).toEqual(['dm:ana@x.com|bia@x.com', 'dm:bia@x.com|caio@x.com']);
      expect(await channels.listDirect('ninguem@x.com')).toEqual([]);
      expect(
        (await channels.listPublic()).every((c) => c.kind === 'public'),
      ).toBe(true);
    });
  });

  describe('mensagens', () => {
    it('guarda e devolve as últimas de cada canal, em ordem, sem as respostas', async () => {
      const { chat } = repos;
      for (let i = 0; i < CHAT_HISTORY_LIMIT + 5; i++)
        await chat.save(message(i));
      await chat.save(message(500, 'projetos'));
      await chat.save(message(600, 'geral', { threadId: message(10).id }));

      const recent = await chat.recentRoots(
        ['geral', 'projetos'],
        CHAT_HISTORY_LIMIT,
      );
      const geral = recent.filter((m) => m.channel === 'geral');
      expect(geral).toHaveLength(CHAT_HISTORY_LIMIT);
      expect(geral[0]?.text).toBe('texto 5');
      expect(geral.at(-1)?.text).toBe(`texto ${CHAT_HISTORY_LIMIT + 4}`);
      expect(geral.every((m) => !m.threadId)).toBe(true);
      expect(recent.filter((m) => m.channel === 'projetos')).toHaveLength(1);
    });

    it('conta as respostas de cada mensagem e lista a conversa', async () => {
      const { chat } = repos;
      await chat.save(message(1));
      await chat.save(
        message(2, 'geral', { threadId: 'm0001', mentions: ['bia@x.com'] }),
      );
      await chat.save(message(3, 'geral', { threadId: 'm0001' }));

      const [root] = await chat.recentRoots(['geral'], 10);
      expect(root).toMatchObject({ id: 'm0001', replyCount: 2 });
      expect((await chat.replies('m0001')).map((m) => m.id)).toEqual([
        'm0002',
        'm0003',
      ]);
      expect(await chat.replies('m0002')).toEqual([]);
    });

    it('busca por id e guarda menções, ignorando a mesma mensagem salva duas vezes', async () => {
      const { chat } = repos;
      await chat.save(
        message(1, 'geral', { mentions: ['bia@x.com', 'caio@x.com'] }),
      );
      await chat.save(message(1));
      expect(await chat.byId('m0001')).toMatchObject({
        text: 'texto 1',
        mentions: ['bia@x.com', 'caio@x.com'],
      });
      expect(await chat.byId('nada')).toBeUndefined();
      expect(await chat.recentRoots(['geral'], 10)).toHaveLength(1);

      expect(await chat.updateMessage?.('nada', { text: 'x' })).toBeUndefined();
      const edited = await chat.updateMessage?.('m0001', {
        text: 'editado',
        editedAt: 2000,
      });
      expect(edited).toMatchObject({ text: 'editado', editedAt: 2000 });
      const deleted = await chat.updateMessage?.('m0001', {
        text: '',
        mentions: [],
        deletedAt: 3000,
      });
      expect(deleted).toMatchObject({ text: '', deletedAt: 3000 });
    });

    it('conta não lidas e menções depois de um instante, sem as mensagens da própria pessoa', async () => {
      const { chat } = repos;
      await chat.save(message(1));
      await chat.save(message(2, 'geral', { mentions: ['bia@x.com'] }));
      await chat.save(message(3, 'geral', { authorId: 'bia@x.com' }));

      expect(await chat.countSince('geral', 0, 'bia@x.com')).toEqual({
        unread: 2,
        mentions: 1,
      });
      expect(await chat.countSince('geral', 1001, 'bia@x.com')).toEqual({
        unread: 1,
        mentions: 1,
      });
      expect(await chat.countSince('geral', 5000, 'bia@x.com')).toEqual({
        unread: 0,
        mentions: 0,
      });
      expect(await chat.countSince('projetos', 0, 'bia@x.com')).toEqual({
        unread: 0,
        mentions: 0,
      });
    });
  });

  describe('leitura', () => {
    it('guarda até onde cada pessoa leu e nunca volta atrás', async () => {
      const { reads } = repos;
      expect((await reads.all('ana@x.com')).size).toBe(0);
      await reads.set('ana@x.com', 'geral', 100);
      await reads.set('ana@x.com', 'geral', 50);
      await reads.set('ana@x.com', 'projetos', 70);
      await reads.set('bia@x.com', 'geral', 10);

      expect(await reads.all('ana@x.com')).toEqual(
        new Map([
          ['geral', 100],
          ['projetos', 70],
        ]),
      );
      expect(await reads.all('bia@x.com')).toEqual(new Map([['geral', 10]]));
    });
  });

  describe('contas locais', () => {
    const ana = {
      nickname: 'AnaS',
      fullName: 'Ana Souza',
      email: 'ana@empresa.com',
      role: '',
      passwordHash: 'hash',
      createdAt: 5,
      tier: 'tester' as const,
      emailVerified: false,
      emailMarketingOptIn: null,
      uiTheme: null,
      mfaEnabled: false,
      mfaSecretEnc: null,
      mfaRecoveryHashes: [],
    };

    it('cria e acha pelo nickname, sem diferenciar maiúsculas', async () => {
      const { local } = repos;
      expect(await local.byNickname('anas')).toBeUndefined();
      expect(await local.create(ana)).toBe('ok');
      expect(await local.byNickname('ANAS')).toEqual(ana);
      expect(await local.byEmail('ana@empresa.com')).toEqual(ana);
      expect(await local.byEmail('ninguem@empresa.com')).toBeUndefined();
      expect((await local.all()).map((a) => a.email)).toEqual([
        'ana@empresa.com',
      ]);
      expect(await local.markVerified?.('ana@empresa.com')).toBe('ok');
      expect((await local.byEmail('ana@empresa.com'))?.emailVerified).toBe(
        true,
      );
      expect(
        await local.setUiTheme?.('ana@empresa.com', '{"presetId":"games"}'),
      ).toBe('ok');
      expect((await local.byEmail('ana@empresa.com'))?.uiTheme).toBe(
        '{"presetId":"games"}',
      );
    });

    it('muda os dados, troca o nickname e não rouba o de outra pessoa', async () => {
      const { local } = repos;
      await local.create(ana);
      await local.create({
        ...ana,
        nickname: 'bia',
        email: 'bia@parceiro.com',
      });
      expect(
        await local.update('ana@empresa.com', {
          nickname: 'ana.s',
          fullName: 'Ana S Souza',
          role: 'Dev',
        }),
      ).toBe('ok');
      expect(await local.byNickname('anas')).toBeUndefined();
      expect(await local.byNickname('ana.s')).toMatchObject({
        fullName: 'Ana S Souza',
        role: 'Dev',
        passwordHash: 'hash',
      });
      expect(
        await local.update('ana@empresa.com', {
          nickname: 'BIA',
          fullName: 'x',
          role: '',
        }),
      ).toBe('nickname_taken');
      expect(
        await local.update('ninguem@x.com', {
          nickname: 'zz',
          fullName: 'x',
          role: '',
        }),
      ).toBe('not_found');
      expect(
        await local.update('ana@empresa.com', {
          nickname: 'ana.s',
          fullName: 'Ana S Souza',
          role: 'Dev',
          passwordHash: 'novo',
        }),
      ).toBe('ok');
      expect((await local.byEmail('ana@empresa.com'))?.passwordHash).toBe(
        'novo',
      );
    });

    it('não repete nickname nem e-mail', async () => {
      const { local } = repos;
      await local.create(ana);
      expect(
        await local.create({ ...ana, nickname: 'anas', email: 'x@y.com' }),
      ).toBe('nickname_taken');
      expect(await local.create({ ...ana, nickname: 'outra' })).toBe(
        'email_taken',
      );
    });

    it('grava e remove banimento e restrição temporária', async () => {
      const { local } = repos;
      await local.create(ana);
      expect(
        await local.setModeration?.('ana@empresa.com', {
          bannedAt: 500,
          banReason: 'Conduta',
        }),
      ).toBe('ok');
      expect(await local.byEmail('ana@empresa.com')).toMatchObject({
        bannedAt: 500,
        banReason: 'Conduta',
      });

      expect(
        await local.setModeration?.('ana@empresa.com', {
          bannedAt: null,
          banReason: '',
          restrictedUntil: 900,
          restrictionReason: 'Pausa',
        }),
      ).toBe('ok');
      const afterUnban = await local.byEmail('ana@empresa.com');
      expect(afterUnban?.bannedAt).toBeUndefined();
      expect(afterUnban?.banReason).toBeUndefined();
      expect(afterUnban).toMatchObject({
        restrictedUntil: 900,
        restrictionReason: 'Pausa',
      });

      expect(
        await local.setModeration?.('ninguem@x.com', { bannedAt: 1 }),
      ).toBe('not_found');
    });

    it('atualiza cargo principal, cargos secundários e função exibida', async () => {
      const { local } = repos;
      await local.create(ana);
      expect(
        await local.setRoles?.('ana@empresa.com', {
          tier: 'developer',
          secondaryTiers: ['developer', 'admin', 'designer'],
          role: 'Tech Lead',
        }),
      ).toBe('ok');
      expect(await local.byEmail('ana@empresa.com')).toMatchObject({
        tier: 'developer',
        secondaryTiers: ['admin', 'designer'],
        role: 'Tech Lead',
      });

      expect(
        await local.setRoles?.('ana@empresa.com', {
          tier: 'tester',
          secondaryTiers: [],
        }),
      ).toBe('ok');
      const cleared = await local.byEmail('ana@empresa.com');
      expect(cleared?.tier).toBe('tester');
      expect(cleared?.secondaryTiers).toBeUndefined();
      expect(cleared?.role).toBe('Tech Lead');

      expect(
        await local.setRoles?.('ninguem@x.com', {
          tier: 'tester',
          secondaryTiers: [],
        }),
      ).toBe('not_found');
    });
  });

  describe('códigos de e-mail', () => {
    it('grava, substitui, conta tentativas e remove', async () => {
      const { emailCodes } = repos;
      expect(await emailCodes.get('ana@x.com', 'register')).toBeUndefined();

      await emailCodes.put({
        email: 'ana@x.com',
        purpose: 'register',
        codeHash: 'hash1',
        expiresAt: 1000,
        sentAt: 100,
        attempts: 0,
      });
      expect(await emailCodes.get('ana@x.com', 'register')).toEqual({
        email: 'ana@x.com',
        purpose: 'register',
        codeHash: 'hash1',
        expiresAt: 1000,
        sentAt: 100,
        attempts: 0,
      });

      await emailCodes.bump('ana@x.com', 'register');
      expect((await emailCodes.get('ana@x.com', 'register'))?.attempts).toBe(1);

      await emailCodes.put({
        email: 'ana@x.com',
        purpose: 'register',
        codeHash: 'hash2',
        expiresAt: 2000,
        sentAt: 200,
        attempts: 0,
      });
      expect(await emailCodes.get('ana@x.com', 'register')).toMatchObject({
        codeHash: 'hash2',
        attempts: 0,
      });

      await emailCodes.remove('ana@x.com', 'register');
      expect(await emailCodes.get('ana@x.com', 'register')).toBeUndefined();
    });
  });

  describe('perfis', () => {
    const appearance = { skin: 1, hair: 2, style: 3, shirt: 4 };

    it('cria no primeiro acesso, atualiza o nome e guarda a aparência', async () => {
      const { profiles } = repos;
      expect(await profiles.get('ana@x.com')).toBeUndefined();

      await profiles.touch('ana@x.com', 'Ana', 10);
      expect(await profiles.get('ana@x.com')).toEqual({
        email: 'ana@x.com',
        name: 'Ana',
        appearance: null,
        lastSeen: 10,
        position: null,
      });

      await profiles.setAppearance('ana@x.com', appearance);
      await profiles.touch('ana@x.com', 'Ana Maria', 20);
      expect(await profiles.get('ana@x.com')).toMatchObject({
        name: 'Ana Maria',
        appearance,
        lastSeen: 20,
      });
    });

    it('guarda o último lugar, e entrar de novo não o apaga', async () => {
      const { profiles } = repos;
      await profiles.setPosition('ninguem@x.com', { map: 'lobby', x: 1, y: 2 });
      expect(await profiles.get('ninguem@x.com')).toBeUndefined();

      await profiles.touch('ana@x.com', 'Ana', 10);
      await profiles.setPosition('ana@x.com', {
        map: 'andar-2',
        x: 176,
        y: 304,
      });
      await profiles.touch('ana@x.com', 'Ana', 20);
      expect((await profiles.get('ana@x.com'))?.position).toEqual({
        map: 'andar-2',
        x: 176,
        y: 304,
      });
    });

    it('acha pessoas pelo início do e-mail, sem confundir curingas', async () => {
      const { profiles } = repos;
      await profiles.touch('bruno.dias@empresa.com', 'Bruno', 1);
      await profiles.touch('ana@empresa.com', 'Ana', 1);
      await profiles.touch('ana_x@empresa.com', 'Ana X', 1);

      expect(
        (await profiles.byHandles(['bruno.dias'])).map((p) => p.name),
      ).toEqual(['Bruno']);
      expect(
        (await profiles.byHandles(['ana', 'bruno.dias']))
          .map((p) => p.name)
          .sort(),
      ).toEqual(['Ana', 'Bruno']);
      expect((await profiles.byHandles(['ana_x'])).map((p) => p.name)).toEqual([
        'Ana X',
      ]);
      expect(await profiles.byHandles(['ninguem'])).toEqual([]);
    });

    it('lista o diretório por nome, com limite', async () => {
      const { profiles } = repos;
      await profiles.touch('c@x.com', 'Caio', 1);
      await profiles.touch('a@x.com', 'Ana', 1);
      await profiles.touch('b@x.com', 'Bia', 1);
      expect((await profiles.directory(10)).map((p) => p.name)).toEqual([
        'Ana',
        'Bia',
        'Caio',
      ]);
      expect(await profiles.directory(2)).toHaveLength(2);
    });
  });

  describe('mesinhas', () => {
    const record = (deskId: string, email: string, map = 'lobby') => ({
      map,
      deskId,
      serverId: 'default',
      ownerEmail: email,
      ownerName: email.split('@')[0]!,
      ownerRole: 'Dev',
      config: {
        color: 1,
        rug: 2,
        items: ['lamp' as const],
        label: `Mesa ${deskId}`,
        computer: 'dualMonitor' as const,
        locked: false,
        position: null,
      },
      updatedAt: 5,
    });

    it('adota, busca e guarda a decoração', async () => {
      const { desks } = repos;
      expect(await desks.adopt(record('mesa-1', 'a@x.com'))).toBe(true);
      expect(await desks.get('lobby', 'mesa-1')).toEqual(
        record('mesa-1', 'a@x.com'),
      );
      expect(await desks.byOwner('a@x.com')).toMatchObject({
        deskId: 'mesa-1',
      });
      expect(await desks.get('lobby', 'mesa-2')).toBeUndefined();
      expect(await desks.byOwner('b@x.com')).toBeUndefined();
      expect(await desks.all()).toHaveLength(1);
    });

    it('a mesa tem um dono só e cada pessoa tem uma mesa só', async () => {
      const { desks } = repos;
      await desks.adopt(record('mesa-1', 'a@x.com'));
      expect(await desks.adopt(record('mesa-1', 'b@x.com'))).toBe(false);
      expect(await desks.adopt(record('mesa-2', 'a@x.com'))).toBe(false);
      expect(await desks.adopt(record('mesa-1', 'b@x.com', 'andar-2'))).toBe(
        true,
      );
    });

    it('muda a decoração, atualiza nome/cargo do dono e devolve a mesa', async () => {
      const { desks } = repos;
      await desks.adopt(record('mesa-1', 'a@x.com'));
      const config = {
        color: 3,
        rug: null,
        items: [],
        label: 'Novo',
        computer: 'laptop' as const,
        locked: false,
        position: null,
      };
      expect(await desks.setConfig('lobby', 'mesa-1', config, 9)).toBe(true);
      expect((await desks.get('lobby', 'mesa-1'))?.config).toEqual(config);
      expect((await desks.get('lobby', 'mesa-1'))?.updatedAt).toBe(9);
      expect(await desks.setConfig('lobby', 'mesa-9', config, 9)).toBe(false);

      expect(await desks.setOwner('a@x.com', 'Ana Nova', 'Lead')).toBe(true);
      expect(await desks.get('lobby', 'mesa-1')).toMatchObject({
        ownerName: 'Ana Nova',
        ownerRole: 'Lead',
      });
      expect(await desks.setOwner('ninguem@x.com', 'X', '')).toBe(false);

      expect(await desks.release('lobby', 'mesa-1')).toBe(true);
      expect(await desks.release('lobby', 'mesa-1')).toBe(false);
      expect(await desks.all()).toEqual([]);
      expect(await desks.adopt(record('mesa-2', 'a@x.com'))).toBe(true);
    });
  });
});

describe('MemoryRevocations', () => {
  it('encerra a sessão até o tempo dela acabar', async () => {
    let time = 0;
    const revocations = new MemoryRevocations(() => time);
    expect(await revocations.isRevoked('s1')).toBe(false);
    await revocations.revoke('s1', 10);
    expect(await revocations.isRevoked('s1')).toBe(true);
    time = 10_000;
    expect(await revocations.isRevoked('s1')).toBe(false);
  });
});
