import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import {
  MemoryLocalAccountRepository,
  MemoryRateLimiter,
  MemoryRevocations,
} from '../../infra/persistence/memory/index.js';
import { AuthService } from '../../modules/auth/auth.service.js';
import { parseAccountAccess } from '../../shared/domain/index.js';
import {
  MAX_BODY_BYTES,
  createHttpHandler,
  extractClientIp,
} from './handler.js';

const newAuth = () =>
  new AuthService({
    accounts: new MemoryLocalAccountRepository(),
    secret: 'segredo-de-teste-com-mais-de-32-caracteres',
    adminEmails: [],
    access: parseAccountAccess('empresa.com', ''),
    loginLimiter: new MemoryRateLimiter(10, 60_000),
    revocations: new MemoryRevocations(),
    codes: null,
  });

const mockReq = ({
  method = 'GET',
  url = '/healthz',
  headers = {},
  body,
  remoteAddress = '127.0.0.1',
}: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: string;
  remoteAddress?: string;
}) => {
  const emitter = new EventEmitter();
  const req = Object.assign(emitter, {
    method,
    url,
    headers,
    socket: { remoteAddress },
    destroy: vi.fn(),
  }) as unknown as IncomingMessage;
  queueMicrotask(() => {
    if (body !== undefined) emitter.emit('data', Buffer.from(body, 'utf8'));
    emitter.emit('end');
  });
  return req;
};

const mockRes = () => {
  const headers = new Map<string, string>();
  let status = 0;
  let body = '';
  const res = {
    setHeader(name: string, value: string) {
      headers.set(name.toLowerCase(), value);
    },
    writeHead(code: number, extra?: Record<string, string>) {
      status = code;
      for (const [k, v] of Object.entries(extra ?? {})) {
        headers.set(k.toLowerCase(), v);
      }
      return res;
    },
    end(chunk?: string) {
      if (chunk) body += chunk;
      return res;
    },
  } as unknown as ServerResponse;
  return {
    res,
    result: () => ({
      status,
      headers,
      json: body ? (JSON.parse(body) as unknown) : undefined,
    }),
  };
};

describe('extractClientIp', () => {
  it('usa X-Forwarded-For só quando trustProxy está ligado', () => {
    const req = {
      headers: { 'x-forwarded-for': ' 203.0.113.10 , 10.0.0.1 ' },
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as IncomingMessage;
    expect(extractClientIp(req, true)).toBe('203.0.113.10');
    expect(extractClientIp(req, false)).toBe('127.0.0.1');
  });

  it('usa fallback quando não há endereço no socket', () => {
    const req = { headers: {}, socket: {} } as unknown as IncomingMessage;
    expect(extractClientIp(req, false)).toBe('desconhecido');
  });
});

describe('createHttpHandler', () => {
  it('responde /healthz com 200 e cabeçalhos de segurança', async () => {
    const handler = createHttpHandler({
      auth: newAuth(),
      allowedOrigins: [],
      trustProxy: false,
    });
    const { res, result } = mockRes();
    await handler(mockReq({ method: 'GET', url: '/healthz' }), res);
    expect(result().status).toBe(200);
    expect(result().json).toEqual({ ok: true });
    expect(result().headers.get('cache-control')).toBe('no-store');
    expect(result().headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('bloqueia origem não permitida com 403 e aceita preflight OPTIONS de origem liberada', async () => {
    const handler = createHttpHandler({
      auth: newAuth(),
      allowedOrigins: ['https://app.empresa.com'],
      trustProxy: false,
    });

    const blocked = mockRes();
    await handler(
      mockReq({
        method: 'GET',
        url: '/api/auth/options',
        headers: { origin: 'https://mal.com' },
      }),
      blocked.res,
    );
    expect(blocked.result().status).toBe(403);

    const preflight = mockRes();
    await handler(
      mockReq({
        method: 'OPTIONS',
        url: '/api/auth/login',
        headers: { origin: 'https://app.empresa.com' },
      }),
      preflight.res,
    );
    expect(preflight.result().status).toBe(204);
    expect(preflight.result().headers.get('access-control-allow-origin')).toBe(
      'https://app.empresa.com',
    );
  });

  it('ecoa a origem concreta quando autorizada por curinga de subdomínio', async () => {
    const handler = createHttpHandler({
      auth: newAuth(),
      allowedOrigins: ['https://*.trycloudflare.com'],
      trustProxy: false,
    });

    const tunnelOrigin =
      'https://installing-chan-reserved-has.trycloudflare.com';
    const preflight = mockRes();
    await handler(
      mockReq({
        method: 'OPTIONS',
        url: '/api/auth/login',
        headers: { origin: tunnelOrigin },
      }),
      preflight.res,
    );
    expect(preflight.result().status).toBe(204);
    expect(preflight.result().headers.get('access-control-allow-origin')).toBe(
      tunnelOrigin,
    );
  });

  it('encaminha rotas JSON da API e recusa corpo maior que o limite com 413', async () => {
    const handler = createHttpHandler({
      auth: newAuth(),
      allowedOrigins: [],
      trustProxy: false,
    });

    const options = mockRes();
    await handler(
      mockReq({ method: 'GET', url: '/api/auth/options' }),
      options.res,
    );
    expect(options.result().status).toBe(200);
    expect(options.result().json).toEqual({
      emailCodes: false,
      domains: ['empresa.com'],
    });

    const huge = mockRes();
    await handler(
      mockReq({
        method: 'POST',
        url: '/api/auth/login',
        headers: { 'content-type': 'application/json' },
        body: 'x'.repeat(MAX_BODY_BYTES + 1),
      }),
      huge.res,
    );
    expect(huge.result().status).toBe(413);
    expect(huge.result().json).toEqual({ error: 'invalid_request' });
  });

  it('trata JSON inválido como corpo vazio (400) e erro inesperado como 500', async () => {
    const onError = vi.fn();
    const auth = newAuth();
    const handler = createHttpHandler({
      auth,
      allowedOrigins: [],
      trustProxy: false,
      onError,
    });

    const badJson = mockRes();
    await handler(
      mockReq({
        method: 'POST',
        url: '/api/auth/login',
        headers: { 'content-type': 'application/json' },
        body: '{quebrado',
      }),
      badJson.res,
    );
    expect(badJson.result().status).toBe(400);

    vi.spyOn(auth, 'options').mockImplementation(() => {
      throw new Error('falha interna');
    });
    const boom = mockRes();
    await handler(
      mockReq({ method: 'GET', url: '/api/auth/options' }),
      boom.res,
    );
    expect(boom.result().status).toBe(500);
    expect(boom.result().json).toEqual({ error: 'server_error' });
    expect(onError).toHaveBeenCalledOnce();
  });
});
