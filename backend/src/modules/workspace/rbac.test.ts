import { describe, expect, it } from 'vitest';
import {
  MemoryChannelRepository,
  MemoryDeskRepository,
  MemoryFeedbackRepository,
  MemoryLocalAccountRepository,
  MemoryRateLimiter,
  MemoryRevocations,
  MemoryServerInviteRepository,
  MemoryServerRepository,
  MemoryServerSettingsRepository,
} from '../../infra/persistence/memory/index.js';
import {
  parseAccountAccess,
  type AccountTier,
} from '../../shared/domain/index.js';
import { AuthService } from '../auth/auth.service.js';
import { DeskService } from '../desks/desks.service.js';
import { handleWorkspaceRoutes } from './workspace.http.js';
import { WorkspaceService } from './workspace.service.js';

const SECRET = 'rbac-test-secret-key-with-at-least-32-chars';

const setupRbacWorld = async () => {
  const accounts = new MemoryLocalAccountRepository();
  const channels = new MemoryChannelRepository();
  const settings = new MemoryServerSettingsRepository();
  const feedback = new MemoryFeedbackRepository();
  const desks = new DeskService(new MemoryDeskRepository());
  const servers = new MemoryServerRepository();
  const invites = new MemoryServerInviteRepository();

  const auth = new AuthService({
    accounts,
    secret: SECRET,
    adminEmails: ['master@empresa.com'],
    access: parseAccountAccess('empresa.com', ''),
    loginLimiter: new MemoryRateLimiter(100, 60_000),
    revocations: new MemoryRevocations(),
    codes: null,
    verifyCodes: null,
  });

  const registerWithTier = async (
    email: string,
    nickname: string,
    fullName: string,
    tier: AccountTier,
  ) => {
    const res = await auth.register(
      {
        fullName,
        nickname,
        email,
        role: tier,
        password: 'Password123!',
      },
      '127.0.0.1',
    );
    if (!res.ok) throw new Error(`Falha ao registrar ${email}: ${res.error}`);
    const acc = await accounts.byEmail(email);
    if (acc && tier !== 'master') {
      await accounts.setRoles?.(email, { tier, secondaryTiers: [] });
    }
    const login = await auth.login(email, 'Password123!', '127.0.0.1');
    if (!login.ok) throw new Error(`Falha ao logar ${email}: ${login.error}`);
    if ('mfaRequired' in login.value) {
      throw new Error(`MFA inesperado para ${email}`);
    }
    return login.value.token;
  };

  const tokens = {
    master: await registerWithTier(
      'master@empresa.com',
      'master',
      'Master User',
      'master',
    ),
    admin: await registerWithTier(
      'admin@empresa.com',
      'admin',
      'Admin User',
      'admin',
    ),
    developer: await registerWithTier(
      'dev@empresa.com',
      'dev',
      'Dev User',
      'developer',
    ),
    tester: await registerWithTier(
      'tester@empresa.com',
      'tester',
      'Tester User',
      'tester',
    ),
    designer: await registerWithTier(
      'designer@empresa.com',
      'designer',
      'Designer User',
      'designer',
    ),
    member: await registerWithTier(
      'member@empresa.com',
      'member',
      'Member User',
      'member',
    ),
  };

  const workspace = new WorkspaceService({
    settings,
    feedback,
    channels,
    accounts,
    desks,
    servers,
    invites,
    adminEmails: ['master@empresa.com'],
    onChannelsChanged: () => {},
  });

  const call = (
    method: string,
    path: string,
    token: string,
    body?: unknown,
    serverId?: string,
  ) =>
    handleWorkspaceRoutes(auth, workspace, {
      method,
      path,
      authorization: `Bearer ${token}`,
      body,
      query: serverId ? new URLSearchParams({ serverId }) : undefined,
      ip: '127.0.0.1',
    });

  return { auth, workspace, accounts, desks, servers, tokens, call };
};

