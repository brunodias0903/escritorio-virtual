import {
  AccessibilityPrefsSchema,
  NicknameSchema,
  UiThemeSchema,
  accountKindOf,
  canManageServer,
  effectiveTiersOf,
  normalizeEmail,
  type AccessibilityPrefs,
  type Account,
  type AccountAccess,
  type AccountTier,
  type AuthOptions,
  type EmailChangeConfirm,
  type MfaEnableResponse,
  type MfaSetupResponse,
  type Register,
  type RequestCode,
  type ResetPassword,
  type Session,
  type UiTheme,
  type UpdateAccount,
} from '../../shared/domain/index.js';
import { httpFail, ok, type HttpResult } from '../../shared/result.js';
import type {
  LocalAccount,
  LocalAccountRepository,
  RateLimit,
  Revocations,
} from './auth.repository.js';
import type { CodeService } from './codes.service.js';
import {
  hashPassword,
  verifyAgainstDummy,
  verifyPassword,
} from './password.js';
import { signSession, verifySession, type SessionClaims } from './token.js';
import {
  buildOtpAuthUri,
  decryptTotpSecret,
  encryptTotpSecret,
  generateQrDataUrl,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  verifyTotpCode,
} from './totp.js';

export const SESSION_TTL_SECONDS = 12 * 60 * 60;

type Deps = {
  accounts: LocalAccountRepository;
  secret: string;
  adminEmails: string[];
  /** Quem pode criar conta (ACCOUNT_DOMAINS e ALLOWED_EMAILS). */
  access: AccountAccess;
  /** Limita tentativas de login (por IP e por conta) e de cadastro (por IP). */
  loginLimiter: RateLimit;
  /** Sessões encerradas antes de vencer. */
  revocations: Revocations;
  /** Códigos por e-mail (criar conta e esqueci a senha). null = desligado. */
  codes: CodeService | null;
  /** Envio de códigos para verificação voluntária de e-mail em contas já criadas. */
  verifyCodes?: CodeService | null;
  /** Permite criação de novas contas. False em ambientes de preview. */
  allowRegistration?: boolean;
  /** Verifica se o e-mail foi convidado na lista de algum servidor. */
  isEmailInvited?: (email: string) => Promise<boolean>;
  /** Verifica se o e-mail possui assinatura ativa. */
  isSubscriber?: (email: string) => Promise<boolean>;
  /** Executado após a criação da conta para associar servidores convidados. */
  onRegistered?: (email: string) => Promise<void>;
  /** Permite cadastro aberto quando o servidor padrão está com registro público ativo. */
  isPublicRegistrationOpen?: () => Promise<boolean>;
  /** Chamado após excluir a conta (para liberar mesa e encerrar conexões ativas). */
  onAccountDeleted?: (email: string) => Promise<void> | void;
  now?: () => number;
};

/**
 * Contas com nickname e senha. Só os e-mails liberados no servidor
 * (ACCOUNT_DOMAINS e ALLOWED_EMAILS) podem se cadastrar. Entra-se com o nickname ou o e-mail.
 */
export class AuthService {
  private readonly deps: Deps;
  private readonly now: () => number;

  constructor(deps: Deps) {
    this.deps = deps;
    this.now = deps.now ?? Date.now;
  }

  /** O que a tela de login precisa saber. */
  options(): AuthOptions {
    return {
      emailCodes: this.deps.codes !== null,
      domains: this.deps.access.domains.map((d) => d.domain),
      ...(this.deps.allowRegistration === false
        ? { allowRegistration: false }
        : {}),
    };
  }

