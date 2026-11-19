import {
  AccountSchema,
  ApiErrorSchema,
  AuthOptionsSchema,
  SessionSchema,
  type Account,
  type AuthOptions,
  type Login,
  type Register,
  type RequestCode,
  type ResetPassword,
  type Session,
  type UpdateAccount,
} from '@/shared/domain';
import { z } from 'zod';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

type Options = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
};

const OkSchema = z.object({ ok: z.literal(true) });

/** Cliente da API de autenticação. Devolve sempre um resultado, nunca lança. */
export const createAuthApi = ({ baseUrl, fetchImpl = fetch }: Options) => {
  const call = async <T>(
    path: string,
    schema: z.ZodType<T>,
    {
      method = 'POST',
      body,
      token,
    }: { method?: string; body?: unknown; token?: string },
  ): Promise<ApiResult<T>> => {
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: {
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      return { ok: false, error: 'network' };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { ok: false, error: 'server_error' };
    }

    if (!response.ok) {
      const parsed = ApiErrorSchema.safeParse(data);
      return {
        ok: false,
        error: parsed.success ? parsed.data.error : 'server_error',
      };
    }
    const parsed = schema.safeParse(data);
    return parsed.success
      ? { ok: true, data: parsed.data }
      : { ok: false, error: 'server_error' };
  };

  return {
    /** O que o servidor liga ou desliga (ex.: código por e-mail). */
    options: (): Promise<ApiResult<AuthOptions>> =>
      call('/api/auth/options', AuthOptionsSchema, { method: 'GET' }),

    /** Cria a conta (nickname e senha) e já entra com ela. */
    register: (input: Register): Promise<ApiResult<Session>> =>
      call('/api/auth/register', SessionSchema, { body: input }),

    /** Entra com o nickname ou o e-mail, e a senha. */
    login: (input: Login): Promise<ApiResult<Session>> =>
      call('/api/auth/login', SessionSchema, { body: input }),

    /** Manda o código de 6 números para o e-mail (criar conta ou esqueci a senha). */
    requestCode: (input: RequestCode) =>
      call('/api/auth/code', OkSchema, { body: input }),

    /** Esqueci a senha: troca com o código do e-mail e já entra. */
    resetPassword: (input: ResetPassword): Promise<ApiResult<Session>> =>
      call('/api/auth/reset', SessionSchema, { body: input }),

    /** Os dados da conta de quem está logado. */
    account: (token: string): Promise<ApiResult<Account>> =>
      call('/api/auth/account', AccountSchema, { method: 'GET', token }),

    /** Muda nome, nickname, cargo e (com a senha atual) a senha. Devolve a sessão nova. */
    updateAccount: (
      token: string,
      input: UpdateAccount,
    ): Promise<ApiResult<Session>> =>
      call('/api/auth/account', SessionSchema, {
        method: 'PUT',
        body: input,
        token,
      }),

    /** Encerra a sessão no servidor: o mesmo token deixa de valer. */
    logout: (token: string) => call('/api/auth/logout', OkSchema, { token }),
  };
};
export type AuthApi = ReturnType<typeof createAuthApi>;
