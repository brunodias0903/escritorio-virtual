import { describe, expect, it } from 'vitest';
import {
  MemoryChannelRepository,
  MemoryDeskRepository,
  MemoryEmailCodeRepository,
  MemoryFeedbackRepository,
  MemoryLocalAccountRepository,
  MemoryRateLimiter,
  MemoryRevocations,
  MemoryServerInviteRepository,
  MemoryServerRepository,
  MemoryServerSettingsRepository,
} from '../../infra/persistence/memory/index.js';
import {
  PgFeedbackRepository,
  PgServerInviteRepository,
  PgServerRepository,
  PgServerSettingsRepository,
} from '../../infra/persistence/postgres/index.js';
import type { SqlClient } from '../../infra/database/sql-client.js';
import { parseAccountAccess } from '../../shared/domain/index.js';
import { AuthService } from '../auth/auth.service.js';
import { DeskService } from '../desks/desks.service.js';
import { handleWorkspaceRoutes } from './workspace.http.js';
import { WorkspaceService } from './workspace.service.js';

const SECRET = 'test-secret-key-for-workspace-http';

const createHarness = async () => {
  const accounts = new MemoryLocalAccountRepository();
  const channels = new MemoryChannelRepository();
  const settings = new MemoryServerSettingsRepository();
  const feedback = new MemoryFeedbackRepository();

  const auth = new AuthService({
    accounts,
    secret: SECRET,
    adminEmails: ['master@setter.app'],
    access: parseAccountAccess('setter.app', ''),
    loginLimiter: new MemoryRateLimiter(100, 60_000),
    revocations: new MemoryRevocations(),
    codes: null,
    verifyCodes: null,
  });

  // Registra master e tester
  const masterReg = await auth.register(
    {
      fullName: 'Bruno Master',
      nickname: 'master',
      email: 'master@setter.app',
      role: 'Founder',
      password: 'Password123!',
    },
    '127.0.0.1',
  );
  if (!masterReg.ok) throw new Error('master reg failed');

  const devReg = await auth.register(
    {
      fullName: 'Ana Dev',
      nickname: 'anadev',
      email: 'dev@setter.app',
      role: 'Dev',
      password: 'Password123!',
    },
    '127.0.0.1',
  );
  if (!devReg.ok) throw new Error('dev reg failed');
  const devAccount = await accounts.byEmail('dev@setter.app');
  if (devAccount) devAccount.tier = 'developer';

  const desks = new DeskService(new MemoryDeskRepository());
  const servers = new MemoryServerRepository();
  const invites = new MemoryServerInviteRepository();
  const workspace = new WorkspaceService({
    settings,
    feedback,
    channels,
    accounts,
    desks,
    servers,
    invites,
    adminEmails: ['master@setter.app'],
    onChannelsChanged: () => {},
  });

  return {
    auth,
    workspace,
    desks,
    masterToken: masterReg.value.token,
    devToken: devReg.value.token,
    emailCodes: new MemoryEmailCodeRepository(),
  };
};

