import {
  DeleteAccountSchema,
  EmailPreferencesSchema,
  LoginSchema,
  MfaDisableSchema,
  MfaEmailToggleSchema,
  MfaEnableSchema,
  RegisterSchema,
  RequestCodeSchema,
  ResetPasswordSchema,
  UiThemeSchema,
  UpdateAccountSchema,
  VerifyEmailSchema,
} from '../../shared/domain/index.js';
import type { HttpResult } from '../../shared/result.js';
import type { AuthService } from './auth.service.js';

export type ApiRequest = {
  method: string;
  path: string;
  /** Valor do cabeçalho Authorization. */
  authorization: string | undefined;
  /** Corpo já lido do JSON (ou undefined). */
  body: unknown;
  ip: string;
};

export type ApiResponse = { status: number; body: unknown };

const json = (status: number, body: unknown): ApiResponse => ({ status, body });
const error = (status: number, code: string): ApiResponse =>
  json(status, { error: code });

const respond = <T>(
  result: HttpResult<T>,
  success: (value: T) => ApiResponse,
): ApiResponse =>
  result.ok ? success(result.value) : error(result.status, result.error);

const bearer = (authorization: string | undefined): string | null => {
  const match = /^Bearer (\S+)$/.exec(authorization ?? '');
  return match?.[1] ?? null;
};