  /**
   * Manda o código por e-mail. Para "esqueci a senha", só manda se a conta
   * existe, mas a resposta é a mesma: não revela quem tem conta.
   */
  async requestCode(input: RequestCode, ip: string): Promise<HttpResult<null>> {
    const { accounts, loginLimiter, codes } = this.deps;
    if (!codes) return httpFail(404, 'not_found');
    const email = normalizeEmail(input.email);
    if (
      !(await loginLimiter.attempt(`code-ip|${ip}`)) ||
      !(await loginLimiter.attempt(`code|${email}`))
    ) {
      return httpFail(429, 'too_many_attempts');
    }
    if (input.purpose === 'register') {
      if (this.deps.allowRegistration === false) {
        return httpFail(403, 'registration_disabled');
      }
      if (this.deps.isEmailInvited) {
        const whitelisted =
          this.deps.adminEmails.includes(email) ||
          this.deps.access.emails.includes(email);
        const invited = whitelisted || (await this.deps.isEmailInvited(email));
        const subscriber =
          invited || ((await this.deps.isSubscriber?.(email)) ?? false);
        if (!invited && !subscriber) {
          return httpFail(403, 'invite_required');
        }
      } else if (!accountKindOf(email, this.deps.access)) {
        return httpFail(403, 'email_not_allowed');
      }
      const existing = await accounts.byEmail(email);
      if (existing) {
        return httpFail(
          existing.bannedAt ? 403 : 409,
          existing.bannedAt ? 'account_banned' : 'email_taken',
        );
      }
    }
    if (input.purpose === 'reset') {
      const existing = await accounts.byEmail(email);
      if (!existing) return ok(null);
      const blocked = this.moderationBlockCode(existing);
      if (blocked) return httpFail(403, blocked);
    }
    const sent = await codes.send(email, input.purpose);
    if (sent === 'wait') return httpFail(429, 'code_wait');
    if (sent === 'mail_failed') return httpFail(502, 'mail_failed');
    return ok(null);
  }

  /** Esqueci a senha: com o código do e-mail, troca a senha e já entra. */
  async resetPassword(
    input: ResetPassword,
    ip: string,
  ): Promise<HttpResult<Session>> {
    const { accounts, loginLimiter, codes } = this.deps;
    if (!codes) return httpFail(404, 'not_found');
    if (!(await loginLimiter.attempt(`reset|${ip}`))) {
      return httpFail(429, 'too_many_attempts');
    }
    const email = normalizeEmail(input.email);
    const account = await accounts.byEmail(email);
    if (account) {
      const blocked = this.moderationBlockCode(account);
      if (blocked) return httpFail(403, blocked);
    }
    if (!account || !(await codes.check(email, 'reset', input.code))) {
      return httpFail(400, 'invalid_code');
    }
    const passwordHash = await hashPassword(input.password);
    const { nickname, fullName, role } = account;
    await accounts.update(email, { nickname, fullName, role, passwordHash });
    await codes.consume(email, 'reset');
    await loginLimiter.reset(`login|${email}`);
    await loginLimiter.reset(`login|${nickname.toLowerCase()}`);
    return ok(this.createSession({ ...account, passwordHash }));
  }

  /** Cria a conta e já entra. Com os códigos ligados, pede o do e-mail. Nickname e e-mail não repetem. */
  async register(input: Register, ip: string): Promise<HttpResult<Session>> {
    if (this.deps.allowRegistration === false) {
      return httpFail(403, 'registration_disabled');
    }
    const { accounts, loginLimiter, codes } = this.deps;
    if (!(await loginLimiter.attempt(`register|${ip}`))) {
      return httpFail(429, 'too_many_attempts');
    }
    const email = normalizeEmail(input.email);
    let kind = accountKindOf(email, this.deps.access);
    if (this.deps.isEmailInvited) {
      const whitelisted =
        this.deps.adminEmails.includes(email) ||
        this.deps.access.emails.includes(email);
      const invited = whitelisted || (await this.deps.isEmailInvited(email));
      const subscriber =
        invited || ((await this.deps.isSubscriber?.(email)) ?? false);
      if (!invited && !subscriber) {
        return httpFail(403, 'invite_required');
      }
      kind = kind ?? 'company';
    } else if (!kind) {
      return httpFail(403, 'email_not_allowed');
    }
    if (input.acceptedTerms === false) {
      return httpFail(400, 'terms_required');
    }
    if (
      codes &&
      !(input.code && (await codes.check(email, 'register', input.code)))
    ) {
      return httpFail(400, 'invalid_code');
    }

    const isMaster = email === this.deps.adminEmails[0];
    const isAdmin = kind === 'company' && this.deps.adminEmails.includes(email);
    const account: LocalAccount = {
      nickname: input.nickname,
      fullName: input.fullName,
      email,
      role: input.role,
      passwordHash: await hashPassword(input.password),
      createdAt: this.now(),
      tier: isMaster ? 'master' : isAdmin ? 'admin' : 'tester',
      emailVerified: Boolean(codes),
      emailMarketingOptIn: Boolean(input.emailMarketingOptIn),
      uiTheme: null,
      ...(input.genderIdentity ? { genderIdentity: input.genderIdentity } : {}),
      ...(input.pronouns ? { pronouns: input.pronouns } : {}),
      ...(input.accessibilityNeeds?.length
        ? { accessibilityNeeds: input.accessibilityNeeds }
        : {}),
      ...(input.accessibilityPrefs
        ? { accessibilityPrefs: JSON.stringify(input.accessibilityPrefs) }
        : {}),
    };
    const created = await accounts.create(account);
    if (created !== 'ok') return httpFail(409, created);
    await codes?.consume(email, 'register');
    await this.deps.onRegistered?.(email);
    return ok(this.createSession(account));
  }

