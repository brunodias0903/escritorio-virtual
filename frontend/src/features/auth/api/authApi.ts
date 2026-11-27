import {
  AccountSchema,
  ApiErrorSchema,
  AuthOptionsSchema,
  MfaEnableResponseSchema,
  MfaSetupResponseSchema,
  SessionSchema,
  type Account,
  type AuthOptions,
  type EmailChangeConfirm,
  type EmailChangeStart,
  type Login,
  type Register,
  type RequestCode,
  type ResetPassword,
  type Session,
  type UiTheme,
  type UpdateAccount,
} from '@/shared/domain';
import { z } from 'zod';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

type Options = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
};

const OkSchema = z.object({ ok: z.literal(true) });
const VerifyConfirmSchema = z.object({ emailVerified: z.literal(true) });
const EmailPrefsResultSchema = z.object({ emailMarketingOptIn: z.boolean() });

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

    /** Envia código de 6 números para verificar o e-mail da conta já logada. */
    startVerifyEmail: (token: string) =>
      call('/api/auth/verify/start', OkSchema, { token }),

    /** Confirma o código de 6 números e marca o e-mail como verificado. */
    confirmVerifyEmail: (token: string, code: string) =>
      call('/api/auth/verify/confirm', VerifyConfirmSchema, {
        body: { code },
        token,
      }),

    /** Salva a preferência de tema/cores na conta do usuário. */
    updateTheme: (token: string, theme: UiTheme) =>
      call('/api/auth/theme', OkSchema, {
        method: 'PUT',
        body: theme,
        token,
      }),

    /** Salva preferência de notificações por e-mail (novidades/patch notes vs só importantes). */
    updateEmailPreferences: (token: string, marketingOptIn: boolean) =>
      call('/api/auth/email-preferences', EmailPrefsResultSchema, {
        method: 'PUT',
        body: { marketingOptIn },
        token,
      }),

    /** Ativa ou desativa o 2FA por código enviado via e-mail. */
    setEmailMfa: (token: string, enabled: boolean) =>
      call(
        '/api/auth/mfa/email',
        z.object({
          mfaEnabled: z.boolean(),
          mfaMethod: z.enum(['none', 'email']),
        }),
        { body: { enabled }, token },
      ),

    /** Inicia configuração de MFA (TOTP): devolve segredo e QR Code offline. */
    setupMfa: (token: string) =>
      call('/api/auth/mfa/setup', MfaSetupResponseSchema, { token }),

    /** Confirma o código de 6 dígitos do app autenticador, ativa MFA e devolve códigos de recuperação. */
    enableMfa: (token: string, code: string) =>
      call('/api/auth/mfa/enable', MfaEnableResponseSchema, {
        body: { code },
        token,
      }),

    /** Desativa MFA exigindo senha atual e código do autenticador (ou recuperação). */
    disableMfa: (token: string, password: string, code: string) =>
      call(
        '/api/auth/mfa/disable',
        z.object({ mfaEnabled: z.literal(false) }),
        {
          body: { password, code },
          token,
        },
      ),

    /** Exporta os dados pessoais da conta do titular (LGPD Art. 18, II e V). */
    exportData: (token: string) =>
      call(
        '/api/auth/export',
        z.object({
          exportedAt: z.string(),
          legalBasis: z.string(),
          account: AccountSchema,
        }),
        { method: 'GET', token },
      ),

    /** Exclui definitivamente a conta mediante confirmação de senha (LGPD Art. 18, VI). */
    deleteAccount: (token: string, password: string) =>
      call('/api/auth/account', z.object({ deleted: z.literal(true) }), {
        method: 'DELETE',
        body: { password },
        token,
      }),

    /** Verifica se um nome de usuário está disponível em tempo real. */
    checkUsernameAvailable: (username: string, token?: string) =>
      call(
        `/api/auth/username-available?username=${encodeURIComponent(username)}`,
        z.object({ available: z.boolean() }),
        { method: 'GET', ...(token ? { token } : {}) },
      ),

    /** Verifica na 1ª etapa do cadastro se o e-mail possui convite ou acesso liberado. */
    checkRegisterEmail: (email: string) =>
      call('/api/auth/register/check', z.object({ eligible: z.boolean() }), {
        body: { email },
      }),

    /** Inicia troca segura de e-mail enviando códigos ao e-mail atual e ao novo. */
    startEmailChange: (token: string, input: EmailChangeStart) =>
      call(
        '/api/auth/email-change/start',
        z.object({
          ok: z.literal(true),
          codesRequired: z.boolean(),
          mfaRequired: z.boolean(),
        }),
        { body: input, token },
      ),

    /** Confirma troca segura de e-mail com códigos e MFA (TOTP) se ativo. */
    confirmEmailChange: (
      token: string,
      input: EmailChangeConfirm,
    ): Promise<ApiResult<Session>> =>
      call('/api/auth/email-change/confirm', SessionSchema, {
        body: input,
        token,
      }),

    /** Encerra a sessão no servidor: o mesmo token deixa de valer. */
    logout: (token: string) => call('/api/auth/logout', OkSchema, { token }),
  };
};
export type AuthApi = ReturnType<typeof createAuthApi>;
