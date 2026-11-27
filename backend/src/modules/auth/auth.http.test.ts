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
import type { Mail } from './mailer.js';

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres';
const TEST_ACCESS = parseAccountAccess('empresa.com,parceiro.com:externo', '');
const inbox = new WeakMap<AuthService, Mail[]>();

const newService = () => {
  const mails: Mail[] = [];
  const service = new AuthService({
    accounts: new MemoryLocalAccountRepository(),
    secret: SECRET,
    adminEmails: [],
    access: TEST_ACCESS,
    loginLimiter: new MemoryRateLimiter(50, 60_000),
    revocations: new MemoryRevocations(),
    codes: new CodeService({
      codes: new MemoryEmailCodeRepository(),
      mailer: { send: async (mail) => void mails.push(mail) },
      secret: SECRET,
    }),
  });
  inbox.set(service, mails);
  return service;
};

/** O último código mandado para o e-mail. */
const lastCode = (service: AuthService, email: string) =>
  /(\d{6})/.exec(
    [...(inbox.get(service) ?? [])].reverse().find((m) => m.to === email)
      ?.text ?? '',
  )?.[1] ?? '000000';

const call = async (
  service: AuthService,
  method: string,
  path: string,
  body?: unknown,
  authorization?: string,
) => {
  const send = (p: string, b: unknown) => {
    const parsedUrl = new URL(p, 'http://localhost');
    return handleAuthRoutes(service, {
      method,
      path: parsedUrl.pathname,
      query: parsedUrl.searchParams,
      body: b,
      authorization,
      ip: '1.1.1.1',
    });
  };
  // Cadastro sem código: pede um e usa o que "chegou" no e-mail.
  const fields = body as { email?: string; code?: string } | undefined;
  if (path === '/api/auth/register' && fields?.email && !fields.code) {
    await send('/api/auth/code', { email: fields.email, purpose: 'register' });
    const email = fields.email.trim().toLowerCase();
    return send(path, { ...fields, code: lastCode(service, email) });
  }
  return send(path, body);
};

const register = {
  fullName: 'Ana Souza',
  nickname: 'anas',
  email: 'ana@parceiro.com',
  password: 'senha-segura-123',
};

describe('códigos e esqueci a senha', () => {
  it('pede o código (202), troca a senha com ele (200) e recusa rota com método errado', async () => {
    const service = newService();
    await call(service, 'POST', '/api/auth/register', register);
    expect(
      await call(service, 'POST', '/api/auth/code', {
        email: 'ana@parceiro.com',
        purpose: 'reset',
      }),
    ).toEqual({ status: 202, body: { ok: true } });
    const reset = await call(service, 'POST', '/api/auth/reset', {
      email: 'ana@parceiro.com',
      code: lastCode(service, 'ana@parceiro.com'),
      password: 'nova-senha-123',
    });
    expect(reset).toMatchObject({
      status: 200,
      body: { user: { nickname: 'anas' } },
    });
    for (const path of ['/api/auth/code', '/api/auth/reset']) {
      expect((await call(service, 'GET', path)).status).toBe(405);
      expect((await call(service, 'POST', path, {})).status).toBe(400);
    }
    expect(
      (
        await call(service, 'POST', '/api/auth/code', {
          email: 'ana@gmail.com',
          purpose: 'register',
        })
      ).status,
    ).toBe(403);
  });
});