  /** Entra com o nickname ou o e-mail, e a senha (mais código MFA se ativado). */
  async login(
    rawLogin: string,
    password: string,
    ip: string,
    mfaCode?: string,
  ): Promise<HttpResult<Session>> {
    const { accounts, loginLimiter } = this.deps;
    const byEmail = rawLogin.includes('@');
    const login = byEmail ? normalizeEmail(rawLogin) : rawLogin.trim();
    const key = `login|${login.toLowerCase()}`;
    if (
      !(await loginLimiter.attempt(`ip|${ip}`)) ||
      !(await loginLimiter.attempt(key))
    ) {
      return httpFail(429, 'too_many_attempts');
    }

    const account = byEmail
      ? await accounts.byEmail(login)
      : await accounts.byNickname(login);
    // Sem conta, confere contra uma senha falsa: o tempo de resposta não
    // revela quem tem conta.
    const valid = account
      ? await verifyPassword(password, account.passwordHash)
      : await verifyAgainstDummy(password);
    if (!account || !valid) return httpFail(401, 'invalid_login');

    const blocked = this.moderationBlockCode(account);
    if (blocked) return httpFail(403, blocked);

    if (account.mfaEnabled) {
      const method =
        account.mfaMethod ?? (account.mfaSecretEnc ? 'totp' : 'email');
      const trimmed = (mfaCode ?? '').trim();
      if (method === 'email') {
        const codeService = this.deps.codes ?? this.deps.verifyCodes ?? null;
        if (!codeService) return httpFail(502, 'mail_failed');
        if (!trimmed) {
          const sent = await codeService.send(account.email, 'mfa');
          if (sent === 'mail_failed') return httpFail(502, 'mail_failed');
          return httpFail(401, 'mfa_required_email');
        }
        if (!(await codeService.check(account.email, 'mfa', trimmed))) {
          return httpFail(401, 'invalid_mfa_code');
        }
        await codeService.consume(account.email, 'mfa');
      } else if (account.mfaSecretEnc) {
        if (!trimmed) {
          return httpFail(401, 'mfa_required');
        }
        const mfaOk = await this.verifyAndConsumeMfa(account, trimmed);
        if (!mfaOk) return httpFail(401, 'invalid_mfa_code');
      }
    }

    await loginLimiter.reset(key);
    return ok(this.createSession(account));
  }

  /** Os dados da conta de quem está logado, para a tela de edição. */
  async account(claims: SessionClaims): Promise<HttpResult<Account>> {
    const account = await this.deps.accounts.byEmail(claims.email);
    if (!account) return httpFail(404, 'no_account');
    const { fullName, nickname, email, role } = account;
    let uiTheme: UiTheme | null = null;
    if (account.uiTheme) {
      try {
        const parsed = UiThemeSchema.safeParse(JSON.parse(account.uiTheme));
        if (parsed.success) uiTheme = parsed.data;
      } catch {
        uiTheme = null;
      }
    }
    let accessibilityPrefs: AccessibilityPrefs | null | undefined;
    if (account.accessibilityPrefs) {
      try {
        const parsed = AccessibilityPrefsSchema.safeParse(
          JSON.parse(account.accessibilityPrefs),
        );
        if (parsed.success) accessibilityPrefs = parsed.data;
      } catch {
        accessibilityPrefs = null;
      }
    }
    const primaryTier = this.resolveTier(account);
    const secondaryTiers = this.resolveSecondaryTiers(account, primaryTier);
    return ok({
      fullName,
      nickname,
      email,
      role,
      tier: primaryTier,
      secondaryTiers,
      emailVerified: Boolean(account.emailVerified),
      mfaEnabled: Boolean(account.mfaEnabled),
      ...(account.mfaEnabled
        ? {
            mfaMethod:
              account.mfaMethod ?? (account.mfaSecretEnc ? 'totp' : 'email'),
          }
        : {}),
      emailMarketingOptIn:
        account.emailMarketingOptIn === undefined
          ? null
          : account.emailMarketingOptIn,
      uiTheme,
      ...(account.genderIdentity
        ? { genderIdentity: account.genderIdentity }
        : {}),
      ...(account.pronouns ? { pronouns: account.pronouns } : {}),
      ...(account.accessibilityNeeds?.length
        ? { accessibilityNeeds: account.accessibilityNeeds }
        : {}),
      ...(accessibilityPrefs !== undefined ? { accessibilityPrefs } : {}),
    });
  }

