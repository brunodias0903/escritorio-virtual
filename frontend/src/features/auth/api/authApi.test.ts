import { describe, expect, it } from 'vitest';
import { createAuthApi } from './authApi';

const session = {
  token: 't',
  user: {
    email: 'a@empresa.com',
    name: 'Ana',
    admin: false,
    kind: 'company',
    tier: 'tester',
    nickname: 'ana',
    role: '',
  },
};

type Call = { url: string; init: RequestInit };

const fakeFetch = (status: number, body: unknown) => {
  const calls: Call[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => {
        if (body === 'not-json') throw new Error('json');
        return body;
      },
    } as Response;
  }) as unknown as typeof fetch;
  return {
    api: createAuthApi({ baseUrl: 'http://x', fetchImpl: impl }),
    calls,
  };
};

describe('authApi', () => {
  it('lê do servidor se o código por e-mail está ligado', async () => {
    const { api, calls } = fakeFetch(200, { emailCodes: false, domains: [] });
    expect(await api.options()).toEqual({
      ok: true,
      data: { emailCodes: false, domains: [] },
    });
    expect(calls[0]?.url).toBe('http://x/api/auth/options');
    expect(calls[0]?.init.method).toBe('GET');
  });

  it('cadastro envia os dados e devolve a sessão', async () => {
    const { api, calls } = fakeFetch(201, session);
    const input = {
      fullName: 'Ana Souza',
      nickname: 'anas',
      email: 'ana@empresa.com',
      code: '123456',
      role: '',
      password: 'senha-segura-123',
    };
    expect(await api.register(input)).toEqual({ ok: true, data: session });
    expect(calls[0]?.url).toBe('http://x/api/auth/register');
    expect(calls[0]?.init.method).toBe('POST');
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual(input);
  });

  it('login envia o nickname (ou e-mail) e a senha', async () => {
    const { api, calls } = fakeFetch(200, session);
    expect(await api.login({ login: 'anas', password: 'x' })).toEqual({
      ok: true,
      data: session,
    });
    expect(calls[0]?.url).toBe('http://x/api/auth/login');
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      login: 'anas',
      password: 'x',
    });
  });

  it('devolve o código de erro do servidor', async () => {
    const { api } = fakeFetch(401, { error: 'invalid_login' });
    expect(await api.login({ login: 'anas', password: 'x' })).toEqual({
      ok: false,
      error: 'invalid_login',
    });
  });

  it('trata falha de rede, resposta sem JSON e formato inesperado', async () => {
    const input = { login: 'anas', password: 'x' };
    const failing = createAuthApi({
      baseUrl: 'http://x',
      fetchImpl: (async () => {
        throw new Error('offline');
      }) as unknown as typeof fetch,
    });
    expect(await failing.login(input)).toEqual({
      ok: false,
      error: 'network',
    });
    for (const [status, body] of [
      [500, 'not-json'],
      [500, { x: 1 }],
      [200, { x: 1 }],
    ] as const) {
      expect(await fakeFetch(status, body).api.login(input)).toEqual({
        ok: false,
        error: 'server_error',
      });
    }
  });

  it('pede o código e troca a senha esquecida', async () => {
    const code = fakeFetch(202, { ok: true });
    expect(
      await code.api.requestCode({
        email: 'ana@parceiro.com',
        purpose: 'reset',
      }),
    ).toEqual({ ok: true, data: { ok: true } });
    expect(code.calls[0]?.url).toBe('http://x/api/auth/code');
    const reset = fakeFetch(200, session);
    const input = {
      email: 'ana@parceiro.com',
      code: '123456',
      password: 'nova-senha-123',
    };
    expect(await reset.api.resetPassword(input)).toEqual({
      ok: true,
      data: session,
    });
    expect(reset.calls[0]?.url).toBe('http://x/api/auth/reset');
    expect(JSON.parse(reset.calls[0]!.init.body as string)).toEqual(input);
  });

  it('lê e muda a conta com o token', async () => {
    const account = {
      fullName: 'Ana Souza',
      nickname: 'anas',
      email: 'ana@empresa.com',
      role: 'Dev',
      tier: 'tester' as const,
      emailVerified: false,
      mfaEnabled: false,
    };
    const read = fakeFetch(200, account);
    expect(await read.api.account('tok')).toEqual({ ok: true, data: account });
    expect(read.calls[0]?.init.method).toBe('GET');
    expect(read.calls[0]?.url).toBe('http://x/api/auth/account');

    const write = fakeFetch(200, session);
    const input = {
      fullName: 'Ana Souza',
      nickname: 'anas',
      role: 'Tech Lead',
      currentPassword: '',
      newPassword: '',
    };
    expect(await write.api.updateAccount('tok', input)).toEqual({
      ok: true,
      data: session,
    });
    expect(write.calls[0]?.init.method).toBe('PUT');
    expect(JSON.parse(write.calls[0]!.init.body as string)).toEqual(input);
  });

  it('encerra a sessão no servidor com o token', async () => {
    const { api, calls } = fakeFetch(200, { ok: true });
    expect(await api.logout('tok')).toEqual({ ok: true, data: { ok: true } });
    expect(calls[0]?.url).toBe('http://x/api/auth/logout');
    expect(calls[0]?.init.method).toBe('POST');
    expect(calls[0]?.init.body).toBeUndefined();
    expect(calls[0]?.init.headers).toMatchObject({
      Authorization: 'Bearer tok',
    });
  });
});