describe('handleWorkspaceRoutes', () => {
  it('retorna null para rotas desconhecidas', async () => {
    const { auth, workspace } = await createHarness();
    const res = await handleWorkspaceRoutes(auth, workspace, {
      method: 'GET',
      path: '/api/other',
      authorization: undefined,
      body: undefined,
      ip: '127.0.0.1',
    });
    expect(res).toBeNull();
  });

  it('cobre GET/PUT /api/server, /api/server/channels e /api/feedback', async () => {
    const { auth, workspace, masterToken, devToken } = await createHarness();

    // GET /api/server (público)
    const getServer = await handleWorkspaceRoutes(auth, workspace, {
      method: 'GET',
      path: '/api/server',
      authorization: undefined,
      body: undefined,
      ip: '127.0.0.1',
    });
    expect(getServer?.status).toBe(200);

    // PUT /api/server sem auth -> 401
    const unauthPut = await handleWorkspaceRoutes(auth, workspace, {
      method: 'PUT',
      path: '/api/server',
      authorization: undefined,
      body: { name: 'X' },
      ip: '127.0.0.1',
    });
    expect(unauthPut?.status).toBe(401);

    // PUT /api/server inválido -> 400
    const badPut = await handleWorkspaceRoutes(auth, workspace, {
      method: 'PUT',
      path: '/api/server',
      authorization: `Bearer ${masterToken}`,
      body: { name: '' },
      ip: '127.0.0.1',
    });
    expect(badPut?.status).toBe(400);

    // PUT /api/server válido -> 200
    const okPut = await handleWorkspaceRoutes(auth, workspace, {
      method: 'PUT',
      path: '/api/server',
      authorization: `Bearer ${masterToken}`,
      body: {
        name: 'Setter Pro',
        description: 'Desc',
        welcomeMessage: 'Olá',
        allowPublicRegistration: true,
      },
      ip: '127.0.0.1',
    });
    expect(okPut?.status).toBe(200);

    // Método não permitido
    const badMethod = await handleWorkspaceRoutes(auth, workspace, {
      method: 'DELETE',
      path: '/api/server',
      authorization: undefined,
      body: undefined,
      ip: '127.0.0.1',
    });
    expect(badMethod?.status).toBe(405);

    // Canais: GET, POST, PUT
    const listCh = await handleWorkspaceRoutes(auth, workspace, {
      method: 'GET',
      path: '/api/server/channels',
      authorization: `Bearer ${masterToken}`,
      body: undefined,
      ip: '127.0.0.1',
    });
    expect(listCh?.status).toBe(200);

    const createCh = await handleWorkspaceRoutes(auth, workspace, {
      method: 'POST',
      path: '/api/server/channels',
      authorization: `Bearer ${masterToken}`,
      body: {
        name: 'anuncios',
        topic: 'Avisos oficiais',
        writeTiers: ['admin'],
      },
      ip: '127.0.0.1',
    });
    expect(createCh?.status).toBe(201);

    const updateCh = await handleWorkspaceRoutes(auth, workspace, {
      method: 'PUT',
      path: '/api/server/channels/anuncios',
      authorization: `Bearer ${masterToken}`,
      body: {
        topic: 'Comunicados',
        writeTiers: ['master', 'admin'],
        archived: false,
      },
      ip: '127.0.0.1',
    });
    expect(updateCh?.status).toBe(200);

    // Feedback: POST, GET, PATCH, comments
    const postFb = await handleWorkspaceRoutes(auth, workspace, {
      method: 'POST',
      path: '/api/feedback',
      authorization: `Bearer ${devToken}`,
      body: {
        kind: 'suggestion',
        title: 'Adicionar atalhos',
        description: 'Atalhos de teclado facilitam o uso.',
      },
      ip: '127.0.0.1',
    });
    expect(postFb?.status).toBe(201);
    const fbId = (postFb?.body as { item: { id: string } }).item.id;

    const listFb = await handleWorkspaceRoutes(auth, workspace, {
      method: 'GET',
      path: '/api/feedback',
      authorization: `Bearer ${devToken}`,
      body: undefined,
      ip: '127.0.0.1',
    });
    expect(listFb?.status).toBe(200);

    const patchFb = await handleWorkspaceRoutes(auth, workspace, {
      method: 'PATCH',
      path: `/api/feedback/${fbId}`,
      authorization: `Bearer ${devToken}`,
      body: {
        mrUrl: 'https://github.com/org/repo/pull/99',
        status: 'in_progress',
      },
      ip: '127.0.0.1',
    });
    expect(patchFb?.status).toBe(200);

    const commentFb = await handleWorkspaceRoutes(auth, workspace, {
      method: 'POST',
      path: `/api/feedback/${fbId}/comments`,
      authorization: `Bearer ${masterToken}`,
      body: { body: 'Excelente ideia!' },
      ip: '127.0.0.1',
    });
    expect(commentFb?.status).toBe(201);
  });

  it('cobre rotas HTTP de moderação (/api/server/accounts, moderate e delete desk)', async () => {
    const { auth, workspace, desks, masterToken, devToken } =
      await createHarness();

    await desks.adopt(
      { email: 'dev@setter.app', name: 'Ana Dev' },
      { map: 'lobby', x: 430, y: 160 },
      'mesa-1',
    );

    // Dev não acessa lista de contas
    const denied = await handleWorkspaceRoutes(auth, workspace, {
      method: 'GET',
      path: '/api/server/accounts',
      authorization: `Bearer ${devToken}`,
      body: undefined,
      ip: '127.0.0.1',
    });
    expect(denied?.status).toBe(403);

    // Master lista contas
    const listed = await handleWorkspaceRoutes(auth, workspace, {
      method: 'GET',
      path: '/api/server/accounts',
      authorization: `Bearer ${masterToken}`,
      body: undefined,
      ip: '127.0.0.1',
    });
    expect(listed?.status).toBe(200);

    // Master altera cargo principal + secundários via HTTP
    const setRoles = await handleWorkspaceRoutes(auth, workspace, {
      method: 'PUT',
      path: '/api/server/accounts/dev%40setter.app/roles',
      authorization: `Bearer ${masterToken}`,
      body: {
        tier: 'developer',
        secondaryTiers: ['designer', 'tester'],
        role: 'Staff Engineer',
      },
      ip: '127.0.0.1',
    });
    expect(setRoles?.status).toBe(200);
    expect(setRoles?.body).toMatchObject({
      account: {
        email: 'dev@setter.app',
        tier: 'developer',
        secondaryTiers: ['designer', 'tester'],
        role: 'Staff Engineer',
      },
    });

    // Valida 405, 401 e 400 nas rotas de contas/moderação
    expect(
      (
        await handleWorkspaceRoutes(auth, workspace, {
          method: 'POST',
          path: '/api/server/accounts',
          authorization: undefined,
          body: undefined,
          ip: '127.0.0.1',
        })
      )?.status,
    ).toBe(405);
    expect(
      (
        await handleWorkspaceRoutes(auth, workspace, {
          method: 'GET',
          path: '/api/server/accounts',
          authorization: undefined,
          body: undefined,
          ip: '127.0.0.1',
        })
      )?.status,
    ).toBe(401);
    expect(
      (
        await handleWorkspaceRoutes(auth, workspace, {
          method: 'GET',
          path: '/api/server/accounts/dev%40setter.app/roles',
          authorization: undefined,
          body: undefined,
          ip: '127.0.0.1',
        })
      )?.status,
    ).toBe(405);
    expect(
      (
        await handleWorkspaceRoutes(auth, workspace, {
          method: 'PUT',
          path: '/api/server/accounts/dev%40setter.app/roles',
          authorization: `Bearer ${masterToken}`,
          body: { tier: 'invalido' },
          ip: '127.0.0.1',
        })
      )?.status,
    ).toBe(400);
    expect(
      (
        await handleWorkspaceRoutes(auth, workspace, {
          method: 'GET',
          path: '/api/server/accounts/dev%40setter.app/moderate',
          authorization: undefined,
          body: undefined,
          ip: '127.0.0.1',
        })
      )?.status,
    ).toBe(405);
    expect(
      (
        await handleWorkspaceRoutes(auth, workspace, {
          method: 'POST',
          path: '/api/server/accounts/dev%40setter.app/moderate',
          authorization: `Bearer ${masterToken}`,
          body: { action: 'invalida' },
          ip: '127.0.0.1',
        })
      )?.status,
    ).toBe(400);
    expect(
      (
        await handleWorkspaceRoutes(auth, workspace, {
          method: 'GET',
          path: '/api/server/accounts/dev%40setter.app/desk',
          authorization: undefined,
          body: undefined,
          ip: '127.0.0.1',
        })
      )?.status,
    ).toBe(405);

    // Master remove mesa diretamente via HTTP
    const delDesk = await handleWorkspaceRoutes(auth, workspace, {
      method: 'DELETE',
      path: '/api/server/accounts/dev%40setter.app/desk',
      authorization: `Bearer ${masterToken}`,
      body: undefined,
      ip: '127.0.0.1',
    });
    expect(delDesk?.status).toBe(200);
    expect(await desks.list()).toEqual([]);

    // Master bane conta (e token antigo deixa de autenticar)
    await desks.adopt(
      { email: 'dev@setter.app', name: 'Ana Dev' },
      { map: 'lobby', x: 430, y: 160 },
      'mesa-1',
    );
    const banned = await handleWorkspaceRoutes(auth, workspace, {
      method: 'POST',
      path: '/api/server/accounts/dev%40setter.app/moderate',
      authorization: `Bearer ${masterToken}`,
      body: { action: 'ban', reason: 'Teste' },
      ip: '127.0.0.1',
    });
    expect(banned?.status).toBe(200);
    expect(await desks.list()).toEqual([]);
    expect(await auth.authenticate(devToken)).toBeNull();
  });

  it('exercita PgServerSettingsRepository e PgFeedbackRepository com SqlClient mock', async () => {
    const queries: string[] = [];
    const fakeDb: SqlClient = {
      query: async (sql: string) => {
        queries.push(sql);
        if (sql.includes('FROM server_settings')) {
          return {
            rows: [
              {
                name: 'Setter',
                description: 'Desc',
                icon: null,
                welcome_message: '',
                allow_public_registration: true,
                updated_at: '10',
              },
            ],
            rowCount: 1,
          };
        }
        if (sql.includes('FROM feedback_items')) {
          return {
            rows: [
              {
                id: 'fb-1',
                kind: 'bug',
                title: 'Bug',
                description: 'Detalhes',
                status: 'open',
                author_email: 'a@b.com',
                author_name: 'Ana',
                mr_url: null,
                created_at: '100',
                updated_at: '100',
                updated_by: null,
              },
            ],
            rowCount: 1,
          };
        }
        if (sql.includes('FROM feedback_comments')) {
          return {
            rows: [
              {
                id: 'c-1',
                feedback_id: 'fb-1',
                author_email: 'a@b.com',
                author_name: 'Ana',
                author_tier: 'master',
                body: 'Oi',
                created_at: '101',
              },
            ],
            rowCount: 1,
          };
        }
        return { rows: [], rowCount: 1 };
      },
    };

    const pgSettings = new PgServerSettingsRepository(fakeDb);
    const s = await pgSettings.get();
    expect(s.name).toBe('Setter');
    await pgSettings.save(s, 'master@setter.app');

    const pgFb = new PgFeedbackRepository(fakeDb);
    const list = await pgFb.list();
    expect(list).toHaveLength(1);
    expect(list[0]?.comments).toHaveLength(1);
    const one = await pgFb.get('fb-1');
    expect(one?.id).toBe('fb-1');
    await pgFb.create(one!);
    await pgFb.update('fb-1', {
      status: 'done',
      mrUrl: 'https://github.com/a/b/pull/1',
      updatedAt: 200,
      updatedBy: 'master@setter.app',
    });
    await pgFb.addComment({
      id: 'c-2',
      feedbackId: 'fb-1',
      authorEmail: 'a@b.com',
      authorName: 'Ana',
      authorTier: 'tester',
      body: 'Testado',
      createdAt: 201,
    });
    expect(queries.length).toBeGreaterThan(5);
  });

  it('reordena canais e atualiza permissões de visualização, escrita e exceções por e-mail', async () => {
    const { auth, workspace, masterToken, devToken } = await createHarness();

    // Criar canal restrito com visibilidade + escrita + exceções
    const created = await handleWorkspaceRoutes(auth, workspace, {
      method: 'POST',
      path: '/api/server/channels',
      authorization: `Bearer ${masterToken}`,
      body: {
        name: 'diretoria',
        topic: 'Assuntos internos',
        viewTiers: ['admin', 'developer'],
        writeTiers: ['admin', 'tester'], // tester não está em viewTiers -> filtrado
        allowedEmails: ['Convidado@Setter.App'],
        blockedEmails: ['Bloqueado@Setter.App'],
      },
      ip: '127.0.0.1',
    });
    expect(created?.status).toBe(201);
    const ch = (
      created?.body as {
        channel: {
          viewTiers: string[];
          writeTiers: string[];
          allowedEmails: string[];
          blockedEmails: string[];
        };
      }
    ).channel;
    expect(ch.viewTiers).toEqual(['master', 'admin', 'developer']);
    expect(ch.writeTiers).toEqual(['master', 'admin']);
    expect(ch.allowedEmails).toEqual(['convidado@setter.app']);
    expect(ch.blockedEmails).toEqual(['bloqueado@setter.app']);

    // Atualizar permissões do canal
    const updated = await handleWorkspaceRoutes(auth, workspace, {
      method: 'PUT',
      path: '/api/server/channels/diretoria',
      authorization: `Bearer ${masterToken}`,
      body: {
        viewTiers: ['admin'],
        writeTiers: ['admin', 'developer'],
        allowedEmails: ['x@setter.app', 'bloqueado@setter.app'],
        blockedEmails: ['bloqueado@setter.app'],
      },
      ip: '127.0.0.1',
    });
    expect(updated?.status).toBe(200);
    const updatedCh = (
      updated?.body as {
        channel: {
          viewTiers: string[];
          writeTiers: string[];
          allowedEmails: string[];
        };
      }
    ).channel;
    expect(updatedCh.viewTiers).toEqual(['master', 'admin']);
    expect(updatedCh.writeTiers).toEqual(['master', 'admin']);
    expect(updatedCh.allowedEmails).toEqual(['x@setter.app']);

    // Reordenar canais: validação de método, auth, permissão e payload
    expect(
      (
        await handleWorkspaceRoutes(auth, workspace, {
          method: 'GET',
          path: '/api/server/channels/reorder',
          authorization: `Bearer ${masterToken}`,
          body: undefined,
          ip: '127.0.0.1',
        })
      )?.status,
    ).toBe(405);
    expect(
      (
        await handleWorkspaceRoutes(auth, workspace, {
          method: 'PUT',
          path: '/api/server/channels/reorder',
          authorization: undefined,
          body: { channelIds: ['projetos', 'geral'] },
          ip: '127.0.0.1',
        })
      )?.status,
    ).toBe(401);
    expect(
      (
        await handleWorkspaceRoutes(auth, workspace, {
          method: 'PUT',
          path: '/api/server/channels/reorder',
          authorization: `Bearer ${masterToken}`,
          body: { channelIds: [] },
          ip: '127.0.0.1',
        })
      )?.status,
    ).toBe(400);
    expect(
      (
        await handleWorkspaceRoutes(auth, workspace, {
          method: 'PUT',
          path: '/api/server/channels/reorder',
          authorization: `Bearer ${devToken}`,
          body: { channelIds: ['projetos', 'geral'] },
          ip: '127.0.0.1',
        })
      )?.status,
    ).toBe(403);

    const reordered = await handleWorkspaceRoutes(auth, workspace, {
      method: 'PUT',
      path: '/api/server/channels/reorder',
      authorization: `Bearer ${masterToken}`,
      body: { channelIds: ['diretoria', 'projetos', 'geral', 'aleatorio'] },
      ip: '127.0.0.1',
    });
    expect(reordered?.status).toBe(200);
    const ids = (
      reordered?.body as { channels: Array<{ id: string }> }
    ).channels.map((c) => c.id);
    expect(ids).toEqual(['diretoria', 'projetos', 'geral', 'aleatorio']);
  });

  it('cobre endpoints HTTP de servidores e convites', async () => {
    const { auth, workspace, masterToken, devToken } = await createHarness();

    expect(
      (
        await handleWorkspaceRoutes(auth, workspace, {
          method: 'GET',
          path: '/api/servers',
          authorization: undefined,
          body: undefined,
          ip: '127.0.0.1',
        })
      )?.status,
    ).toBe(401);

    const listInit = await handleWorkspaceRoutes(auth, workspace, {
      method: 'GET',
      path: '/api/servers',
      authorization: `Bearer ${masterToken}`,
      body: undefined,
      ip: '127.0.0.1',
    });
    expect(listInit?.status).toBe(200);

    const created = await handleWorkspaceRoutes(auth, workspace, {
      method: 'POST',
      path: '/api/servers',
      authorization: `Bearer ${masterToken}`,
      body: {
        name: 'Squad Produto',
        description: 'Time de produto',
        accentColor: '#10b981',
        visibility: 'invite',
      },
      ip: '127.0.0.1',
    });
    expect(created?.status).toBe(201);
    const serverId = (created?.body as { server: { id: string } }).server.id;

    const invCreated = await handleWorkspaceRoutes(auth, workspace, {
      method: 'POST',
      path: `/api/servers/${serverId}/invites`,
      authorization: `Bearer ${masterToken}`,
      body: { maxUses: 2, expiresInHours: 24 },
      ip: '127.0.0.1',
    });
    expect(invCreated?.status).toBe(201);
    const code = (invCreated?.body as { invite: { code: string } }).invite.code;

    const invList = await handleWorkspaceRoutes(auth, workspace, {
      method: 'GET',
      path: `/api/servers/${serverId}/invites`,
      authorization: `Bearer ${masterToken}`,
      body: undefined,
      ip: '127.0.0.1',
    });
    expect(invList?.status).toBe(200);

    const joined = await handleWorkspaceRoutes(auth, workspace, {
      method: 'POST',
      path: '/api/servers/join',
      authorization: `Bearer ${devToken}`,
      body: { code },
      ip: '127.0.0.1',
    });
    expect(joined?.status).toBe(200);

    const revoked = await handleWorkspaceRoutes(auth, workspace, {
      method: 'DELETE',
      path: `/api/servers/${serverId}/invites/${code}`,
      authorization: `Bearer ${masterToken}`,
      body: undefined,
      ip: '127.0.0.1',
    });
    expect(revoked?.status).toBe(200);

    // E-mails convidados
    const addedEmail = await handleWorkspaceRoutes(auth, workspace, {
      method: 'POST',
      path: `/api/servers/${serverId}/email-invites`,
      authorization: `Bearer ${masterToken}`,
      body: { email: 'vmns50@gmail.com' },
      ip: '127.0.0.1',
    });
    expect(addedEmail?.status).toBe(201);
    const listedEmails = await handleWorkspaceRoutes(auth, workspace, {
      method: 'GET',
      path: `/api/servers/${serverId}/email-invites`,
      authorization: `Bearer ${masterToken}`,
      body: undefined,
      ip: '127.0.0.1',
    });
    expect(listedEmails?.status).toBe(200);
    expect(
      (listedEmails?.body as { emails: Array<{ email: string }> }).emails.map(
        (e) => e.email,
      ),
    ).toEqual(['vmns50@gmail.com']);
    const removedEmail = await handleWorkspaceRoutes(auth, workspace, {
      method: 'DELETE',
      path: `/api/servers/${serverId}/email-invites/vmns50@gmail.com`,
      authorization: `Bearer ${masterToken}`,
      body: undefined,
      ip: '127.0.0.1',
    });
    expect(removedEmail?.status).toBe(200);
    expect(
      (
        await handleWorkspaceRoutes(auth, workspace, {
          method: 'PUT',
          path: `/api/servers/${serverId}/email-invites`,
          authorization: `Bearer ${masterToken}`,
          body: undefined,
          ip: '127.0.0.1',
        })
      )?.status,
    ).toBe(405);
    expect(
      (
        await handleWorkspaceRoutes(auth, workspace, {
          method: 'POST',
          path: `/api/servers/${serverId}/email-invites`,
          authorization: `Bearer ${masterToken}`,
          body: { email: 'invalido' },
          ip: '127.0.0.1',
        })
      )?.status,
    ).toBe(400);

    expect(
      (
        await handleWorkspaceRoutes(auth, workspace, {
          method: 'POST',
          path: '/api/servers',
          authorization: `Bearer ${devToken}`,
          body: { name: 'Sem Permissão' },
          ip: '127.0.0.1',
        })
      )?.status,
    ).toBe(403);
    expect(
      (
        await handleWorkspaceRoutes(auth, workspace, {
          method: 'POST',
          path: '/api/servers',
          authorization: `Bearer ${masterToken}`,
          body: { name: '' },
          ip: '127.0.0.1',
        })
      )?.status,
    ).toBe(400);
    expect(
      (
        await handleWorkspaceRoutes(auth, workspace, {
          method: 'POST',
          path: '/api/servers/join',
          authorization: `Bearer ${devToken}`,
          body: { code: '' },
          ip: '127.0.0.1',
        })
      )?.status,
    ).toBe(400);
    expect(
      (
        await handleWorkspaceRoutes(auth, workspace, {
          method: 'PUT',
          path: '/api/servers',
          authorization: `Bearer ${masterToken}`,
          body: undefined,
          ip: '127.0.0.1',
        })
      )?.status,
    ).toBe(405);
  });

  it('cobre PgServerRepository e PgServerInviteRepository com SqlClient mockado', async () => {
    const serverRow = {
      id: 'srv-1',
      name: 'Equipe',
      description: 'Desc',
      accent_color: '#5b6cff',
      visibility: 'invite',
      owner_email: 'a@x',
      plan_tier: null,
      max_members: 10,
      max_pending_invites: 5,
      created_at: '10',
    };
    const inviteRow = {
      code: 'ABCD1234',
      server_id: 'srv-1',
      created_by: 'a@x',
      max_uses: null,
      uses: 0,
      expires_at: '9999999',
      revoked: false,
      created_at: '10',
    };
    let emptyMode = false;
    const db: SqlClient = {
      query: async (sql: string) => {
        if (emptyMode) return { rows: [], rowCount: 0 };
        if (sql.includes('COUNT(*)'))
          return { rows: [{ total: 3 }], rowCount: 1 };
        if (sql.includes('FROM servers'))
          return { rows: [serverRow], rowCount: 1 };
        if (sql.includes('FROM server_members'))
          return { rows: [{ '?column?': 1 }], rowCount: 1 };
        if (sql.includes('FROM server_invites'))
          return { rows: [inviteRow], rowCount: 1 };
        if (sql.includes('FROM server_email_invites'))
          return {
            rows: [
              {
                server_id: 'srv-1',
                email: 'vmns50@gmail.com',
                invited_by: 'a@x',
                created_at: '10',
              },
            ],
            rowCount: 1,
          };
        return { rows: [], rowCount: 1 };
      },
    };
    const pgServers = new PgServerRepository(db);
    const pgInvites = new PgServerInviteRepository(db);

    expect(await pgServers.listForUser('a@x')).toHaveLength(1);
    expect((await pgServers.get('srv-1'))?.planTier).toBe('starter');
    await pgServers.create(
      {
        id: 'srv-1',
        name: 'Equipe',
        description: 'Desc',
        accentColor: '#5b6cff',
        visibility: 'invite',
        ownerEmail: 'a@x',
        planTier: 'starter',
        maxMembers: null,
        maxPendingInvites: null,
        createdAt: 10,
      },
      'a@x',
    );
    expect(await pgServers.isMember('default', 'a@x')).toBe(true);
    expect(await pgServers.isMember('srv-1', 'a@x')).toBe(true);
    expect(await pgServers.countMembers('srv-1')).toBe(3);

    expect(await pgInvites.listByServer('srv-1')).toHaveLength(1);
    expect((await pgInvites.getByCode('abcd1234'))?.code).toBe('ABCD1234');
    await pgInvites.create({
      code: 'ABCD1234',
      serverId: 'srv-1',
      createdBy: 'a@x',
      maxUses: 5,
      uses: 0,
      expiresAt: null,
      revoked: false,
      createdAt: 10,
    });
    await pgInvites.incrementUse('ABCD1234');
    expect(await pgInvites.revoke('ABCD1234', 'srv-1')).toBe(true);
    await pgInvites.addInvitedEmail('srv-1', 'vmns50@gmail.com', 'a@x', 10);
    expect(await pgInvites.listInvitedEmails('srv-1')).toHaveLength(1);
    expect(await pgInvites.isEmailInvited('vmns50@gmail.com')).toBe(true);
    expect(await pgInvites.invitedServersForEmail('vmns50@gmail.com')).toEqual([
      'srv-1',
    ]);
    expect(
      await pgInvites.removeInvitedEmail('srv-1', 'vmns50@gmail.com'),
    ).toBe(true);

    emptyMode = true;
    expect(await pgServers.get('missing')).toBeUndefined();
    expect(await pgServers.isMember('srv-1', 'a@x')).toBe(false);
    expect(await pgServers.countMembers('srv-1')).toBe(0);
    expect(await pgInvites.getByCode('missing')).toBeUndefined();
    expect(await pgInvites.revoke('missing', 'srv-1')).toBe(false);
    expect(await pgInvites.isEmailInvited('vmns50@gmail.com')).toBe(false);
    expect(
      await pgInvites.removeInvitedEmail('srv-1', 'vmns50@gmail.com'),
    ).toBe(false);
  });
});