  /** Salva a preferência de recebimento de e-mails (novidades/patch notes vs só importantes). */
  async updateEmailPreferences(
    claims: SessionClaims,
    marketingOptIn: boolean,
  ): Promise<HttpResult<{ emailMarketingOptIn: boolean }>> {
    const { accounts } = this.deps;
    if (!accounts.setEmailMarketingOptIn) {
      return ok({ emailMarketingOptIn: marketingOptIn });
    }
    const res = await accounts.setEmailMarketingOptIn(
      claims.email,
      marketingOptIn,
    );
    if (res === 'not_found') return httpFail(404, 'no_account');
    return ok({ emailMarketingOptIn: marketingOptIn });
  }

  /** Envia código de 6 dígitos para verificar o e-mail da conta já logada. */
  async requestVerifyCode(
    claims: SessionClaims,
    ip: string,
  ): Promise<HttpResult<null>> {
    const { accounts, loginLimiter } = this.deps;
    const codeService = this.deps.codes ?? this.deps.verifyCodes ?? null;
    if (!codeService) return httpFail(404, 'not_found');
    const account = await accounts.byEmail(claims.email);
    if (!account) return httpFail(404, 'no_account');
    if (account.emailVerified) return ok(null);
    if (
      !(await loginLimiter.attempt(`code-ip|${ip}`)) ||
      !(await loginLimiter.attempt(`verify|${account.email}`))
    ) {
      return httpFail(429, 'too_many_attempts');
    }
    const sent = await codeService.send(account.email, 'verify');
    if (sent === 'wait') return httpFail(429, 'code_wait');
    if (sent === 'mail_failed') return httpFail(502, 'mail_failed');
    return ok(null);
  }

  /** Confirma o código de 6 dígitos e marca o e-mail da conta como verificado. */
  async confirmVerifyEmail(
    claims: SessionClaims,
    code: string,
    ip: string,
  ): Promise<HttpResult<{ emailVerified: true }>> {
    const { accounts, loginLimiter } = this.deps;
    const codeService = this.deps.codes ?? this.deps.verifyCodes ?? null;
    if (!codeService) return httpFail(404, 'not_found');
    if (!(await loginLimiter.attempt(`verify-confirm|${ip}`))) {
      return httpFail(429, 'too_many_attempts');
    }
    const account = await accounts.byEmail(claims.email);
    if (!account) return httpFail(404, 'no_account');
    if (account.emailVerified) return ok({ emailVerified: true });
    if (!(await codeService.check(account.email, 'verify', code))) {
      return httpFail(400, 'invalid_code');
    }
    if (accounts.markVerified) {
      await accounts.markVerified(account.email);
    }
    await codeService.consume(account.email, 'verify');
    return ok({ emailVerified: true });
  }

  /** Salva o tema e as cores escolhidas pelo usuário na conta (sincroniza entre dispositivos). */
  async updateTheme(
    claims: SessionClaims,
    uiTheme: UiTheme,
  ): Promise<HttpResult<{ ok: true }>> {
    const { accounts } = this.deps;
    if (!accounts.setUiTheme) return ok({ ok: true });
    const res = await accounts.setUiTheme(
      claims.email,
      JSON.stringify(uiTheme),
    );
    if (res === 'not_found') return httpFail(404, 'no_account');
    return ok({ ok: true });
  }

  /** Ativa ou desativa o 2FA por e-mail (usa o e-mail verificado da conta). */
  async setEmailMfa(
    claims: SessionClaims,
    enabled: boolean,
  ): Promise<HttpResult<{ mfaEnabled: boolean; mfaMethod: 'none' | 'email' }>> {
    const { accounts } = this.deps;
    const account = await accounts.byEmail(claims.email);
    if (!account) return httpFail(404, 'no_account');
    if (enabled && !account.emailVerified) {
      return httpFail(400, 'email_not_verified');
    }
    if (accounts.setMfa) {
      await accounts.setMfa(account.email, {
        enabled,
        method: enabled ? 'email' : 'none',
        secretEnc: null,
        recoveryHashes: [],
      });
    }
    return ok({
      mfaEnabled: enabled,
      mfaMethod: enabled ? 'email' : 'none',
    });
  }

