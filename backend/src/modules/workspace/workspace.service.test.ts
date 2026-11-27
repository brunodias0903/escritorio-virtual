import { describe, expect, it, vi } from 'vitest';
import {
  MemoryChannelRepository,
  MemoryDeskRepository,
  MemoryFeedbackRepository,
  MemoryLocalAccountRepository,
  MemoryServerInviteRepository,
  MemoryServerRepository,
  MemoryServerSettingsRepository,
} from '../../infra/persistence/memory/index.js';
import type { AccountTier, DeskInfo } from '../../shared/domain/index.js';
import type { SessionClaims } from '../auth/token.js';
import { DeskService } from '../desks/desks.service.js';
import { WorkspaceService } from './workspace.service.js';

const makeClaims = (email: string, admin = false): SessionClaims => ({
  email,
  name: email.split('@')[0]!,
  admin,
  kind: 'company',
  nickname: email.split('@')[0]!,
  role: '',
  jti: 'jti-1',
  exp: Math.floor(Date.now() / 1000) + 3600,
});

const setup = async () => {
  const accounts = new MemoryLocalAccountRepository();
  const addUser = async (email: string, tier: AccountTier) => {
    await accounts.create({
      email,
      nickname: email.split('@')[0]!,
      fullName: `${tier} User`,
      role: tier,
      tier,
      passwordHash: 'hash',
      emailVerified: true,
      emailMarketingOptIn: true,
      uiTheme: null,
      createdAt: 1,
    });
  };
  await addUser('master@setter.app', 'master');
  await addUser('admin@setter.app', 'admin');
  await addUser('dev@setter.app', 'developer');
  await addUser('tester@setter.app', 'tester');
  await addUser('designer@setter.app', 'designer');

  const channels = new MemoryChannelRepository();
  const settings = new MemoryServerSettingsRepository();
  const feedback = new MemoryFeedbackRepository();
  const desks = new DeskService(new MemoryDeskRepository());
  const servers = new MemoryServerRepository();
  const invites = new MemoryServerInviteRepository();
  const onDeskChanged = vi.fn<(desk: DeskInfo) => void>();
  const onUserModerated = vi.fn();
  const onAccountRolesChanged = vi.fn();
  const service = new WorkspaceService({
    settings,
    feedback,
    channels,
    accounts,
    desks,
    servers,
    invites,
    adminEmails: ['master@setter.app', 'admin@setter.app'],
    getOnlinePlayers: () => [
      { email: 'dev@setter.app', status: 'available', map: 'lobby' },
    ],
    onDeskChanged,
    onUserModerated,
    onAccountRolesChanged,
    now: () => 1_000_000,
  });
  return {
    service,
    channels,
    accounts,
    desks,
    servers,
    invites,
    onDeskChanged,
    onUserModerated,
    onAccountRolesChanged,
  };
};