describe('RBAC — matriz completa de permissões por cargo e por servidor', () => {
  it('bloqueia TODAS as operações gerenciais para cargos não administrativos (member, tester, designer, developer)', async () => {
    const { auth, desks, tokens, call } = await setupRbacWorld();

    // Master cria um canal restrito, um convite e adota uma mesa para o alvo
    const chRes = await call('POST', '/api/server/channels', tokens.master, {
      name: 'diretoria',
      topic: 'Restrito',
      viewTiers: ['master', 'admin'],
      writeTiers: ['master', 'admin'],
    });
    expect(chRes?.status).toBe(201);

    const invRes = await call(
      'POST',
      '/api/servers/default/invites',
      tokens.master,
      { maxUses: 5, expiresInHours: 24 },
    );
    expect(invRes?.status).toBe(201);
    const inviteCode = (invRes?.body as { invite: { code: string } }).invite
      .code;

    await desks.adopt(
      { email: 'tester@empresa.com', name: 'Tester User' },
      { map: 'lobby', x: 430, y: 160 },
      'mesa-1',
    );

    const nonAdminRoles = [
      'member',
      'tester',
      'designer',
      'developer',
    ] as const;

    for (const role of nonAdminRoles) {
      const tok = tokens[role];

      // Configurações gerais do servidor
      expect(
        (
          await call('PUT', '/api/server', tok, {
            name: 'Hackeado',
            description: '',
            welcomeMessage: '',
            allowPublicRegistration: true,
          })
        )?.status,
      ).toBe(403);

      // Listagem administrativa de canais (oculta canais restritos e overrides)
      expect((await call('GET', '/api/server/channels', tok))?.status).toBe(
        403,
      );

      // Criar, editar, reordenar e apagar canais
      expect(
        (
          await call('POST', '/api/server/channels', tok, {
            name: 'clandestino',
          })
        )?.status,
      ).toBe(403);
      expect(
        (
          await call('PUT', '/api/server/channels/diretoria', tok, {
            topic: 'Alterado',
          })
        )?.status,
      ).toBe(403);
      expect(
        (
          await call('PUT', '/api/server/channels/reorder', tok, {
            channelIds: ['projetos', 'geral'],
          })
        )?.status,
      ).toBe(403);
      expect(
        (await call('DELETE', '/api/server/channels/diretoria', tok))?.status,
      ).toBe(403);

      // Listar membros, editar cargos, moderar e remover mesa de terceiros
      expect((await call('GET', '/api/server/accounts', tok))?.status).toBe(
        403,
      );
      expect(
        (
          await call(
            'PUT',
            '/api/server/accounts/member@empresa.com/roles',
            tok,
            {
              tier: 'admin',
              secondaryTiers: [],
            },
          )
        )?.status,
      ).toBe(403);
      expect(
        (
          await call(
            'POST',
            '/api/server/accounts/tester@empresa.com/moderate',
            tok,
            { action: 'kick' },
          )
        )?.status,
      ).toBe(403);
      expect(
        (
          await call(
            'DELETE',
            '/api/server/accounts/tester@empresa.com/desk',
            tok,
          )
        )?.status,
      ).toBe(403);

      // Criar novo servidor e gerenciar convites
      expect(
        (await call('POST', '/api/servers', tok, { name: 'Clandestino' }))
          ?.status,
      ).toBe(403);
      expect(
        (await call('GET', '/api/servers/default/invites', tok))?.status,
      ).toBe(403);
      expect(
        (
          await call('POST', '/api/servers/default/invites', tok, {
            maxUses: 1,
          })
        )?.status,
      ).toBe(403);
      expect(
        (
          await call(
            'DELETE',
            `/api/servers/default/invites/${inviteCode}`,
            tok,
          )
        )?.status,
      ).toBe(403);
      expect(
        (await call('GET', '/api/servers/default/email-invites', tok))?.status,
      ).toBe(403);
      expect(
        (
          await call('POST', '/api/servers/default/email-invites', tok, {
            email: 'novo@empresa.com',
          })
        )?.status,
      ).toBe(403);
    }

    // Membro comum PODE editar a própria função (role) na conta, mas sem escalar seu cargo (tier)
    const memberClaims = await auth.authenticate(tokens.member);
    expect(memberClaims).not.toBeNull();
    const updatedSelf = await auth.updateAccount(
      memberClaims!,
      {
        fullName: 'Member User',
        nickname: 'member',
        role: 'Analista Comercial',
        currentPassword: '',
        newPassword: '',
      },
      '127.0.0.1',
    );
    expect(updatedSelf.ok).toBe(true);
    if (updatedSelf.ok) {
      expect(updatedSelf.value.user.role).toBe('Analista Comercial');
      expect(updatedSelf.value.user.tier).toBe('member');
      expect(updatedSelf.value.user.admin).toBe(false);
    }
  });

  it('isola permissões gerenciais por servidor: admin no default mas membro no servidor B não gerencia o servidor B, e vice-versa', async () => {
    const { desks, servers, tokens, call } = await setupRbacWorld();

    // Master cria servidor secundário "Getter S.A."
    const srvRes = await call('POST', '/api/servers', tokens.master, {
      name: 'Getter S.A.',
      description: 'Empresa B',
      accentColor: '#10b981',
      visibility: 'invite',
    });
    expect(srvRes?.status).toBe(201);
    const srvId = (srvRes?.body as { server: { id: string } }).server.id;

    // Adiciona admin@empresa.com (admin global no default) como MEMBRO COMUM em Getter S.A.
    await servers.addMember(srvId, 'admin@empresa.com', 'member');
    // Adiciona member@empresa.com (membro comum no default) e promove a ADMIN somente em Getter S.A.
    await servers.addMember(srvId, 'member@empresa.com', 'member');
    const promoteInGetter = await call(
      'PUT',
      '/api/server/accounts/member@empresa.com/roles',
      tokens.master,
      { tier: 'admin', secondaryTiers: [] },
      srvId,
    );
    expect(promoteInGetter?.status).toBe(200);

    // Adiciona tester@empresa.com em Getter S.A. com mesa lá
    await servers.addMember(srvId, 'tester@empresa.com', 'member');
    await desks.adopt(
      { email: 'tester@empresa.com', name: 'Tester User' },
      { map: 'lobby', x: 430, y: 160 },
      'mesa-1',
      srvId,
    );

    // --- 1) admin@empresa.com (admin no default, MAS member em Getter S.A.) é BLOQUEADO em tudo de Getter S.A. ---
    expect(
      (
        await call(
          'PUT',
          '/api/server',
          tokens.admin,
          {
            name: 'Invasão',
            description: '',
            welcomeMessage: '',
            allowPublicRegistration: false,
          },
          srvId,
        )
      )?.status,
    ).toBe(403);
    expect(
      (
        await call(
          'GET',
          '/api/server/channels',
          tokens.admin,
          undefined,
          srvId,
        )
      )?.status,
    ).toBe(403);
    expect(
      (
        await call(
          'POST',
          '/api/server/channels',
          tokens.admin,
          { name: 'invasao' },
          srvId,
        )
      )?.status,
    ).toBe(403);
    expect(
      (
        await call(
          'PUT',
          '/api/server/channels/reorder',
          tokens.admin,
          { channelIds: [`${srvId}:geral`] },
          srvId,
        )
      )?.status,
    ).toBe(403);
    expect(
      (
        await call(
          'GET',
          '/api/server/accounts',
          tokens.admin,
          undefined,
          srvId,
        )
      )?.status,
    ).toBe(403);
    expect(
      (
        await call(
          'GET',
          `/api/servers/${srvId}/invites`,
          tokens.admin,
          undefined,
          srvId,
        )
      )?.status,
    ).toBe(403);
    expect(
      (
        await call(
          'POST',
          `/api/servers/${srvId}/invites`,
          tokens.admin,
          { maxUses: 1 },
          srvId,
        )
      )?.status,
    ).toBe(403);
    expect(
      (
        await call(
          'POST',
          `/api/servers/${srvId}/email-invites`,
          tokens.admin,
          { email: 'externo@empresa.com' },
          srvId,
        )
      )?.status,
    ).toBe(403);
    expect(
      (
        await call(
          'DELETE',
          '/api/server/accounts/tester@empresa.com/desk',
          tokens.admin,
          undefined,
          srvId,
        )
      )?.status,
    ).toBe(403);

    // --- 2) member@empresa.com (membro no default, MAS admin em Getter S.A.) GERENCIA Getter S.A. e continua BLOQUEADO no default ---
    expect(
      (
        await call(
          'PUT',
          '/api/server',
          tokens.member,
          {
            name: 'Getter Oficial',
            description: 'Atualizado pelo admin local',
            welcomeMessage: 'Bem-vindos!',
            allowPublicRegistration: false,
          },
          srvId,
        )
      )?.status,
    ).toBe(200);
    expect(
      (
        await call(
          'GET',
          '/api/server/channels',
          tokens.member,
          undefined,
          srvId,
        )
      )?.status,
    ).toBe(200);
    const createdCh = await call(
      'POST',
      '/api/server/channels',
      tokens.member,
      { name: 'comunicados' },
      srvId,
    );
    expect(createdCh?.status).toBe(201);
    const comunicadosId = (createdCh?.body as { channel: { id: string } })
      .channel.id;

    expect(
      (
        await call(
          'PUT',
          '/api/server/channels/reorder',
          tokens.member,
          { channelIds: [comunicadosId, `${srvId}:geral`] },
          srvId,
        )
      )?.status,
    ).toBe(200);
    expect(
      (
        await call(
          'POST',
          `/api/servers/${srvId}/invites`,
          tokens.member,
          { maxUses: 3 },
          srvId,
        )
      )?.status,
    ).toBe(201);
    expect(
      (
        await call(
          'DELETE',
          '/api/server/accounts/tester@empresa.com/desk',
          tokens.member,
          undefined,
          srvId,
        )
      )?.status,
    ).toBe(200);
    expect(
      (
        await call(
          'DELETE',
          `/api/server/channels/${encodeURIComponent(comunicadosId)}`,
          tokens.member,
          undefined,
          srvId,
        )
      )?.status,
    ).toBe(200);

    // Mas no servidor 'default', member@empresa.com continua sem acesso gerencial
    expect(
      (await call('GET', '/api/server/channels', tokens.member))?.status,
    ).toBe(403);
    expect(
      (
        await call('PUT', '/api/server/channels/reorder', tokens.member, {
          channelIds: ['projetos', 'geral'],
        })
      )?.status,
    ).toBe(403);
    // E mesmo sendo admin local, NÃO pode criar servidores (exclusivo de master)
    expect(
      (await call('POST', '/api/servers', tokens.member, { name: 'Outro' }))
        ?.status,
    ).toBe(403);
  });
});