  /** Gera um novo segredo TOTP e QR Code para o usuário configurar no app autenticador. */
  async startMfaSetup(
    claims: SessionClaims,
  ): Promise<HttpResult<MfaSetupResponse>> {
    const { accounts, secret: keySeed } = this.deps;
    const account = await accounts.byEmail(claims.email);
    if (!account) return httpFail(404, 'no_account');

    const totpSecret = generateTotpSecret();
    const secretEnc = encryptTotpSecret(totpSecret, keySeed);
    if (accounts.setMfa) {
      await accounts.setMfa(account.email, {
        enabled: false,
        secretEnc,
        recoveryHashes: [],
      });
    }
    const otpauthUrl = buildOtpAuthUri(account.email, totpSecret);
    const qrDataUrl = await generateQrDataUrl(otpauthUrl);
    return ok({ secret: totpSecret, otpauthUrl, qrDataUrl });
  }

  /** Confirma o código do app autenticador, ativa MFA e devolve 8 códigos de recuperação. */
  async enableMfa(
    claims: SessionClaims,
    code: string,
  ): Promise<HttpResult<MfaEnableResponse>> {
    const { accounts, secret: keySeed } = this.deps;
    const account = await accounts.byEmail(claims.email);
    if (!account) return httpFail(404, 'no_account');
    if (!account.mfaSecretEnc) return httpFail(400, 'invalid_mfa_code');

    const totpSecret = decryptTotpSecret(account.mfaSecretEnc, keySeed);
    if (!totpSecret || !verifyTotpCode(totpSecret, code, this.now())) {
      return httpFail(400, 'invalid_mfa_code');
    }

    const recoveryCodes = generateRecoveryCodes(8);
    const recoveryHashes = recoveryCodes.map((c) =>
      hashRecoveryCode(c, keySeed),
    );
    if (accounts.setMfa) {
      await accounts.setMfa(account.email, {
        enabled: true,
        method: 'totp',
        secretEnc: account.mfaSecretEnc,
        recoveryHashes,
      });
    }
    return ok({ mfaEnabled: true, recoveryCodes });
  }

  /** Desativa MFA exigindo senha atual e código TOTP (ou código de recuperação). */
  async disableMfa(
    claims: SessionClaims,
    password: string,
    code: string,
  ): Promise<HttpResult<{ mfaEnabled: false }>> {
    const { accounts } = this.deps;
    const account = await accounts.byEmail(claims.email);
    if (!account) return httpFail(404, 'no_account');
    if (!(await verifyPassword(password, account.passwordHash))) {
      return httpFail(403, 'wrong_password');
    }
    if (account.mfaEnabled && account.mfaSecretEnc) {
      const mfaOk = await this.verifyAndConsumeMfa(account, code);
      if (!mfaOk) return httpFail(400, 'invalid_mfa_code');
    }
    if (accounts.setMfa) {
      await accounts.setMfa(account.email, {
        enabled: false,
        method: 'none',
        secretEnc: null,
        recoveryHashes: [],
      });
    }
    return ok({ mfaEnabled: false });
  }

  private async verifyAndConsumeMfa(
    account: LocalAccount,
    rawCode: string,
  ): Promise<boolean> {
    if (!account.mfaSecretEnc) return false;
    const totpSecret = decryptTotpSecret(
      account.mfaSecretEnc,
      this.deps.secret,
    );
    if (totpSecret && verifyTotpCode(totpSecret, rawCode, this.now())) {
      return true;
    }
    const hashes = account.mfaRecoveryHashes ?? [];
    if (hashes.length === 0) return false;
    const candidate = hashRecoveryCode(rawCode, this.deps.secret);
    const idx = hashes.indexOf(candidate);
    if (idx === -1) return false;

    const remaining = hashes.filter((_, i) => i !== idx);
    if (this.deps.accounts.setMfa) {
      await this.deps.accounts.setMfa(account.email, {
        enabled: true,
        secretEnc: account.mfaSecretEnc,
        recoveryHashes: remaining,
      });
    }
    return true;
  }