describe('códigos desligados (padrão)', () => {
  const offService = () =>
    new AuthService({
      accounts: new MemoryLocalAccountRepository(),
      secret: SECRET,
      adminEmails: [],
      access: TEST_ACCESS,
      loginLimiter: new MemoryRateLimiter(50, 60_000),
      revocations: new MemoryRevocations(),
      codes: null,
    });
  const post = (service: AuthService, path: string, body: unknown) =>
    handleAuthRoutes(service, {
      method: 'POST',
      path,
      body,
      authorization: undefined,
      ip: '1.1.1.1',
    });

  it('cadastra sem código e fecha as rotas de código', async () => {
    const service = offService();
    expect(
      await handleAuthRoutes(service, {
        method: 'GET',
        path: '/api/auth/options',
        body: undefined,
        authorization: undefined,
        ip: '1.1.1.1',
      }),
    ).toEqual({
      status: 200,
      body: { emailCodes: false, domains: ['empresa.com', 'parceiro.com'] },
    });
    expect(
      (
        await handleAuthRoutes(service, {
          method: 'POST',
          path: '/api/auth/options',
          body: undefined,
          authorization: undefined,
          ip: '1.1.1.1',
        })
      ).status,
    ).toBe(405);
    expect(await post(service, '/api/auth/register', register)).toMatchObject({
      status: 201,
      body: { user: { nickname: 'anas' } },
    });
    expect(
      await post(service, '/api/auth/code', {
        email: 'ana@parceiro.com',
        purpose: 'reset',
      }),
    ).toEqual({ status: 404, body: { error: 'not_found' } });
    expect(
      await post(service, '/api/auth/reset', {
        email: 'ana@parceiro.com',
        code: '123456',
        password: 'nova-senha-123',
      }),
    ).toEqual({ status: 404, body: { error: 'not_found' } });
  });

  it('com os códigos ligados, cadastro sem código é recusado', async () => {
    const service = newService();
    expect(service.options()).toEqual({
      emailCodes: true,
      domains: ['empresa.com', 'parceiro.com'],
    });
    expect(await post(service, '/api/auth/register', register)).toEqual({
      status: 400,
      body: { error: 'invalid_code' },
    });
  });
});

describe('handleAuthRoutes', () => {
  it('cadastra (201) e entra pelo nickname ou pelo e-mail (200)', async () => {
    const service = newService();
    const created = await call(service, 'POST', '/api/auth/register', register);
    expect(created).toMatchObject({
      status: 201,
      body: {
        user: { name: 'Ana Souza', nickname: 'anas', kind: 'third_party' },
      },
    });
    for (const login of ['anas', 'ana@parceiro.com']) {
      expect(
        await call(service, 'POST', '/api/auth/login', {
          login,
          password: 'senha-segura-123',
        }),
      ).toMatchObject({ status: 200, body: { user: { nickname: 'anas' } } });
    }
  });

  it('recusa nome sem sobrenome, nickname e senha inválidos (400) e e-mail fora da lista (403)', async () => {
    const service = newService();
    for (const body of [
      { ...register, fullName: 'Ana' },
      { ...register, nickname: 'a b' },
      { ...register, password: 'curta' },
      undefined,
    ]) {
      expect(await call(service, 'POST', '/api/auth/register', body)).toEqual({
        status: 400,
        body: { error: 'invalid_request' },
      });
    }
    for (const email of ['ana@gmail.com', 'ana@evilparceiro.com']) {
      expect(
        await call(service, 'POST', '/api/auth/register', {
          ...register,
          email,
        }),
      ).toEqual({ status: 403, body: { error: 'email_not_allowed' } });
    }
    expect(
      (await call(service, 'POST', '/api/auth/login', { login: '' })).status,
    ).toBe(400);
  });

  it('nickname repetido: 409; senha errada: 401', async () => {
    const service = newService();
    await call(service, 'POST', '/api/auth/register', register);
    expect(
      await call(service, 'POST', '/api/auth/register', {
        ...register,
        email: 'outra@empresa.com',
      }),
    ).toEqual({ status: 409, body: { error: 'nickname_taken' } });
    expect(
      await call(service, 'POST', '/api/auth/login', {
        login: 'anas',
        password: 'errada-errada',
      }),
    ).toEqual({ status: 401, body: { error: 'invalid_login' } });
  });

  it('confere o método e devolve 404 para rotas desconhecidas', async () => {
    const service = newService();
    for (const path of [
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/logout',
    ]) {
      expect((await call(service, 'GET', path)).status).toBe(405);
    }
    expect(await call(service, 'GET', '/api/nada')).toEqual({
      status: 404,
      body: { error: 'not_found' },
    });
    for (const path of ['/api/auth/google', '/api/auth/request-account']) {
      expect((await call(service, 'POST', path, {})).status).toBe(404);
    }
  });
});

