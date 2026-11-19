import {
  accountKindOf,
  normalizeEmail,
  type Account,
  type AccountAccess,
  type AuthOptions,
  type Register,
  type RequestCode,
  type ResetPassword,
  type Session,
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
      if (!accountKindOf(email, this.deps.access)) {
        return httpFail(403, 'email_not_allowed');
      }
      if (await accounts.byEmail(email)) return httpFail(409, 'email_taken');
    }
    if (input.purpose === 'reset' && !(await accounts.byEmail(email))) {
      return ok(null);
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
    const { accounts, loginLimiter, codes } = this.deps;
    if (!(await loginLimiter.attempt(`register|${ip}`))) {
      return httpFail(429, 'too_many_attempts');
    }
    const email = normalizeEmail(input.email);
    if (!accountKindOf(email, this.deps.access)) {
      return httpFail(403, 'email_not_allowed');
    }
    if (
      codes &&
      !(input.code && (await codes.check(email, 'register', input.code)))
    ) {
      return httpFail(400, 'invalid_code');
    }

    const account: LocalAccount = {
      nickname: input.nickname,
      fullName: input.fullName,
      email,
      role: input.role,
      passwordHash: await hashPassword(input.password),
      createdAt: this.now(),
    };
    const created = await accounts.create(account);
    if (created !== 'ok') return httpFail(409, created);
    await codes?.consume(email, 'register');
    return ok(this.createSession(account));
  }

  /** Entra com o nickname ou o e-mail, e a senha. */
  async login(
    rawLogin: string,
    password: string,
    ip: string,
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

    await loginLimiter.reset(key);
    return ok(this.createSession(account));
  }

  /** Os dados da conta de quem está logado, para a tela de edição. */
  async account(claims: SessionClaims): Promise<HttpResult<Account>> {
    const account = await this.deps.accounts.byEmail(claims.email);
    if (!account) return httpFail(404, 'no_account');
    const { fullName, nickname, email, role } = account;
    return ok({ fullName, nickname, email, role });
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
    };
    const updated = await accounts.update(account.email, changes);
    if (updated === 'not_found') return httpFail(404, 'no_account');
    if (updated !== 'ok') return httpFail(409, updated);
    return ok(this.createSession({ ...account, ...changes }));
  }

  /** Confere o token de sessão. Devolve null se for inválido, vencido ou encerrado. */
  async authenticate(token: string): Promise<SessionClaims | null> {
    const claims = verifySession(token, this.deps.secret, this.now());
    if (!claims) return null;
    return (await this.deps.revocations.isRevoked(claims.jti)) ? null : claims;
  }

  /** Encerra a sessão agora, mesmo que o token ainda não tenha vencido. */
  async logout(claims: SessionClaims): Promise<void> {
    const remaining = claims.exp - Math.floor(this.now() / 1000);
    if (remaining > 0)
      await this.deps.revocations.revoke(claims.jti, remaining);
  }

  private createSession(account: LocalAccount): Session {
    // O tipo vem da lista de acesso. Só o time da casa pode ser administrador.
    const kind =
      accountKindOf(account.email, this.deps.access) ?? 'third_party';
    const admin =
      kind === 'company' && this.deps.adminEmails.includes(account.email);
    const user = {
      email: account.email,
      name: account.fullName,
      admin,
      kind,
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
