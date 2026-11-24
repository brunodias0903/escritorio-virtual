import { describe, expect, it } from 'vitest';

import { detectMobileEnvironment } from './mobileInstall';

describe('detectMobileEnvironment', () => {
  it('identifica iPhone no Safari', () => {
    const env = detectMobileEnvironment({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
      standalone: false,
      displayModeStandalone: false,
    });
    expect(env).toEqual({
      platform: 'ios',
      formFactor: 'phone',
      browser: 'safari',
      isStandalone: false,
    });
  });

  it('identifica iPadOS com UA de desktop (Macintosh + touch)', () => {
    const env = detectMobileEnvironment({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 5,
      standalone: false,
      displayModeStandalone: false,
    });
    expect(env).toEqual({
      platform: 'ios',
      formFactor: 'tablet',
      browser: 'safari',
      isStandalone: false,
    });
  });

  it('identifica iPhone no Chrome (CriOS)', () => {
    const env = detectMobileEnvironment({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.6312.52 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
      standalone: false,
      displayModeStandalone: false,
    });
    expect(env.platform).toBe('ios');
    expect(env.browser).toBe('chrome');
  });

  it('identifica smartphone Android no Chrome', () => {
    const env = detectMobileEnvironment({
      userAgent:
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36',
      platform: 'Linux armv81',
      maxTouchPoints: 5,
      standalone: false,
      displayModeStandalone: false,
    });
    expect(env).toEqual({
      platform: 'android',
      formFactor: 'phone',
      browser: 'chrome',
      isStandalone: false,
    });
  });

  it('identifica tablet Android (sem token Mobile)', () => {
    const env = detectMobileEnvironment({
      userAgent:
        'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Safari/537.36',
      platform: 'Linux armv81',
      maxTouchPoints: 10,
      standalone: false,
      displayModeStandalone: false,
    });
    expect(env).toEqual({
      platform: 'android',
      formFactor: 'tablet',
      browser: 'samsung',
      isStandalone: false,
    });
  });

  it('retorna platform null para desktop', () => {
    const env = detectMobileEnvironment({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      platform: 'MacIntel',
      maxTouchPoints: 0,
      standalone: false,
      displayModeStandalone: false,
    });
    expect(env.platform).toBeNull();
  });

  it('detecta modo standalone já instalado', () => {
    const env = detectMobileEnvironment({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
      standalone: true,
      displayModeStandalone: false,
    });
    expect(env.isStandalone).toBe(true);
  });
});
