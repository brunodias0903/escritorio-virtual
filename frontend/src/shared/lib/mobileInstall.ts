export type MobilePlatform = 'ios' | 'android' | null;
export type MobileFormFactor = 'phone' | 'tablet';
export type MobileBrowser =
  'safari' | 'chrome' | 'edge' | 'firefox' | 'samsung' | 'other';

export type MobileEnvironment = {
  platform: MobilePlatform;
  formFactor: MobileFormFactor;
  browser: MobileBrowser;
  isStandalone: boolean;
};

export type MobileEnvInput = {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  standalone: boolean;
  displayModeStandalone: boolean;
};

function readBrowserEnv(): MobileEnvInput {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      userAgent: '',
      platform: '',
      maxTouchPoints: 0,
      standalone: false,
      displayModeStandalone: false,
    };
  }
  const nav = navigator as Navigator & { standalone?: boolean };
  const displayModeStandalone =
    typeof window.matchMedia === 'function' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches);

  return {
    userAgent: navigator.userAgent ?? '',
    platform: navigator.platform ?? '',
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    standalone: nav.standalone === true,
    displayModeStandalone,
  };
}

/**
 * Identifica se o acesso atual ocorre em um smartphone ou tablet Android/iOS
 * (incluindo iPadOS 13+ que se identifica como Macintosh com toque) e se o app
 * já está rodando instalado em modo standalone.
 */
export function detectMobileEnvironment(
  input: MobileEnvInput = readBrowserEnv(),
): MobileEnvironment {
  const ua = input.userAgent;
  const isStandalone = input.standalone || input.displayModeStandalone;

  const isExplicitIos = /iPhone|iPad|iPod/i.test(ua);
  const isIpadOsDesktopUa =
    (/Macintosh/i.test(ua) || input.platform === 'MacIntel') &&
    input.maxTouchPoints > 1;

  if (isExplicitIos || isIpadOsDesktopUa) {
    const formFactor: MobileFormFactor =
      /iPad/i.test(ua) || isIpadOsDesktopUa ? 'tablet' : 'phone';
    const browser: MobileBrowser = /CriOS/i.test(ua)
      ? 'chrome'
      : /EdgiOS/i.test(ua)
        ? 'edge'
        : /FxiOS/i.test(ua)
          ? 'firefox'
          : /Safari/i.test(ua) && !/OPiOS/i.test(ua)
            ? 'safari'
            : 'other';
    return { platform: 'ios', formFactor, browser, isStandalone };
  }

  if (/Android/i.test(ua)) {
    const formFactor: MobileFormFactor = /Mobile/i.test(ua)
      ? 'phone'
      : 'tablet';
    const browser: MobileBrowser = /SamsungBrowser/i.test(ua)
      ? 'samsung'
      : /EdgA/i.test(ua)
        ? 'edge'
        : /Firefox/i.test(ua)
          ? 'firefox'
          : /Chrome/i.test(ua) && !/OPR/i.test(ua)
            ? 'chrome'
            : 'other';
    return { platform: 'android', formFactor, browser, isStandalone };
  }

  return {
    platform: null,
    formFactor: 'phone',
    browser: 'other',
    isStandalone,
  };
}

export const INSTALL_PROMPT_STORAGE_KEY = 'voffice:pwa-install-dismissed:v1';
export const INSTALL_DISMISS_DAYS = 7;

export function isInstallPromptDismissed(now = Date.now()): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(INSTALL_PROMPT_STORAGE_KEY);
    if (!raw) return false;
    if (raw === 'forever') return true;
    const until = Number(raw);
    return Number.isFinite(until) && until > now;
  } catch {
    return false;
  }
}

export function dismissInstallPrompt(
  mode: 'later' | 'forever',
  now = Date.now(),
): void {
  if (typeof window === 'undefined') return;
  try {
    if (mode === 'forever') {
      window.localStorage.setItem(INSTALL_PROMPT_STORAGE_KEY, 'forever');
      return;
    }
    const until = now + INSTALL_DISMISS_DAYS * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(INSTALL_PROMPT_STORAGE_KEY, String(until));
  } catch {
    // ignora storage bloqueado
  }
}