/** Rotas HTTP de autenticação. Sem acesso à rede: recebe e devolve dados simples. */
export const handleAuthRoutes = async (
  service: AuthService,
  req: ApiRequest,
): Promise<ApiResponse> => {
  const { method, path, body, ip } = req;

  switch (path) {
    case '/api/auth/options': {
      if (method !== 'GET') return error(405, 'method_not_allowed');
      return json(200, service.options());
    }

    case '/api/auth/register': {
      if (method !== 'POST') return error(405, 'method_not_allowed');
      const parsed = RegisterSchema.safeParse(body);
      if (!parsed.success) return error(400, 'invalid_request');
      return respond(await service.register(parsed.data, ip), (s) =>
        json(201, s),
      );
    }

    case '/api/auth/code': {
      if (method !== 'POST') return error(405, 'method_not_allowed');
      const parsed = RequestCodeSchema.safeParse(body);
      if (!parsed.success) return error(400, 'invalid_request');
      return respond(await service.requestCode(parsed.data, ip), () =>
        json(202, { ok: true }),
      );
    }

    case '/api/auth/reset': {
      if (method !== 'POST') return error(405, 'method_not_allowed');
      const parsed = ResetPasswordSchema.safeParse(body);
      if (!parsed.success) return error(400, 'invalid_request');
      return respond(await service.resetPassword(parsed.data, ip), (s) =>
        json(200, s),
      );
    }

    case '/api/auth/login': {
      if (method !== 'POST') return error(405, 'method_not_allowed');
      const parsed = LoginSchema.safeParse(body);
      if (!parsed.success) return error(400, 'invalid_request');
      const { login, password, mfaCode } = parsed.data;
      return respond(await service.login(login, password, ip, mfaCode), (s) =>
        json(200, s),
      );
    }

    case '/api/auth/account': {
      const token = bearer(req.authorization);
      const claims = token ? await service.authenticate(token) : null;
      if (method === 'GET') {
        if (!claims) return error(401, 'unauthorized');
        return respond(await service.account(claims), (a) => json(200, a));
      }
      if (method === 'PUT') {
        if (!claims) return error(401, 'unauthorized');
        const parsed = UpdateAccountSchema.safeParse(body);
        if (!parsed.success) return error(400, 'invalid_request');
        return respond(
          await service.updateAccount(claims, parsed.data, ip),
          (s) => json(200, s),
        );
      }
      if (method === 'DELETE') {
        if (!claims) return error(401, 'unauthorized');
        const parsed = DeleteAccountSchema.safeParse(body);
        if (!parsed.success) return error(400, 'invalid_request');
        return respond(
          await service.deleteAccount(claims, parsed.data.password),
          (v) => json(200, v),
        );
      }
      return error(405, 'method_not_allowed');
    }

    case '/api/auth/export': {
      if (method !== 'GET') return error(405, 'method_not_allowed');
      const token = bearer(req.authorization);
      const claims = token ? await service.authenticate(token) : null;
      if (!claims) return error(401, 'unauthorized');
      return respond(await service.exportData(claims), (v) => json(200, v));
    }

    case '/api/auth/verify/start': {
      if (method !== 'POST') return error(405, 'method_not_allowed');
      const token = bearer(req.authorization);
      const claims = token ? await service.authenticate(token) : null;
      if (!claims) return error(401, 'unauthorized');
      return respond(await service.requestVerifyCode(claims, ip), () =>
        json(202, { ok: true }),
      );
    }

    case '/api/auth/verify/confirm': {
      if (method !== 'POST') return error(405, 'method_not_allowed');
      const token = bearer(req.authorization);
      const claims = token ? await service.authenticate(token) : null;
      if (!claims) return error(401, 'unauthorized');
      const parsed = VerifyEmailSchema.safeParse(body);
      if (!parsed.success) return error(400, 'invalid_request');
      return respond(
        await service.confirmVerifyEmail(claims, parsed.data.code, ip),
        (v) => json(200, v),
      );
    }

    case '/api/auth/theme': {
      if (method !== 'PUT') return error(405, 'method_not_allowed');
      const token = bearer(req.authorization);
      const claims = token ? await service.authenticate(token) : null;
      if (!claims) return error(401, 'unauthorized');
      const parsed = UiThemeSchema.safeParse(body);
      if (!parsed.success) return error(400, 'invalid_request');
      return respond(await service.updateTheme(claims, parsed.data), (v) =>
        json(200, v),
      );
    }

    case '/api/auth/email-preferences': {
      if (method !== 'PUT') return error(405, 'method_not_allowed');
      const token = bearer(req.authorization);
      const claims = token ? await service.authenticate(token) : null;
      if (!claims) return error(401, 'unauthorized');
      const parsed = EmailPreferencesSchema.safeParse(body);
      if (!parsed.success) return error(400, 'invalid_request');
      return respond(
        await service.updateEmailPreferences(
          claims,
          parsed.data.marketingOptIn,
        ),
        (v) => json(200, v),
      );
    }

    case '/api/auth/mfa/email': {
      if (method !== 'POST') return error(405, 'method_not_allowed');
      const token = bearer(req.authorization);
      const claims = token ? await service.authenticate(token) : null;
      if (!claims) return error(401, 'unauthorized');
      const parsed = MfaEmailToggleSchema.safeParse(body);
      if (!parsed.success) return error(400, 'invalid_request');
      return respond(
        await service.setEmailMfa(claims, parsed.data.enabled),
        (v) => json(200, v),
      );
    }

    case '/api/auth/mfa/setup': {
      if (method !== 'POST') return error(405, 'method_not_allowed');
      const token = bearer(req.authorization);
      const claims = token ? await service.authenticate(token) : null;
      if (!claims) return error(401, 'unauthorized');
      return respond(await service.startMfaSetup(claims), (v) => json(200, v));
    }

    case '/api/auth/mfa/enable': {
      if (method !== 'POST') return error(405, 'method_not_allowed');
      const token = bearer(req.authorization);
      const claims = token ? await service.authenticate(token) : null;
      if (!claims) return error(401, 'unauthorized');
      const parsed = MfaEnableSchema.safeParse(body);
      if (!parsed.success) return error(400, 'invalid_request');
      return respond(await service.enableMfa(claims, parsed.data.code), (v) =>
        json(200, v),
      );
    }

    case '/api/auth/mfa/disable': {
      if (method !== 'POST') return error(405, 'method_not_allowed');
      const token = bearer(req.authorization);
      const claims = token ? await service.authenticate(token) : null;
      if (!claims) return error(401, 'unauthorized');
      const parsed = MfaDisableSchema.safeParse(body);
      if (!parsed.success) return error(400, 'invalid_request');
      return respond(
        await service.disableMfa(
          claims,
          parsed.data.password,
          parsed.data.code,
        ),
        (v) => json(200, v),
      );
    }

    case '/api/auth/logout': {
      if (method !== 'POST') return error(405, 'method_not_allowed');
      const token = bearer(req.authorization);
      const claims = token ? await service.authenticate(token) : null;
      if (!claims) return error(401, 'unauthorized');
      await service.logout(claims);
      return json(200, { ok: true });
    }

    default:
      return error(404, 'not_found');
  }
};
