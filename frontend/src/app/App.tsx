import { tamaguiConfig } from '@design-system/tamagui.config';
import { lazy, Suspense, useEffect } from 'react';
import { PortalProvider, TamaguiProvider, Theme } from 'tamagui';

import { MobileInstallPrompt } from '@/features/pwa/MobileInstallPrompt';
import { useSessionStore } from '@/features/session/model/sessionStore';
import { useThemeStore } from '@/features/theme/themeStore';
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
  const presetId = useThemeStore((state) => state.presetId);
  const mode = useThemeStore((state) => state.mode);

  useEffect(() => {
    void restoreSession();
  }, []);

  let content = BLANK_SCREEN;
  if (hydrated) {
    content = session ? (
      <Suspense fallback={BLANK_SCREEN}>
        <OfficePage session={session} />
        <MobileInstallPrompt />
      </Suspense>
    ) : (
      <>
        <LoginPage />
        <MobileInstallPrompt />
      </>
    );
  }

  const themeName = `${presetId}_${mode}` as const;

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme={themeName}>
      <Theme name={themeName}>
        <PortalProvider shouldAddRootHost>{content}</PortalProvider>
      </Theme>
    </TamaguiProvider>
  );
}
