/**
 * Utilitários PWA para badge do ícone do app e notificações nativas via Service Worker.
 */

type BadgeNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export const syncAppBadge = (count: number): void => {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as BadgeNavigator;
  try {
    if (count > 0) {
      void nav.setAppBadge?.(count).catch(() => {});
    } else {
      void nav.clearAppBadge?.().catch(() => {});
    }
  } catch {
    // API não suportada pelo navegador
  }
};

export const canRequestNotificationPermission = (): boolean =>
  typeof window !== 'undefined' &&
  'Notification' in window &&
  Notification.permission === 'default';

export const requestNotificationPermission = async (): Promise<
  NotificationPermission | 'unsupported'
> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
};

export const showPwaNotification = async (opts: {
  title: string;
  body: string;
  tag?: string;
}): Promise<void> => {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    !('Notification' in window)
  ) {
    return;
  }
  if (Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(opts.title, {
        body: opts.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: opts.tag ?? 'setter-notify',
      });
      return;
    }
  } catch {
    // fallback abaixo
  }

  try {
    new Notification(opts.title, {
      body: opts.body,
      icon: '/icon-192.png',
      tag: opts.tag ?? 'setter-notify',
    });
  } catch {
    // mobile Chrome exige ServiceWorkerRegistration.showNotification
  }
};
