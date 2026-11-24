import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_SERVER_SETTINGS,
  canAttachFeedbackMr,
  canManageServer,
  canProgressFeedback,
  canResolveFeedback,
  canSeeFeedbackMr,
  canWriteInChannel,
} from '@/shared/domain';

import { useServerStore } from '../model/serverStore';
import { createWorkspaceApi } from './workspaceApi';

describe('workspace permissions & store', () => {
  it('valida permissões por tier', () => {
    expect(canManageServer('master')).toBe(true);
    expect(canManageServer('admin')).toBe(true);
    expect(canManageServer('developer')).toBe(false);

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
    expect(settings.name).toBe('Setter');

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
      new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 }),
    );
    const err = await api.updateChannel('tok', 'geral', { topic: 'x' });
    expect(err).toEqual({ ok: false, error: 'forbidden' });

    fetchMock.mockRejectedValueOnce(new Error('offline'));
    const netErr = await api.listFeedback('tok');
    expect(netErr).toEqual({ ok: false, error: 'network' });
  });
});
