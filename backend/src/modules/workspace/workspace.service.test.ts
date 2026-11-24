import { describe, expect, it } from 'vitest';
import {
  MemoryChannelRepository,
  MemoryFeedbackRepository,
  MemoryLocalAccountRepository,
  MemoryServerSettingsRepository,
} from '../../infra/persistence/memory/index.js';
import type { AccountTier } from '../../shared/domain/index.js';
import type { SessionClaims } from '../auth/token.js';
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
  const service = new WorkspaceService({
    settings,
    feedback,
    channels,
    accounts,
  });
  return { service, channels };
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
});