describe('conta logada', () => {
  it('lê (GET) e muda (PUT) os dados da conta', async () => {
    const service = newService();
    const created = await call(service, 'POST', '/api/auth/register', register);
    const bearer = `Bearer ${(created.body as { token: string }).token}`;
    expect(
      await call(service, 'GET', '/api/auth/account', undefined, bearer),
    ).toMatchObject({ status: 200, body: { nickname: 'anas', role: '' } });
    const put = await call(
      service,
      'PUT',
      '/api/auth/account',
      { fullName: 'Ana Souza', nickname: 'anas', role: 'Analista' },
      bearer,
    );
    expect(put).toMatchObject({
      status: 200,
      body: { user: { role: 'Analista' } },
    });
  });

  it('exige sessão, corpo válido e método certo', async () => {
    const service = newService();
    expect((await call(service, 'GET', '/api/auth/account')).status).toBe(401);
    expect((await call(service, 'PUT', '/api/auth/account', {})).status).toBe(
      401,
    );
    expect((await call(service, 'POST', '/api/auth/account')).status).toBe(405);
    const created = await call(service, 'POST', '/api/auth/register', register);
    const bearer = `Bearer ${(created.body as { token: string }).token}`;
    expect(
      (
        await call(
          service,
          'PUT',
          '/api/auth/account',
          { fullName: 'Ana' },
          bearer,
        )
      ).status,
    ).toBe(400);
  });
});

describe('logout', () => {
  it('encerra a sessão: o mesmo token deixa de valer', async () => {
    const service = newService();
    const created = await call(service, 'POST', '/api/auth/register', register);
    const bearer = `Bearer ${(created.body as { token: string }).token}`;

    expect(
      await call(service, 'POST', '/api/auth/logout', undefined, bearer),
    ).toEqual({ status: 200, body: { ok: true } });
    expect(
      (await call(service, 'POST', '/api/auth/logout', undefined, bearer))
        .status,
    ).toBe(401);
  });

  it('exige sessão', async () => {
    const service = newService();
    expect((await call(service, 'POST', '/api/auth/logout')).status).toBe(401);
    expect(
      (
        await call(
          service,
          'POST',
          '/api/auth/logout',
          undefined,
          'Bearer invalido',
        )
      ).status,
    ).toBe(401);
  });

  it('cobre username-available, register/check e email-change via HTTP', async () => {
    const service = newService();
    const created = await call(service, 'POST', '/api/auth/register', register);
    const bearer = `Bearer ${(created.body as { token: string }).token}`;

    expect(
      await call(service, 'GET', '/api/auth/username-available?username=anas'),
    ).toEqual({ status: 200, body: { available: false } });
    expect(
      await call(
        service,
        'GET',
        '/api/auth/username-available?username=anas',
        undefined,
        bearer,
      ),
    ).toEqual({ status: 200, body: { available: true } });
    expect(
      (await call(service, 'POST', '/api/auth/username-available')).status,
    ).toBe(405);

    expect(
      await call(service, 'POST', '/api/auth/register/check', {
        email: 'alguem@empresa.com',
      }),
    ).toEqual({ status: 200, body: { eligible: true } });
    expect(
      (
        await call(service, 'POST', '/api/auth/register/check', {
          email: 'nao@externo.com',
        })
      ).status,
    ).toBe(403);
    expect(
      (await call(service, 'GET', '/api/auth/register/check')).status,
    ).toBe(405);

    expect(
      (
        await call(service, 'POST', '/api/auth/email-change/start', {
          newEmail: 'novo@empresa.com',
          password: register.password,
        })
      ).status,
    ).toBe(401);

    const started = await call(
      service,
      'POST',
      '/api/auth/email-change/start',
      {
        newEmail: 'ana.nova@empresa.com',
        password: register.password,
      },
      bearer,
    );
    expect(started.status).toBe(200);

    expect(
      (
        await call(
          service,
          'POST',
          '/api/auth/email-change/start',
          {
            newEmail: 'invalido',
            password: register.password,
          },
          bearer,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await call(service, 'POST', '/api/auth/email-change/confirm', {
          newEmail: 'ana.nova@empresa.com',
          password: register.password,
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await call(
          service,
          'POST',
          '/api/auth/email-change/confirm',
          { newEmail: 'invalido', password: register.password },
          bearer,
        )
      ).status,
    ).toBe(400);

    const oldCode = lastCode(service, 'ana@parceiro.com');
    const newCode = lastCode(service, 'ana.nova@empresa.com');
    const confirmed = await call(
      service,
      'POST',
      '/api/auth/email-change/confirm',
      {
        newEmail: 'ana.nova@empresa.com',
        password: register.password,
        oldCode,
        newCode,
      },
      bearer,
    );
    expect(confirmed.status).toBe(200);
    expect((confirmed.body as { user: { email: string } }).user.email).toBe(
      'ana.nova@empresa.com',
    );
  });
});