  /**
   * Muda nome, nickname, cargo e, se pedir, a senha (conferindo a atual).
   * Devolve uma sessão nova, já com o nome e o cargo novos.
   */
  async updateAccount(
    claims: SessionClaims,
    input: UpdateAccount,
    ip: string,
  ): Promise<HttpResult<Session>> {
    const { accounts, loginLimiter } = this.deps;
    const account = await accounts.byEmail(claims.email);
    if (!account) return httpFail(404, 'no_account');

    let passwordHash: string | undefined;
    if (input.newPassword) {
      const key = `password|${account.email}`;
      if (
        !(await loginLimiter.attempt(`ip|${ip}`)) ||
        !(await loginLimiter.attempt(key))
      ) {
        return httpFail(429, 'too_many_attempts');
      }
      if (!(await verifyPassword(input.currentPassword, account.passwordHash)))
        return httpFail(403, 'wrong_password');
      await loginLimiter.reset(key);
      passwordHash = await hashPassword(input.newPassword);
    }

    const changes = {
      fullName: input.fullName,
      nickname: input.nickname,
      role: input.role,
      ...(passwordHash ? { passwordHash } : {}),
      ...(input.genderIdentity !== undefined
        ? { genderIdentity: input.genderIdentity }
        : {}),
      ...(input.pronouns !== undefined ? { pronouns: input.pronouns } : {}),
      ...(input.accessibilityNeeds !== undefined
        ? { accessibilityNeeds: input.accessibilityNeeds }
        : {}),
      ...(input.accessibilityPrefs !== undefined
        ? { accessibilityPrefs: JSON.stringify(input.accessibilityPrefs) }
        : {}),
    };
    const updated = await accounts.update(account.email, changes);
    if (updated === 'not_found') return httpFail(404, 'no_account');
    if (updated !== 'ok') return httpFail(409, updated);
    return ok(this.createSession({ ...account, ...changes }));
  }

  /** Confere o token de sessão. Devolve null se for inválido, vencido, encerrado ou moderado. */
  async authenticate(token: string): Promise<SessionClaims | null> {
    const claims = verifySession(token, this.deps.secret, this.now());
    if (!claims) return null;
    if (await this.deps.revocations.isRevoked(claims.jti)) return null;
    const account = await this.deps.accounts.byEmail(claims.email);
    if (account && this.moderationBlockCode(account)) return null;
    return claims;
  }

  /** Encerra a sessão agora, mesmo que o token ainda não tenha vencido. */
  async logout(claims: SessionClaims): Promise<void> {
    const remaining = claims.exp - Math.floor(this.now() / 1000);
    if (remaining > 0)
      await this.deps.revocations.revoke(claims.jti, remaining);
  }

  /** Exporta os dados pessoais da conta do titular (LGPD Art. 18, II e V). */
  async exportData(claims: SessionClaims): Promise<
    HttpResult<{
      exportedAt: string;
      legalBasis: string;
      account: Account;
    }>
  > {
    const acc = await this.account(claims);
    if (!acc.ok) return acc;
    return ok({
      exportedAt: new Date(this.now()).toISOString(),
      legalBasis:
        'LGPD (Lei nº 13.709/2018) — Portabilidade e acesso aos dados pessoais do titular.',
      account: acc.value,
    });
  }

  /** Exclui definitivamente a conta mediante confirmação de senha (LGPD Art. 18, VI). */
  async deleteAccount(
    claims: SessionClaims,
    password: string,
  ): Promise<HttpResult<{ deleted: true }>> {
    const { accounts } = this.deps;
    const account = await accounts.byEmail(claims.email);
    if (!account) return httpFail(404, 'no_account');
    if (!(await verifyPassword(password, account.passwordHash))) {
      return httpFail(403, 'wrong_password');
    }
    if (accounts.deleteByEmail) {
      await accounts.deleteByEmail(account.email);
    }
    await this.logout(claims);
    await this.deps.onAccountDeleted?.(account.email);
    return ok({ deleted: true });
  }

  private moderationBlockCode(
    account: LocalAccount,
  ): 'account_banned' | 'account_restricted' | null {
    if (account.bannedAt) return 'account_banned';
    if (account.restrictedUntil && account.restrictedUntil > this.now()) {
      return 'account_restricted';
    }
    return null;
  }

