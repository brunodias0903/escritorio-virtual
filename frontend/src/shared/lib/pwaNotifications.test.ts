import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  canRequestNotificationPermission,
  requestNotificationPermission,
  showPwaNotification,
  syncAppBadge,
} from './pwaNotifications';

describe('pwaNotifications', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sincroniza e limpa o app badge quando suportado', () => {
    const setAppBadge = vi.fn().mockResolvedValue(undefined);
    const clearAppBadge = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { setAppBadge, clearAppBadge });

    syncAppBadge(3);
    expect(setAppBadge).toHaveBeenCalledWith(3);

    syncAppBadge(0);
    expect(clearAppBadge).toHaveBeenCalledTimes(1);
  });

  it('verifica e solicita permissão de notificação', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted');
    const notif = {
      permission: 'default',
      requestPermission,
    };
    vi.stubGlobal('Notification', notif);
    vi.stubGlobal('window', { Notification: notif });

    expect(canRequestNotificationPermission()).toBe(true);
    await expect(requestNotificationPermission()).resolves.toBe('granted');
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it('envia notificação via Service Worker quando oculto e permitido', async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined);
    const notif = { permission: 'granted' };
    vi.stubGlobal('Notification', notif);
    vi.stubGlobal('window', { Notification: notif });
    vi.stubGlobal('document', { visibilityState: 'hidden' });
    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve({ showNotification }),
      },
    });

    await showPwaNotification({
      title: 'Nova menção',
      body: 'Teste',
      tag: 'mention-1',
    });

    expect(showNotification).toHaveBeenCalledWith(
      'Nova menção',
      expect.objectContaining({
        body: 'Teste',
        tag: 'mention-1',
      }),
    );
  });

  it('não envia notificação quando a aba está visível ou sem permissão', async () => {
    const showNotification = vi.fn();
    vi.stubGlobal('Notification', { permission: 'denied' });
    vi.stubGlobal('document', { visibilityState: 'visible' });
    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve({ showNotification }),
      },
    });

    await showPwaNotification({ title: 'X', body: 'Y' });
    expect(showNotification).not.toHaveBeenCalled();
  });
});
