import { lazy, Suspense, useEffect } from 'react';

import { MobileInstallPrompt } from '@/features/pwa/MobileInstallPrompt';
import { useSessionStore } from '@/features/session/model/sessionStore';
import { LoginPage } from '@/pages/login/LoginPage';

import { restoreSession } from './session';

const OfficePage = lazy(() =>
  import('@/pages/office/OfficePage').then((module) => ({
    default: module.OfficePage,
  })),
);

const BLANK_SCREEN = (
  <div
    style={{
      width: '100%',
      height: '100%',
      backgroundColor: 'var(--bg-app)',
    }}
  />
);

export function App() {
  const session = useSessionStore((state) => state.session);
  const hydrated = useSessionStore((state) => state.hydrated);

  useEffect(() => {
    void restoreSession();
  }, []);

  if (!hydrated) return BLANK_SCREEN;

  if (!session) {
    return (
      <>
        <LoginPage />
        <MobileInstallPrompt />
      </>
    );
  }

  return (
    <Suspense fallback={BLANK_SCREEN}>
      <OfficePage session={session} />
      <MobileInstallPrompt />
    </Suspense>
  );
}