  /** Verifica disponibilidade de nome de usuário (com rate limit). */
  async checkUsernameAvailable(
    rawUsername: string,
    currentEmail: string | undefined,
    ip: string,
  ): Promise<HttpResult<{ available: boolean }>> {
    const { accounts, loginLimiter } = this.deps;
    if (!(await loginLimiter.attempt(`username-check|${ip}`))) {
      return httpFail(429, 'too_many_attempts');
    }
    const parsed = NicknameSchema.safeParse(rawUsername);
    if (!parsed.success) return httpFail(400, 'invalid_request');
    const existing = await accounts.byNickname(parsed.data);
    const normalizedCurrent = currentEmail ? normalizeEmail(currentEmail) : '';
    return ok({
      available: !existing || existing.email === normalizedCurrent,
    });
  }

  /** Verifica elegibilidade do e-mail na 1ª etapa do cadastro. */
  async checkRegisterEmail(
    rawEmail: string,
    ip: string,
  ): Promise<HttpResult<{ eligible: boolean }>> {
    if (this.deps.allowRegistration === false) {
      return httpFail(403, 'registration_disabled');
    }
    if (!(await this.deps.loginLimiter.attempt(`register-check|${ip}`))) {
      return httpFail(429, 'too_many_attempts');
    }
    const email = normalizeEmail(rawEmail);
    if (this.deps.isEmailInvited) {
      const whitelisted =
        this.deps.adminEmails.includes(email) ||
        this.deps.access.emails.includes(email);
      const invited = whitelisted || (await this.deps.isEmailInvited(email));
      const subscriber =
        invited || ((await this.deps.isSubscriber?.(email)) ?? false);
      if (!invited && !subscriber) {
        return httpFail(403, 'invite_required');
      }
      return ok({ eligible: true });
    }
    const kind = accountKindOf(email, this.deps.access);
    const publicOpen = (await this.deps.isPublicRegistrationOpen?.()) ?? false;
    if (!kind && !publicOpen) {
      return httpFail(403, 'invite_required');
    }
    return ok({ eligible: true });
  }

  /** Provisiona conta direta para assinantes (dispensa tela de registro, vai direto ao login). */
  async provisionSubscriberAccount(input: {
    email: string;
    fullName: string;
    nickname: string;
    password: string;
    role?: string;
  }): Promise<HttpResult<Session>> {
    const email = normalizeEmail(input.email);
    const account: LocalAccount = {
      nickname: input.nickname,
      fullName: input.fullName,
      email,
      role: input.role ?? 'Assinante',
      passwordHash: await hashPassword(input.password),
      createdAt: this.now(),
      tier: 'admin',
      emailVerified: true,
      emailMarketingOptIn: false,
      uiTheme: null,
    };
    const created = await this.deps.accounts.create(account);
    if (created !== 'ok') return httpFail(409, created);
    return ok(this.createSession(account));
  }

  /** Inicia troca segura de e-mail: valida senha e envia códigos ao e-mail antigo e ao novo. */
  async startEmailChange(
    claims: SessionClaims,
    newEmailRaw: string,
    password: string,
    ip: string,
  ): Promise<
    HttpResult<{
      ok: true;
      codesRequired: boolean;
      mfaRequired: boolean;
    }>
  > {
    const { accounts, loginLimiter } = this.deps;
    if (!(await loginLimiter.attempt(`email-change|${ip}`))) {
      return httpFail(429, 'too_many_attempts');
    }
    const account = await accounts.byEmail(claims.email);
    if (!account) return httpFail(404, 'no_account');
    if (!(await verifyPassword(password, account.passwordHash))) {
      return httpFail(401, 'wrong_password');
    }
    const newEmail = normalizeEmail(newEmailRaw);
    if (newEmail === account.email) return httpFail(400, 'same_email');
    if (await accounts.byEmail(newEmail)) return httpFail(409, 'email_taken');

    const codeService = this.deps.codes ?? this.deps.verifyCodes ?? null;
    if (codeService) {
      const sentOld = await codeService.send(account.email, 'email_change_old');
      if (sentOld === 'wait') return httpFail(429, 'code_wait');
      if (sentOld === 'mail_failed') return httpFail(502, 'mail_failed');
      const sentNew = await codeService.send(newEmail, 'email_change_new');
      if (sentNew === 'wait') return httpFail(429, 'code_wait');
      if (sentNew === 'mail_failed') return httpFail(502, 'mail_failed');
    }
    return ok({
      ok: true,
      codesRequired: Boolean(codeService),
      mfaRequired: Boolean(account.mfaEnabled && account.mfaMethod === 'totp'),
    });
  }

