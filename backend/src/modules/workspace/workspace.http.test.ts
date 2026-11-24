import { describe, expect, it } from 'vitest';
import {
  MemoryChannelRepository,
  MemoryEmailCodeRepository,
  MemoryFeedbackRepository,
  MemoryLocalAccountRepository,
  MemoryRateLimiter,
  MemoryRevocations,
  MemoryServerSettingsRepository,
} from '../../infra/persistence/memory/index.js';
import {
  PgFeedbackRepository,
  PgServerSettingsRepository,
} from '../../infra/persistence/postgres/index.js';
import type { SqlClient } from '../../infra/database/sql-client.js';
import { parseAccountAccess } from '../../shared/domain/index.js';
import { AuthService } from '../auth/auth.service.js';
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

  const workspace = new WorkspaceService({
    settings,
    feedback,
    channels,
    accounts,
    onChannelsChanged: () => {},
  });

  return {
    auth,
    workspace,
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
});
