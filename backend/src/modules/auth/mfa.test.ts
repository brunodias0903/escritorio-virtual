import { describe, expect, it } from 'vitest';
import {
  MemoryEmailCodeRepository,
  MemoryLocalAccountRepository,
  MemoryRateLimiter,
  MemoryRevocations,
} from '../../infra/persistence/memory/index.js';
import { parseAccountAccess } from '../../shared/domain/index.js';
import { handleAuthRoutes } from './auth.http.js';
import { AuthService } from './auth.service.js';
import { CodeService } from './codes.service.js';
import { generateTotpCode } from './totp.js';

describe('MFA (TOTP) no AuthService e auth.http', () => {
  it('cobre setup, ativação, login com TOTP, código de recuperação e desativação', async () => {
    const accounts = new MemoryLocalAccountRepository();
    const now = 1_700_000_000_000;
    let lastMailText = '';
    const verifyCodes = new CodeService({
      codes: new MemoryEmailCodeRepository(),
      mailer: {
        send: async (msg) => {
          lastMailText = msg.text;
        },
      },
      secret: 'mfa-test-secret-key',
      now: () => now,
    });
    const auth = new AuthService({
      accounts,
      secret: 'mfa-test-secret-key',
      adminEmails: ['master@setter.app'],
      access: parseAccountAccess('setter.app', ''),
      loginLimiter: new MemoryRateLimiter(50, 60_000),
      revocations: new MemoryRevocations(),
      codes: null,
      verifyCodes,
      now: () => now,
    });

    const reg = await auth.register(
      {
        fullName: 'Bruno Master',
        nickname: 'master',
        email: 'master@setter.app',
        role: 'Founder',
        password: 'Password123!',
        genderIdentity: 'cis_man',
        pronouns: 'ele/dele',
        accessibilityNeeds: ['visual'],
        accessibilityPrefs: {
          highContrast: true,
          reducedMotion: false,
          largeText: true,
          dyslexiaFont: false,
          visualAlerts: false,
          colorblindMode: 'none',
        },
      },
      '127.0.0.1',
    );
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;
    const token = reg.value.token;

    const claims = await auth.authenticate(token);
    const accRes = await auth.account(claims!);
    expect(accRes.ok).toBe(true);
    if (accRes.ok) {
      expect(accRes.value.genderIdentity).toBe('cis_man');
      expect(accRes.value.pronouns).toBe('ele/dele');
      expect(accRes.value.accessibilityNeeds).toEqual(['visual']);
      expect(accRes.value.accessibilityPrefs?.highContrast).toBe(true);
    }

    const updRes = await auth.updateAccount(
      claims!,
      {
        fullName: 'Bruno Master',
        nickname: 'master',
        role: 'Founder',
        currentPassword: '',
        newPassword: '',
        genderIdentity: 'non_binary',
        pronouns: 'elu/delu',
        accessibilityNeeds: ['visual', 'hearing'],
        accessibilityPrefs: {
          highContrast: true,
          reducedMotion: true,
          largeText: true,
          dyslexiaFont: false,
          visualAlerts: true,
          colorblindMode: 'deuteranopia',
        },
      },
      '127.0.0.1',
    );
    expect(updRes.ok).toBe(true);

    // 1. Setup MFA via HTTP
    const setupRes = await handleAuthRoutes(auth, {
      method: 'POST',
      path: '/api/auth/mfa/setup',
      authorization: `Bearer ${token}`,
      body: undefined,
      ip: '127.0.0.1',
    });
    expect(setupRes.status).toBe(200);
    const { secret, qrDataUrl } = setupRes.body as {
      secret: string;
      qrDataUrl: string;
    };
    expect(qrDataUrl.startsWith('data:image/png;base64,')).toBe(true);

    // 2. Ativar com código inválido -> 400
    const badEnable = await handleAuthRoutes(auth, {
      method: 'POST',
      path: '/api/auth/mfa/enable',
      authorization: `Bearer ${token}`,
      body: { code: '000000' },
      ip: '127.0.0.1',
    });
    expect(badEnable.status).toBe(400);

    // 3. Ativar com código TOTP válido -> 200 + 8 recovery codes
    const validCode = generateTotpCode(secret, now);
    const enableRes = await handleAuthRoutes(auth, {
      method: 'POST',
      path: '/api/auth/mfa/enable',
      authorization: `Bearer ${token}`,
      body: { code: validCode },
      ip: '127.0.0.1',
    });
    expect(enableRes.status).toBe(200);
    const { recoveryCodes } = enableRes.body as { recoveryCodes: string[] };
    expect(recoveryCodes).toHaveLength(8);

    // 4. Login sem mfaCode -> 401 mfa_required
    const loginNoMfa = await handleAuthRoutes(auth, {
      method: 'POST',
      path: '/api/auth/login',
      authorization: undefined,
      body: { login: 'master', password: 'Password123!' },
      ip: '127.0.0.1',
    });
    expect(loginNoMfa.status).toBe(401);
    expect(loginNoMfa.body).toEqual({ error: 'mfa_required' });

    // 5. Login com TOTP válido -> 200
    const loginTotp = await handleAuthRoutes(auth, {
      method: 'POST',
      path: '/api/auth/login',
      authorization: undefined,
      body: { login: 'master', password: 'Password123!', mfaCode: validCode },
      ip: '127.0.0.1',
    });
    expect(loginTotp.status).toBe(200);

    // 6. Login com código de recuperação (uso único) -> 200 na 1ª, 401 na 2ª
    const loginRecovery1 = await auth.login(
      'master',
      'Password123!',
      '127.0.0.1',
      recoveryCodes[0],
    );
    expect(loginRecovery1.ok).toBe(true);

    const loginRecovery2 = await auth.login(
      'master',
      'Password123!',
      '127.0.0.1',
      recoveryCodes[0],
    );
    expect(loginRecovery2.ok).toBe(false);

    // 7. Desativar MFA com senha errada e código errado -> 403 / 400
    const badPassDisable = await handleAuthRoutes(auth, {
      method: 'POST',
      path: '/api/auth/mfa/disable',
      authorization: `Bearer ${token}`,
      body: { password: 'WrongPassword!', code: validCode },
      ip: '127.0.0.1',
    });
    expect(badPassDisable.status).toBe(403);

    const badCodeDisable = await handleAuthRoutes(auth, {
      method: 'POST',
      path: '/api/auth/mfa/disable',
      authorization: `Bearer ${token}`,
      body: { password: 'Password123!', code: '000000' },
      ip: '127.0.0.1',
    });
    expect(badCodeDisable.status).toBe(400);

    const unauthSetup = await handleAuthRoutes(auth, {
      method: 'POST',
      path: '/api/auth/mfa/setup',
      authorization: undefined,
      body: undefined,
      ip: '127.0.0.1',
    });
    expect(unauthSetup.status).toBe(401);

    const wrongMethodSetup = await handleAuthRoutes(auth, {
      method: 'GET',
      path: '/api/auth/mfa/setup',
      authorization: `Bearer ${token}`,
      body: undefined,
      ip: '127.0.0.1',
    });
    expect(wrongMethodSetup.status).toBe(405);

    const badMethodEnable = await handleAuthRoutes(auth, {
      method: 'GET',
      path: '/api/auth/mfa/enable',
      authorization: `Bearer ${token}`,
      body: undefined,
      ip: '127.0.0.1',
    });
    expect(badMethodEnable.status).toBe(405);

    const badBodyEnable = await handleAuthRoutes(auth, {
      method: 'POST',
      path: '/api/auth/mfa/enable',
      authorization: `Bearer ${token}`,
      body: { code: 'x' },
      ip: '127.0.0.1',
    });
    expect(badBodyEnable.status).toBe(400);

    const badMethodDisable = await handleAuthRoutes(auth, {
      method: 'GET',
      path: '/api/auth/mfa/disable',
      authorization: `Bearer ${token}`,
      body: undefined,
      ip: '127.0.0.1',
    });
    expect(badMethodDisable.status).toBe(405);

    // 8. Desativar MFA -> 200
    const disableRes = await handleAuthRoutes(auth, {
      method: 'POST',
      path: '/api/auth/mfa/disable',
      authorization: `Bearer ${token}`,
      body: { password: 'Password123!', code: validCode },
      ip: '127.0.0.1',
    });
    expect(disableRes.status).toBe(200);

    // 9. Login sem MFA volta a funcionar diretamente
    const loginAfter = await auth.login('master', 'Password123!', '127.0.0.1');
    expect(loginAfter.ok).toBe(true);

    // 9b. MFA por e-mail via HTTP (rejeita se não verificado; ativa quando verificado)
    expect(
      (
        await handleAuthRoutes(auth, {
          method: 'GET',
          path: '/api/auth/mfa/email',
          authorization: `Bearer ${token}`,
          body: undefined,
          ip: '127.0.0.1',
        })
      ).status,
    ).toBe(405);
    expect(
      (
        await handleAuthRoutes(auth, {
          method: 'POST',
          path: '/api/auth/mfa/email',
          authorization: undefined,
          body: { enabled: true },
          ip: '127.0.0.1',
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await handleAuthRoutes(auth, {
          method: 'POST',
          path: '/api/auth/mfa/email',
          authorization: `Bearer ${token}`,
          body: {},
          ip: '127.0.0.1',
        })
      ).status,
    ).toBe(400);

    const emailMfaUnverified = await handleAuthRoutes(auth, {
      method: 'POST',
      path: '/api/auth/mfa/email',
      authorization: `Bearer ${token}`,
      body: { enabled: true },
      ip: '127.0.0.1',
    });
    expect(emailMfaUnverified.status).toBe(400);
    await accounts.markVerified('master@setter.app');

    const emailMfaOn = await handleAuthRoutes(auth, {
      method: 'POST',
      path: '/api/auth/mfa/email',
      authorization: `Bearer ${token}`,
      body: { enabled: true },
      ip: '127.0.0.1',
    });
    expect(emailMfaOn.status).toBe(200);
    expect(emailMfaOn.body).toEqual({ mfaEnabled: true, mfaMethod: 'email' });

    // Login com MFA por e-mail: sem código envia e-mail e pede mfa_required_email
    const loginEmailReq = await auth.login(
      'master',
      'Password123!',
      '127.0.0.1',
    );
    expect(loginEmailReq.ok).toBe(false);
    if (!loginEmailReq.ok) {
      expect(loginEmailReq.error).toBe('mfa_required_email');
    }
    const emailCode = /\b(\d{6})\b/.exec(lastMailText)?.[1] ?? '';
    expect(emailCode).toMatch(/^\d{6}$/);

    // Código errado -> 401
    const loginEmailBad = await auth.login(
      'master',
      'Password123!',
      '127.0.0.1',
      '000000',
    );
    expect(loginEmailBad.ok).toBe(false);

    // Código certo -> 200
    const loginEmailOk = await auth.login(
      'master',
      'Password123!',
      '127.0.0.1',
      emailCode,
    );
    expect(loginEmailOk.ok).toBe(true);

    const emailMfaOff = await handleAuthRoutes(auth, {
      method: 'POST',
      path: '/api/auth/mfa/email',
      authorization: `Bearer ${token}`,
      body: { enabled: false },
      ip: '127.0.0.1',
    });
    expect(emailMfaOff.status).toBe(200);
    expect(emailMfaOff.body).toEqual({ mfaEnabled: false, mfaMethod: 'none' });

    // 10. LGPD: exportação de dados e exclusão de conta
    expect(
      (
        await handleAuthRoutes(auth, {
          method: 'POST',
          path: '/api/auth/export',
          authorization: `Bearer ${token}`,
          body: undefined,
          ip: '127.0.0.1',
        })
      ).status,
    ).toBe(405);
    expect(
      (
        await handleAuthRoutes(auth, {
          method: 'GET',
          path: '/api/auth/export',
          authorization: undefined,
          body: undefined,
          ip: '127.0.0.1',
        })
      ).status,
    ).toBe(401);

    const expRes = await handleAuthRoutes(auth, {
      method: 'GET',
      path: '/api/auth/export',
      authorization: `Bearer ${token}`,
      body: undefined,
      ip: '127.0.0.1',
    });
    expect(expRes.status).toBe(200);

    expect(
      (
        await handleAuthRoutes(auth, {
          method: 'DELETE',
          path: '/api/auth/account',
          authorization: undefined,
          body: { password: 'Password123!' },
          ip: '127.0.0.1',
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await handleAuthRoutes(auth, {
          method: 'DELETE',
          path: '/api/auth/account',
          authorization: `Bearer ${token}`,
          body: {},
          ip: '127.0.0.1',
        })
      ).status,
    ).toBe(400);

    const delBad = await handleAuthRoutes(auth, {
      method: 'DELETE',
      path: '/api/auth/account',
      authorization: `Bearer ${token}`,
      body: { password: 'WrongPassword!' },
      ip: '127.0.0.1',
    });
    expect(delBad.status).toBe(403);

    const delOk = await handleAuthRoutes(auth, {
      method: 'DELETE',
      path: '/api/auth/account',
      authorization: `Bearer ${token}`,
      body: { password: 'Password123!' },
      ip: '127.0.0.1',
    });
    expect(delOk.status).toBe(200);
  }, 15_000);
});