  /** Confirma troca de e-mail com códigos (antigo + novo), MFA TOTP se ativo e desvincula MFA por e-mail. */
  async confirmEmailChange(
    claims: SessionClaims,
    input: EmailChangeConfirm,
    ip: string,
  ): Promise<HttpResult<Session>> {
    const { accounts, loginLimiter, revocations } = this.deps;
    if (!(await loginLimiter.attempt(`email-change-confirm|${ip}`))) {
      return httpFail(429, 'too_many_attempts');
    }
    const account = await accounts.byEmail(claims.email);
    if (!account) return httpFail(404, 'no_account');
    if (!(await verifyPassword(input.password, account.passwordHash))) {
      return httpFail(401, 'wrong_password');
    }
    const newEmail = normalizeEmail(input.newEmail);
    if (newEmail === account.email) return httpFail(400, 'same_email');
    if (await accounts.byEmail(newEmail)) return httpFail(409, 'email_taken');

    const codeService = this.deps.codes ?? this.deps.verifyCodes ?? null;
    if (codeService) {
      if (
        !input.oldCode ||
        !(await codeService.check(
          account.email,
          'email_change_old',
          input.oldCode,
        ))
      ) {
        return httpFail(400, 'invalid_code');
      }
      if (
        !input.newCode ||
        !(await codeService.check(newEmail, 'email_change_new', input.newCode))
      ) {
        return httpFail(400, 'invalid_code');
      }
    }

    if (account.mfaEnabled && account.mfaMethod === 'totp') {
      const mfaCode = input.mfaCode.trim();
      if (!mfaCode) return httpFail(400, 'mfa_required');
      const secret = account.mfaSecretEnc
        ? decryptTotpSecret(account.mfaSecretEnc, this.deps.secret)
        : null;
      const totpOk = Boolean(secret && verifyTotpCode(secret, mfaCode));
      const recoveryHash = hashRecoveryCode(mfaCode, this.deps.secret);
      const recoveryOk = Boolean(
        account.mfaRecoveryHashes?.includes(recoveryHash),
      );
      if (!totpOk && !recoveryOk) {
        return httpFail(401, 'invalid_mfa_code');
      }
    }

    const unlinkEmailMfa = account.mfaMethod === 'email';
    const updated = accounts.changeEmail
      ? await accounts.changeEmail(account.email, newEmail, unlinkEmailMfa)
      : 'ok';
    if (updated === 'email_taken') return httpFail(409, 'email_taken');
    if (updated === 'not_found') return httpFail(404, 'no_account');

    if (codeService) {
      await codeService.consume(account.email, 'email_change_old');
      await codeService.consume(newEmail, 'email_change_new');
    }

    const ttl = Math.max(1, claims.exp - Math.floor(this.now() / 1000));
    await revocations.revoke(claims.jti, ttl);

    return ok(
      this.createSession({
        ...account,
        email: newEmail,
        emailVerified: true,
        ...(unlinkEmailMfa ? { mfaEnabled: false, mfaMethod: 'none' } : {}),
      }),
    );
  }

  private resolveTier(account: LocalAccount): AccountTier {
    if (account.email === this.deps.adminEmails[0]) return 'master';
    if (account.tier && account.tier !== 'tester') return account.tier;
    if (this.deps.adminEmails.includes(account.email)) return 'admin';
    return account.tier ?? 'tester';
  }

  private resolveSecondaryTiers(
    account: LocalAccount,
    primary: AccountTier,
  ): AccountTier[] {
    const seen = new Set<AccountTier>([primary, 'master']);
    const result: AccountTier[] = [];
    for (const item of account.secondaryTiers ?? []) {
      if (!seen.has(item)) {
        seen.add(item);
        result.push(item);
      }
    }
    return result;
  }

  private createSession(account: LocalAccount): Session {
    // O tipo vem da lista de acesso. Cargos atribuídos no painel também liberam acesso admin.
    const kind =
      accountKindOf(account.email, this.deps.access) ?? 'third_party';
    const tier = this.resolveTier(account);
    const secondaryTiers = this.resolveSecondaryTiers(account, tier);
    const effective = effectiveTiersOf(tier, secondaryTiers);
    const admin =
      tier === 'master' ||
      (kind === 'company' &&
        (canManageServer(effective) ||
          this.deps.adminEmails.includes(account.email)));
    const user = {
      email: account.email,
      name: account.fullName,
      admin,
      kind,
      tier,
      secondaryTiers,
      nickname: account.nickname,
      role: account.role,
    };
    const token = signSession(
      user,
      this.deps.secret,
      SESSION_TTL_SECONDS,
      this.now(),
    );
    return { token, user };
  }
}
