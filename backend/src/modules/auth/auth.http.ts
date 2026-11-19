import {
  LoginSchema,
  RegisterSchema,
  RequestCodeSchema,
  ResetPasswordSchema,
  UpdateAccountSchema,
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
      const { login, password } = parsed.data;
      return respond(await service.login(login, password, ip), (s) =>
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
      return error(405, 'method_not_allowed');
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
