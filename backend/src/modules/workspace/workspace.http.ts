import {
  CreateChannelConfigSchema,
  CreateFeedbackCommentSchema,
  CreateFeedbackSchema,
  UpdateChannelConfigSchema,
  UpdateFeedbackSchema,
  UpdateServerSettingsSchema,
} from '../../shared/domain/index.js';
import type { HttpResult } from '../../shared/result.js';
import type { ApiRequest, ApiResponse } from '../auth/auth.http.js';
import type { AuthService } from '../auth/auth.service.js';
import type { WorkspaceService } from './workspace.service.js';

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

/**
 * Rotas HTTP para configurações do servidor, permissões de canais e central de feedback.
 * Devolve `null` quando o caminho não pertence a este módulo.
 */
export const handleWorkspaceRoutes = async (
  auth: AuthService,
  workspace: WorkspaceService,
  req: ApiRequest,
): Promise<ApiResponse | null> => {
  const { method, path, body } = req;

  if (path === '/api/server') {
    if (method === 'GET') {
      const settings = await workspace.getServerSettings();
      return json(200, settings);
    }
    if (method === 'PUT') {
      const token = bearer(req.authorization);
      const claims = token ? await auth.authenticate(token) : null;
      if (!claims) return error(401, 'unauthorized');
      const parsed = UpdateServerSettingsSchema.safeParse(body);
      if (!parsed.success) return error(400, 'invalid_request');
      return respond(
        await workspace.updateServerSettings(claims, parsed.data),
        (saved) => json(200, saved),
      );
    }
    return error(405, 'method_not_allowed');
  }

  if (path === '/api/server/channels') {
    const token = bearer(req.authorization);
    const claims = token ? await auth.authenticate(token) : null;
    if (!claims) return error(401, 'unauthorized');

    if (method === 'GET') {
      const channels = await workspace.listPublicChannels();
      return json(200, { channels });
    }
    if (method === 'POST') {
      const parsed = CreateChannelConfigSchema.safeParse(body);
      if (!parsed.success) return error(400, 'invalid_request');
      return respond(
        await workspace.createManagedChannel(claims, parsed.data),
        (channel) => json(201, { channel }),
      );
    }
    return error(405, 'method_not_allowed');
  }

  const channelMatch = /^\/api\/server\/channels\/([^/]+)$/.exec(path);
  if (channelMatch) {
    if (method !== 'PUT' && method !== 'PATCH') {
      return error(405, 'method_not_allowed');
    }
    const token = bearer(req.authorization);
    const claims = token ? await auth.authenticate(token) : null;
    if (!claims) return error(401, 'unauthorized');
    const parsed = UpdateChannelConfigSchema.safeParse(body);
    if (!parsed.success) return error(400, 'invalid_request');
    const channelId = decodeURIComponent(channelMatch[1]!);
    return respond(
      await workspace.updateChannelConfig(claims, channelId, parsed.data),
      (channel) => json(200, { channel }),
    );
  }

  if (path === '/api/feedback') {
    const token = bearer(req.authorization);
    const claims = token ? await auth.authenticate(token) : null;
    if (!claims) return error(401, 'unauthorized');

    if (method === 'GET') {
      const items = await workspace.listFeedback(claims);
      return json(200, { items });
    }
    if (method === 'POST') {
      const parsed = CreateFeedbackSchema.safeParse(body);
      if (!parsed.success) return error(400, 'invalid_request');
      return respond(
        await workspace.createFeedback(claims, parsed.data),
        (item) => json(201, { item }),
      );
    }
    return error(405, 'method_not_allowed');
  }

  const commentMatch = /^\/api\/feedback\/([^/]+)\/comments$/.exec(path);
  if (commentMatch) {
    if (method !== 'POST') return error(405, 'method_not_allowed');
    const token = bearer(req.authorization);
    const claims = token ? await auth.authenticate(token) : null;
    if (!claims) return error(401, 'unauthorized');
    const parsed = CreateFeedbackCommentSchema.safeParse(body);
    if (!parsed.success) return error(400, 'invalid_request');
    const feedbackId = decodeURIComponent(commentMatch[1]!);
    return respond(
      await workspace.addFeedbackComment(claims, feedbackId, parsed.data),
      (comment) => json(201, { comment }),
    );
  }

  const feedbackMatch = /^\/api\/feedback\/([^/]+)$/.exec(path);
  if (feedbackMatch) {
    if (method !== 'PATCH' && method !== 'PUT') {
      return error(405, 'method_not_allowed');
    }
    const token = bearer(req.authorization);
    const claims = token ? await auth.authenticate(token) : null;
    if (!claims) return error(401, 'unauthorized');
    const parsed = UpdateFeedbackSchema.safeParse(body);
    if (!parsed.success) return error(400, 'invalid_request');
    const feedbackId = decodeURIComponent(feedbackMatch[1]!);
    return respond(
      await workspace.updateFeedback(claims, feedbackId, parsed.data),
      (item) => json(200, { item }),
    );
  }

  return null;
};