describe('WorkspaceService', () => {
  it('permite master/admin editar configurações do servidor e bloqueia outros tiers', async () => {
    const { service } = await setup();

    const denied = await service.updateServerSettings(
      makeClaims('dev@setter.app'),
      {
        name: 'Outro',
        description: '',
        welcomeMessage: '',
        allowPublicRegistration: true,
      },
    );
    expect(denied.ok).toBe(false);

    const saved = await service.updateServerSettings(
      makeClaims('master@setter.app', true),
      {
        name: 'Setter HQ',
        description: 'Escritório principal',
        welcomeMessage: 'Bem-vindo!',
        allowPublicRegistration: false,
      },
    );
    expect(saved.ok).toBe(true);
    if (saved.ok) {
      expect(saved.value.name).toBe('Setter HQ');
      expect(saved.value.allowPublicRegistration).toBe(false);
    }
  });

  it('restringe link de MR apenas para master, admin, developer e tester, e valida transições por tier', async () => {
    const { service } = await setup();

    const created = await service.createFeedback(
      makeClaims('designer@setter.app'),
      {
        kind: 'bug',
        title: 'Botão desalinhado no mobile',
        description: 'No iOS o botão fica encostado na borda.',
      },
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const id = created.value.id;

    // Developer adiciona MR e move para em teste
    const devUpdate = await service.updateFeedback(
      makeClaims('dev@setter.app'),
      id,
      {
        mrUrl: 'https://github.com/org/repo/pull/42',
        status: 'testing',
      },
    );
    expect(devUpdate.ok).toBe(true);
    if (devUpdate.ok) {
      expect(devUpdate.value.mrUrl).toBe('https://github.com/org/repo/pull/42');
      expect(devUpdate.value.status).toBe('testing');
    }

    // Designer NÃO enxerga o link da MR
    const designerList = await service.listFeedback(
      makeClaims('designer@setter.app'),
    );
    expect(designerList[0]?.mrUrl).toBeUndefined();

    // Tester enxerga o link da MR e pode marcar como concluída
    const testerList = await service.listFeedback(
      makeClaims('tester@setter.app'),
    );
    expect(testerList[0]?.mrUrl).toBe('https://github.com/org/repo/pull/42');

    // Developer NÃO pode marcar como concluída (só master, admin, tester)
    const devDone = await service.updateFeedback(
      makeClaims('dev@setter.app'),
      id,
      { status: 'done' },
    );
    expect(devDone.ok).toBe(false);

    // Tester pode marcar como concluída
    const testerDone = await service.updateFeedback(
      makeClaims('tester@setter.app'),
      id,
      { status: 'done' },
    );
    expect(testerDone.ok).toBe(true);
    if (testerDone.ok) {
      expect(testerDone.value.status).toBe('done');
    }

    // Comentário na thread
    const comment = await service.addFeedbackComment(
      makeClaims('master@setter.app', true),
      id,
      { body: 'Validado em produção!' },
    );
    expect(comment.ok).toBe(true);

    // Criação e atualização de canal gerenciado com writeTiers
    const createdCh = await service.createManagedChannel(
      makeClaims('master@setter.app', true),
      { name: 'avisos', topic: 'Somente admins', writeTiers: ['admin'] },
    );
    expect(createdCh.ok).toBe(true);
    if (createdCh.ok) {
      expect(createdCh.value.writeTiers).toContain('master');
      expect(createdCh.value.writeTiers).toContain('admin');
    }

    const dupCh = await service.createManagedChannel(
      makeClaims('master@setter.app', true),
      { name: 'avisos', topic: '', writeTiers: ['admin'] },
    );
    expect(dupCh.ok).toBe(false);

    const updatedCh = await service.updateChannelConfig(
      makeClaims('admin@setter.app', true),
      'avisos',
      { topic: 'Comunicados', writeTiers: ['admin', 'developer'] },
    );
    expect(updatedCh.ok).toBe(true);

    const notFoundCh = await service.updateChannelConfig(
      makeClaims('admin@setter.app', true),
      'inexistente',
      { topic: 'x' },
    );
    expect(notFoundCh.ok).toBe(false);
  });

  it('permite que apenas master modere contas e remove automaticamente a mesa em ban, kick, restrição e remoção', async () => {
    const { service, accounts, desks, onDeskChanged, onUserModerated } =
      await setup();
    const master = makeClaims('master@setter.app', true);
    const admin = makeClaims('admin@setter.app', true);
    const atDesk1 = { map: 'lobby' as const, x: 430, y: 160 };

    // Admin pode listar membros e moderar (ban/kick/restrict) cargos menores, mas não pode remover contas nem moderar master/admin; developer não lista
    expect((await service.listAccounts(admin)).ok).toBe(true);
    expect((await service.listAccounts(makeClaims('dev@setter.app'))).ok).toBe(
      false,
    );
    expect(
      (
        await service.moderateAccount(admin, 'tester@setter.app', {
          action: 'remove',
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await service.moderateAccount(admin, 'master@setter.app', {
          action: 'ban',
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await service.moderateAccount(admin, 'tester@setter.app', {
          action: 'ban',
        })
      ).ok,
    ).toBe(true);
    expect(
      (
        await service.moderateAccount(admin, 'tester@setter.app', {
          action: 'unban',
        })
      ).ok,
    ).toBe(true);

    // Master não pode moderar a si mesmo
    expect(
      await service.moderateAccount(master, 'master@setter.app', {
        action: 'ban',
      }),
    ).toMatchObject({ ok: false, status: 400, error: 'cannot_moderate_self' });

    // Tester adota uma mesa
    await desks.adopt(
      { email: 'tester@setter.app', name: 'tester User' },
      atDesk1,
      'mesa-1',
    );
    const listed = await service.listAccounts(master);
    expect(listed.ok).toBe(true);
    if (listed.ok) {
      const testerRow = listed.value.find(
        (a) => a.email === 'tester@setter.app',
      );
      expect(testerRow?.desk?.deskId).toBe('mesa-1');
    }

    // 1. Kick libera a mesa automaticamente e desconecta
    const kicked = await service.moderateAccount(master, 'tester@setter.app', {
      action: 'kick',
      reason: 'Pausa',
    });
    expect(kicked).toMatchObject({
      ok: true,
      value: { action: 'kick', deskReleased: true },
    });
    expect(await desks.list()).toEqual([]);
    expect(onDeskChanged).toHaveBeenCalledWith(
      expect.objectContaining({ deskId: 'mesa-1', owner: null }),
    );
    expect(onUserModerated).toHaveBeenCalledWith(
      'tester@setter.app',
      'kicked',
      'Pausa',
    );

    // 2. Restringir libera a mesa e grava restrictedUntil
    await desks.adopt(
      { email: 'tester@setter.app', name: 'tester User' },
      atDesk1,
      'mesa-1',
    );
    const restricted = await service.moderateAccount(
      master,
      'tester@setter.app',
      { action: 'restrict', durationMinutes: 30, reason: 'Conduta' },
    );
    expect(restricted).toMatchObject({
      ok: true,
      value: {
        action: 'restrict',
        deskReleased: true,
        account: {
          restrictedUntil: 1_000_000 + 30 * 60_000,
          restrictionReason: 'Conduta',
          desk: null,
        },
      },
    });
    expect(await desks.list()).toEqual([]);

    // Remover restrição
    const unrestricted = await service.moderateAccount(
      master,
      'tester@setter.app',
      { action: 'unrestrict' },
    );
    expect(unrestricted).toMatchObject({
      ok: true,
      value: { account: { restrictedUntil: null, restrictionReason: '' } },
    });

    // 3. Banir libera a mesa e grava bannedAt; desbanir limpa
    await desks.adopt(
      { email: 'tester@setter.app', name: 'tester User' },
      atDesk1,
      'mesa-1',
    );
    const banned = await service.moderateAccount(master, 'tester@setter.app', {
      action: 'ban',
      reason: 'Violação grave',
    });
    expect(banned).toMatchObject({
      ok: true,
      value: {
        action: 'ban',
        deskReleased: true,
        account: {
          bannedAt: 1_000_000,
          banReason: 'Violação grave',
          desk: null,
        },
      },
    });
    expect(await desks.list()).toEqual([]);
    expect(onUserModerated).toHaveBeenCalledWith(
      'tester@setter.app',
      'banned',
      'Violação grave',
    );

    const unbanned = await service.moderateAccount(
      master,
      'tester@setter.app',
      {
        action: 'unban',
      },
    );
    expect(unbanned).toMatchObject({
      ok: true,
      value: { account: { bannedAt: null, banReason: '' } },
    });

    // 4. Remover conta exclui e libera a mesa
    await desks.adopt(
      { email: 'designer@setter.app', name: 'designer User' },
      atDesk1,
      'mesa-1',
    );
    const removed = await service.moderateAccount(
      master,
      'designer@setter.app',
      { action: 'remove' },
    );
    expect(removed).toMatchObject({
      ok: true,
      value: { action: 'remove', deskReleased: true, account: null },
    });
    expect(await accounts.byEmail('designer@setter.app')).toBeUndefined();
    expect(await desks.list()).toEqual([]);

    // 5. Remoção explícita de mesa por master/admin
    await desks.adopt(
      { email: 'dev@setter.app', name: 'dev User' },
      atDesk1,
      'mesa-1',
    );
    const released = await service.releaseUserDeskAsAdmin(
      admin,
      'dev@setter.app',
    );
    expect(released).toMatchObject({
      ok: true,
      value: { desk: { deskId: 'mesa-1', owner: null } },
    });
    expect(
      await service.releaseUserDeskAsAdmin(
        makeClaims('dev@setter.app'),
        'dev@setter.app',
      ),
    ).toMatchObject({ ok: false, status: 403 });
  });

  it('permite cargo principal + cargos secundários (estilo Discord) com hierarquia Master > Admin', async () => {
    const { service, desks, onAccountRolesChanged, onDeskChanged } =
      await setup();
    const master = makeClaims('master@setter.app', true);
    const admin = makeClaims('admin@setter.app', true);
    const dev = makeClaims('dev@setter.app');

    // Lista inclui presença online (dev online no lobby aparece primeiro)
    const listed = await service.listAccounts(admin);
    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.value[0]).toMatchObject({
        email: 'dev@setter.app',
        online: true,
        status: 'available',
        map: 'lobby',
      });
    }

    // Adota mesa para verificar sincronia de cargo exibido
    await desks.adopt(
      { email: 'dev@setter.app', name: 'developer User' },
      { map: 'lobby', x: 430, y: 160 },
      'mesa-1',
    );

    // Master dá cargo principal 'developer' + secundários ['admin', 'designer'] (deduplicando principal)
    const promoted = await service.updateAccountRoles(
      master,
      'dev@setter.app',
      {
        tier: 'developer',
        secondaryTiers: ['developer', 'admin', 'designer', 'admin'],
        role: 'Tech Lead',
      },
    );
    expect(promoted).toMatchObject({
      ok: true,
      value: {
        email: 'dev@setter.app',
        tier: 'developer',
        secondaryTiers: ['admin', 'designer'],
        role: 'Tech Lead',
      },
    });
    expect(onAccountRolesChanged).toHaveBeenCalledWith('dev@setter.app', {
      tier: 'developer',
      secondaryTiers: ['admin', 'designer'],
      admin: true,
      role: 'Tech Lead',
    });
    expect(onDeskChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        deskId: 'mesa-1',
        owner: expect.objectContaining({ role: 'Tech Lead' }),
      }),
    );

    // Com 'admin' como cargo secundário, dev agora pode listar membros e gerenciar cargos de tester
    expect((await service.listAccounts(dev)).ok).toBe(true);
    const devEditsTester = await service.updateAccountRoles(
      dev,
      'tester@setter.app',
      {
        tier: 'tester',
        secondaryTiers: ['designer'],
        role: 'QA & UX',
      },
    );
    expect(devEditsTester).toMatchObject({
      ok: true,
      value: {
        tier: 'tester',
        secondaryTiers: ['designer'],
        role: 'QA & UX',
      },
    });

    // Hierarquia: admin não pode atribuir 'admin', nem editar outro admin ou master, nem a si mesmo
    expect(
      await service.updateAccountRoles(admin, 'tester@setter.app', {
        tier: 'tester',
        secondaryTiers: ['admin'],
      }),
    ).toMatchObject({ ok: false, status: 403, error: 'cannot_assign_admin' });

    expect(
      await service.updateAccountRoles(admin, 'dev@setter.app', {
        tier: 'tester',
        secondaryTiers: [],
      }),
    ).toMatchObject({
      ok: false,
      status: 403,
      error: 'cannot_manage_higher_role',
    });

    expect(
      await service.updateAccountRoles(master, 'tester@setter.app', {
        tier: 'master',
        secondaryTiers: [],
      }),
    ).toMatchObject({ ok: false, status: 403, error: 'cannot_assign_master' });

    expect(
      await service.updateAccountRoles(master, 'master@setter.app', {
        tier: 'admin',
        secondaryTiers: [],
      }),
    ).toMatchObject({
      ok: false,
      status: 400,
      error: 'cannot_edit_own_roles',
    });
  });

  it('cria servidores, gera convites, permite entrada por código e valida revogação/esgotamento', async () => {
    const { service } = await setup();
    const master = makeClaims('master@setter.app', true);
    const admin = makeClaims('admin@setter.app', true);
    const dev = makeClaims('dev@setter.app');
    const tester = makeClaims('tester@setter.app');

    // Dev e Admin não podem criar servidor (apenas Master)
    for (const actor of [dev, admin]) {
      const denied = await service.createServer(actor, {
        name: 'Clandestino',
        description: '',
        accentColor: '#5b6cff',
        visibility: 'invite',
      });
      expect(denied).toMatchObject({
        ok: false,
        status: 403,
        error: 'forbidden',
      });
    }

    // Master cria novo servidor
    const created = await service.createServer(master, {
      name: 'Equipe Mobile',
      description: 'Squad iOS & Android',
      accentColor: '#10b981',
      visibility: 'invite',
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const masterServers = await service.listServers(master);
    expect(masterServers.some((s) => s.id === created.value.id)).toBe(true);

    // Gera convite com limite de 1 uso
    const inviteRes = await service.createServerInvite(
      master,
      created.value.id,
      {
        maxUses: 1,
        expiresInHours: 24,
      },
    );
    expect(inviteRes.ok).toBe(true);
    if (!inviteRes.ok) return;

    const listedInvites = await service.listServerInvites(
      master,
      created.value.id,
    );
    expect(listedInvites.ok).toBe(true);
    if (listedInvites.ok) {
      expect(listedInvites.value).toHaveLength(1);
    }

    // Dev entra com o código (1 uso consumido)
    const joinDev = await service.joinServerByInvite(dev, inviteRes.value.code);
    expect(joinDev.ok).toBe(true);
    const devServers = await service.listServers(dev);
    expect(devServers.some((s) => s.id === created.value.id)).toBe(true);

    // Configurações, canais e contas escopados por serverId
    const srvSettingsBefore = await service.getServerSettings(created.value.id);
    expect(srvSettingsBefore.name).toBe('Equipe Mobile');
    const updatedSrvSettings = await service.updateServerSettings(
      master,
      {
        name: 'Design Atualizado',
        description: 'Nova desc',
        welcomeMessage: 'Bem-vindo',
        allowPublicRegistration: false,
      },
      created.value.id,
    );
    expect(updatedSrvSettings.ok).toBe(true);
    const updatedServers = await service.listServers(master);
    expect(updatedServers.find((s) => s.id === created.value.id)?.name).toBe(
      'Design Atualizado',
    );
    const srvAccounts = await service.listAccounts(master, created.value.id);
    expect(srvAccounts.ok).toBe(true);
    if (srvAccounts.ok) {
      const devEntry = srvAccounts.value.find(
        (a) => a.email === 'dev@setter.app',
      );
      expect(devEntry).toBeDefined();
      expect(devEntry?.tier).toBe('member');
      expect(
        srvAccounts.value.some((a) => a.email === 'tester@setter.app'),
      ).toBe(false);
    }
    const srvRoleUpdate = await service.updateAccountRoles(
      master,
      'dev@setter.app',
      { tier: 'tester', secondaryTiers: [] },
      created.value.id,
    );
    expect(srvRoleUpdate).toMatchObject({
      ok: true,
      value: { tier: 'tester', secondaryTiers: [] },
    });
    const defaultAccountsAfter = await service.listAccounts(admin, 'default');
    if (defaultAccountsAfter.ok) {
      expect(
        defaultAccountsAfter.value.find((a) => a.email === 'dev@setter.app')
          ?.tier,
      ).toBe('developer');
    }
    const srvChannels = await service.listPublicChannels(created.value.id);
    expect(srvChannels.some((c) => c.name === 'geral')).toBe(true);

    // Tester tenta entrar com o mesmo código já esgotado
    const joinTester = await service.joinServerByInvite(
      tester,
      inviteRes.value.code,
    );
    expect(joinTester).toMatchObject({
      ok: false,
      status: 410,
      error: 'invite_exhausted',
    });

    // Gera segundo convite e revoga antes do uso
    const invite2 = await service.createServerInvite(admin, created.value.id, {
      maxUses: null,
      expiresInHours: null,
    });
    expect(invite2.ok).toBe(true);
    if (!invite2.ok) return;

    const revoked = await service.revokeServerInvite(
      admin,
      created.value.id,
      invite2.value.code,
    );
    expect(revoked).toMatchObject({ ok: true, value: { ok: true } });

    const joinRevoked = await service.joinServerByInvite(
      tester,
      invite2.value.code,
    );
    expect(joinRevoked).toMatchObject({
      ok: false,
      status: 404,
      error: 'invite_invalid',
    });

    // Servidor padrão de testes ('default') é irrestrito
    const defaultSrv = masterServers.find((s) => s.id === 'default');
    expect(defaultSrv).toMatchObject({
      id: 'default',
      planTier: 'unlimited',
      maxMembers: null,
      maxPendingInvites: null,
    });

    // Servidor com limite de membros e convites
    const {
      servers,
      service: limitedService,
      channels,
      accounts,
    } = await setup();
    const restricted = await servers.create(
      {
        id: 'srv-limited',
        name: 'Limitado',
        description: '',
        accentColor: '#5b6cff',
        visibility: 'invite',
        ownerEmail: 'admin@setter.app',
        planTier: 'starter',
        maxMembers: 1,
        maxPendingInvites: 1,
        createdAt: 1,
      },
      'admin@setter.app',
    );
    expect(await servers.countMembers(restricted.id)).toBe(1);
    const limInv1 = await limitedService.createServerInvite(
      admin,
      restricted.id,
      { maxUses: 5, expiresInHours: 1 },
    );
    expect(limInv1.ok).toBe(true);
    expect(
      await limitedService.createServerInvite(admin, restricted.id, {
        maxUses: 5,
        expiresInHours: 1,
      }),
    ).toMatchObject({
      ok: false,
      status: 403,
      error: 'server_invite_limit_reached',
    });
    if (limInv1.ok) {
      expect(
        await limitedService.joinServerByInvite(dev, limInv1.value.code),
      ).toMatchObject({
        ok: false,
        status: 403,
        error: 'server_member_limit_reached',
      });
    }
    const invLimited = await service.createServerInvite(admin, 'nao-existe', {
      maxUses: 1,
      expiresInHours: 1,
    });
    expect(invLimited).toMatchObject({
      ok: false,
      status: 404,
      error: 'server_not_found',
    });
    expect(await service.listServerInvites(admin, 'nao-existe')).toMatchObject({
      ok: false,
      status: 404,
      error: 'server_not_found',
    });
    expect(
      await service.revokeServerInvite(admin, created.value.id, 'INEXISTENTE'),
    ).toMatchObject({ ok: false, status: 404, error: 'invite_not_found' });

    // Convites por e-mail: limites, permissões e erros 404
    expect(
      await limitedService.listInvitedEmails(dev, restricted.id),
    ).toMatchObject({ ok: false, status: 403, error: 'forbidden' });
    expect(
      await limitedService.addInvitedEmail(dev, restricted.id, 'a@x.com'),
    ).toMatchObject({ ok: false, status: 403, error: 'forbidden' });
    expect(
      await limitedService.removeInvitedEmail(dev, restricted.id, 'a@x.com'),
    ).toMatchObject({ ok: false, status: 403, error: 'forbidden' });
    expect(
      await limitedService.listInvitedEmails(admin, 'nao-existe'),
    ).toMatchObject({ ok: false, status: 404, error: 'server_not_found' });
    expect(
      await limitedService.addInvitedEmail(admin, 'nao-existe', 'a@x.com'),
    ).toMatchObject({ ok: false, status: 404, error: 'server_not_found' });
    expect(
      await limitedService.addInvitedEmail(admin, restricted.id, 'a@x.com'),
    ).toMatchObject({ ok: true });
    expect(
      await limitedService.addInvitedEmail(admin, restricted.id, 'b@x.com'),
    ).toMatchObject({
      ok: false,
      status: 403,
      error: 'server_invite_limit_reached',
    });
    expect(
      await limitedService.removeInvitedEmail(
        admin,
        restricted.id,
        'nao@existe.com',
      ),
    ).toMatchObject({ ok: false, status: 404, error: 'invite_not_found' });
    expect(
      await limitedService.removeInvitedEmail(admin, restricted.id, 'a@x.com'),
    ).toMatchObject({ ok: true });

    // Serviço sem repositórios de multi-servidor retorna 501; convite expirado retorna 410
    const noServers = new WorkspaceService({
      settings: new MemoryServerSettingsRepository(),
      feedback: new MemoryFeedbackRepository(),
      channels,
      accounts,
      adminEmails: ['admin@setter.app'],
    });
    expect(await noServers.listServers(admin)).toEqual([]);
    expect(
      await noServers.createServer(admin, {
        name: 'X',
        description: '',
        accentColor: '#5b6cff',
        visibility: 'invite',
      }),
    ).toMatchObject({ ok: false, status: 501, error: 'not_implemented' });
    expect(await noServers.listServerInvites(admin, 'default')).toMatchObject({
      ok: false,
      status: 501,
      error: 'not_implemented',
    });
    expect(
      await noServers.createServerInvite(admin, 'default', {
        maxUses: 1,
        expiresInHours: 1,
      }),
    ).toMatchObject({ ok: false, status: 501, error: 'not_implemented' });
    expect(
      await noServers.revokeServerInvite(admin, 'default', 'ABC'),
    ).toMatchObject({ ok: false, status: 501, error: 'not_implemented' });
    expect(await noServers.listInvitedEmails(admin, 'default')).toMatchObject({
      ok: false,
      status: 501,
      error: 'not_implemented',
    });
    expect(
      await noServers.addInvitedEmail(admin, 'default', 'a@x.com'),
    ).toMatchObject({ ok: false, status: 501, error: 'not_implemented' });
    expect(
      await noServers.removeInvitedEmail(admin, 'default', 'a@x.com'),
    ).toMatchObject({ ok: false, status: 501, error: 'not_implemented' });
    expect(await noServers.joinServerByInvite(dev, 'ABC')).toMatchObject({
      ok: false,
      status: 501,
      error: 'not_implemented',
    });

    // Convite expirado
    let clock = 1_000_000;
    const expInvites = new MemoryServerInviteRepository();
    const expServers = new MemoryServerRepository();
    const expService = new WorkspaceService({
      settings: new MemoryServerSettingsRepository(),
      feedback: new MemoryFeedbackRepository(),
      channels,
      accounts,
      servers: expServers,
      invites: expInvites,
      adminEmails: ['admin@setter.app'],
      now: () => clock,
    });
    const expInv = await expService.createServerInvite(admin, 'default', {
      maxUses: 5,
      expiresInHours: 1,
    });
    expect(expInv.ok).toBe(true);
    if (expInv.ok) {
      clock += 2 * 3_600_000;
      expect(
        await expService.joinServerByInvite(dev, expInv.value.code),
      ).toMatchObject({ ok: false, status: 410, error: 'invite_expired' });
    }
  });
});
