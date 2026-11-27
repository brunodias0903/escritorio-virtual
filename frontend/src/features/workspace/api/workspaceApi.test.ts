import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_SERVER_SETTINGS,
  FREE_DESK_CONFIG,
  canAttachFeedbackMr,
  canManageDesks,
  canManageMembers,
  canManageServer,
  canModerateAccounts,
  canProgressFeedback,
  canResolveFeedback,
  canSeeFeedbackMr,
  canViewChannel,
  canWriteInChannel,
  effectiveTiersOf,
} from '@/shared/domain';

import { useServerStore } from '../model/serverStore';
import { createWorkspaceApi } from './workspaceApi';

describe('workspace permissions & store', () => {
  it('valida permissões por tier', () => {
    expect(canManageServer('master')).toBe(true);
    expect(canManageServer('admin')).toBe(true);
    expect(canManageServer('developer')).toBe(false);

    expect(canModerateAccounts('master')).toBe(true);
    expect(canModerateAccounts('admin')).toBe(false);
    expect(canManageMembers('master')).toBe(true);
    expect(canManageMembers('admin')).toBe(true);
    expect(canManageMembers('developer')).toBe(false);
    expect(canManageMembers(['developer', 'admin'])).toBe(true);
    expect(canManageDesks('master')).toBe(true);
    expect(canManageDesks('admin')).toBe(true);
    expect(canManageDesks('tester')).toBe(false);
    expect(effectiveTiersOf('developer', ['developer', 'designer'])).toEqual([
      'developer',
      'designer',
    ]);
    expect(canWriteInChannel(['designer'], ['developer', 'designer'])).toBe(
      true,
    );

    expect(canSeeFeedbackMr('master')).toBe(true);
    expect(canSeeFeedbackMr('developer')).toBe(true);
    expect(canSeeFeedbackMr('tester')).toBe(true);
    expect(canSeeFeedbackMr('designer')).toBe(false);

    expect(canAttachFeedbackMr('developer')).toBe(true);
    expect(canAttachFeedbackMr('tester')).toBe(false);

    expect(canResolveFeedback('tester')).toBe(true);
    expect(canResolveFeedback('developer')).toBe(false);

    expect(canProgressFeedback('developer')).toBe(true);
    expect(canProgressFeedback('designer')).toBe(false);

    expect(canWriteInChannel(['admin'], 'master')).toBe(true);
    expect(canWriteInChannel(['admin'], 'tester')).toBe(false);
    expect(canWriteInChannel(undefined, 'tester')).toBe(true);

    // Visibilidade por cargo + exceções individuais
    const restricted = {
      viewTiers: ['master', 'admin', 'developer'] as const,
      allowedEmails: ['extra@empresa.com'],
      blockedEmails: ['dev-bloqueado@empresa.com'],
    };
    expect(canViewChannel(restricted, 'developer', 'dev@empresa.com')).toBe(
      true,
    );
    expect(
      canViewChannel(restricted, 'developer', 'dev-bloqueado@empresa.com'),
    ).toBe(false);
    expect(canViewChannel(restricted, 'tester', 'extra@empresa.com')).toBe(
      true,
    );
    expect(canViewChannel(restricted, 'tester', 'comum@empresa.com')).toBe(
      false,
    );
    // Usuário liberado individualmente em canal onde todos os participantes podem escrever
    expect(
      canWriteInChannel(
        ['master', 'admin', 'developer'],
        'tester',
        restricted,
        'extra@empresa.com',
      ),
    ).toBe(true);
    // Usuário liberado individualmente em canal de escrita restrita a admins
    expect(
      canWriteInChannel(
        ['master', 'admin'],
        'tester',
        restricted,
        'extra@empresa.com',
      ),
    ).toBe(false);
  });

  it('atualiza serverStore', () => {
    useServerStore.getState().setSettings({
      ...DEFAULT_SERVER_SETTINGS,
      name: 'Setter Team',
    });
    expect(useServerStore.getState().settings.name).toBe('Setter Team');
  });
});

describe('workspaceApi', () => {
  const api = createWorkspaceApi({ baseUrl: 'http://test.local' });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lê e atualiza configurações do servidor e canais', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(DEFAULT_SERVER_SETTINGS), { status: 200 }),
    );
    const settings = await api.getServerSettings();
    expect(settings.name).toBe('Escritório Virtual');

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ ...DEFAULT_SERVER_SETTINGS, name: 'Setter Pro' }),
        { status: 200 },
      ),
    );
    const saved = await api.updateServerSettings('tok', {
      name: 'Setter Pro',
      description: '',
      welcomeMessage: '',
      allowPublicRegistration: true,
    });
    expect(saved.ok).toBe(true);

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ channels: [] }), { status: 200 }),
    );
    expect((await api.listChannels('tok')).ok).toBe(true);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          channels: [
            {
              id: 'projetos',
              name: 'projetos',
              kind: 'public',
              archived: false,
              position: 0,
              topic: '',
              viewTiers: ['master', 'admin'],
              writeTiers: ['master', 'admin'],
              allowedEmails: [],
              blockedEmails: [],
            },
          ],
        }),
        { status: 200 },
      ),
    );
    expect(
      (await api.reorderChannels('tok', { channelIds: ['projetos'] })).ok,
    ).toBe(true);

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 }),
    );
    const err = await api.updateChannel('tok', 'geral', { topic: 'x' });
    expect(err).toEqual({ ok: false, error: 'forbidden' });

    fetchMock.mockRejectedValueOnce(new Error('offline'));
    const netErr = await api.listFeedback('tok');
    expect(netErr).toEqual({ ok: false, error: 'network' });

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ accounts: [] }), { status: 200 }),
    );
    expect((await api.listAccounts('tok')).ok).toBe(true);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          account: {
            email: 'a@b.com',
            fullName: 'Ana Dev',
            nickname: 'anadev',
            role: 'Tech Lead',
            tier: 'developer',
            secondaryTiers: ['designer'],
            online: true,
            status: 'available',
            map: 'lobby',
            bannedAt: null,
            banReason: '',
            restrictedUntil: null,
            restrictionReason: '',
            desk: null,
            createdAt: 1,
          },
        }),
        { status: 200 },
      ),
    );
    expect(
      (
        await api.updateAccountRoles('tok', 'a@b.com', {
          tier: 'developer',
          secondaryTiers: ['designer'],
          role: 'Tech Lead',
        })
      ).ok,
    ).toBe(true);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          email: 'a@b.com',
          action: 'ban',
          deskReleased: true,
          account: null,
        }),
        { status: 200 },
      ),
    );
    expect(
      (await api.moderateAccount('tok', 'a@b.com', { action: 'ban' })).ok,
    ).toBe(true);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          desk: {
            map: 'lobby',
            deskId: 'mesa-1',
            owner: null,
            config: FREE_DESK_CONFIG,
          },
        }),
        { status: 200 },
      ),
    );
    expect((await api.releaseAccountDesk('tok', 'a@b.com')).ok).toBe(true);
  });
});
