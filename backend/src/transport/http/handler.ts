import type { IncomingMessage, ServerResponse } from 'node:http';
import { isOriginAllowed } from '../../config/origin.js';
import { handleAuthRoutes } from '../../modules/auth/auth.http.js';
import type { AuthService } from '../../modules/auth/auth.service.js';
import { handleWorkspaceRoutes } from '../../modules/workspace/workspace.http.js';
import type { WorkspaceService } from '../../modules/workspace/workspace.service.js';

export const MAX_BODY_BYTES = 64 * 1024;

export type HttpHandlerOptions = {
  auth: AuthService;
  workspace?: WorkspaceService;
  allowedOrigins: readonly string[];
  trustProxy: boolean;
  onError?: (error: unknown) => void;
};

export const extractClientIp = (
  req: Pick<IncomingMessage, 'headers' | 'socket'>,
  trustProxy: boolean,
): string => {
  const forwarded = req.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(
    ',',
  )[0];
  return (
    (trustProxy && first?.trim()) || req.socket?.remoteAddress || 'desconhecido'
  );
};

const readJsonBody = (req: IncomingMessage): Promise<unknown> =>
  new Promise((resolve, reject) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      resolve(undefined);
      return;
    }
    if (!req.headers['content-type']?.startsWith('application/json')) {
      resolve(undefined);
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('payload_too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        resolve(undefined);
      }
    });
    req.on('error', reject);
  });

const sendJson = (res: ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(body));
};

/** Cria o handler HTTP principal (CORS, /healthz, parse JSON e rotas da API). */
export const createHttpHandler = ({
  auth,
  workspace,
  allowedOrigins,
  trustProxy,
  onError = (error) => console.error('[erro]', error),
}: HttpHandlerOptions) => {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const origin = req.headers.origin;
    if (!isOriginAllowed(origin, allowedOrigins)) {
      sendJson(res, 403, { error: 'forbidden' });
      return;
    }
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'content-type, authorization',
      );
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      );
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (path === '/healthz') {
      sendJson(res, 200, { ok: true });
      return;
    }

    try {
      const apiReq = {
        method: req.method ?? 'GET',
        path,
        authorization: req.headers.authorization,
        body: await readJsonBody(req),
        ip: extractClientIp(req, trustProxy),
      };
      const workspaceRes = workspace
        ? await handleWorkspaceRoutes(auth, workspace, apiReq)
        : null;
      const response = workspaceRes ?? (await handleAuthRoutes(auth, apiReq));
      sendJson(res, response.status, response.body);
    } catch (error) {
      const tooLarge =
        error instanceof Error && error.message === 'payload_too_large';
      if (!tooLarge) onError(error);
      sendJson(res, tooLarge ? 413 : 500, {
        error: tooLarge ? 'invalid_request' : 'server_error',
      });
    }
  };
};
