import {
  CreateChannelConfigSchema,
  CreateFeedbackCommentSchema,
  CreateFeedbackSchema,
  CreateServerInviteSchema,
  CreateServerSchema,
  JoinServerInviteSchema,
  ModerateAccountSchema,
  RegisterEligibilitySchema,
  ReorderChannelsSchema,
  UpdateAccountRolesSchema,
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
  const serverId = req.query?.get('serverId')?.trim() || 'default';

  if (path === '/api/server') {
    if (method === 'GET') {
      const settings = await workspace.getServerSettings(serverId);
      return json(200, settings);
    }
    if (method === 'PUT') {
      const token = bearer(req.authorization);
      const claims = token ? await auth.authenticate(token) : null;
      if (!claims) return error(401, 'unauthorized');
      const parsed = UpdateServerSettingsSchema.safeParse(body);
      if (!parsed.success) return error(400, 'invalid_request');
      return respond(
        await workspace.updateServerSettings(claims, parsed.data, serverId),
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
      const channels = await workspace.listPublicChannels(serverId);
      return json(200, { channels });
    }
    if (method === 'POST') {
      const parsed = CreateChannelConfigSchema.safeParse(body);
      if (!parsed.success) return error(400, 'invalid_request');
      return respond(
        await workspace.createManagedChannel(claims, parsed.data, serverId),
        (channel) => json(201, { channel }),
      );
    }
    return error(405, 'method_not_allowed');
  }

  if (path === '/api/server/channels/reorder') {
    if (method !== 'PUT' && method !== 'PATCH') {
      return error(405, 'method_not_allowed');
    }
    const token = bearer(req.authorization);
    const claims = token ? await auth.authenticate(token) : null;
    if (!claims) return error(401, 'unauthorized');
    const parsed = ReorderChannelsSchema.safeParse(body);
    if (!parsed.success) return error(400, 'invalid_request');
    return respond(
      await workspace.reorderChannels(claims, parsed.data),
      (channels) => json(200, { channels }),
    );
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

  if (path === '/api/server/accounts') {
    if (method !== 'GET') return error(405, 'method_not_allowed');
    const token = bearer(req.authorization);
    const claims = token ? await auth.authenticate(token) : null;
    if (!claims) return error(401, 'unauthorized');
    return respond(await workspace.listAccounts(claims, serverId), (accounts) =>
      json(200, { accounts }),
    );
  }

  const accountRolesMatch = /^\/api\/server\/accounts\/([^/]+)\/roles$/.exec(
    path,
  );
  if (accountRolesMatch) {
    if (method !== 'PUT' && method !== 'PATCH') {
      return error(405, 'method_not_allowed');
    }
    const token = bearer(req.authorization);
    const claims = token ? await auth.authenticate(token) : null;
    if (!claims) return error(401, 'unauthorized');
    const parsed = UpdateAccountRolesSchema.safeParse(body);
    if (!parsed.success) return error(400, 'invalid_request');
    const targetEmail = decodeURIComponent(accountRolesMatch[1]!);
    return respond(
      await workspace.updateAccountRoles(claims, targetEmail, parsed.data),
      (account) => json(200, { account }),
    );
  }

  const moderateMatch = /^\/api\/server\/accounts\/([^/]+)\/moderate$/.exec(
    path,
  );
  if (moderateMatch) {
    if (method !== 'POST') return error(405, 'method_not_allowed');
    const token = bearer(req.authorization);
    const claims = token ? await auth.authenticate(token) : null;
    if (!claims) return error(401, 'unauthorized');
    const parsed = ModerateAccountSchema.safeParse(body);
    if (!parsed.success) return error(400, 'invalid_request');
    const targetEmail = decodeURIComponent(moderateMatch[1]!);
    return respond(
      await workspace.moderateAccount(claims, targetEmail, parsed.data),
      (result) => json(200, result),
    );
  }

  const accountDeskMatch = /^\/api\/server\/accounts\/([^/]+)\/desk$/.exec(
    path,
  );
  if (accountDeskMatch) {
    if (method !== 'DELETE') return error(405, 'method_not_allowed');
    const token = bearer(req.authorization);
    const claims = token ? await auth.authenticate(token) : null;
    if (!claims) return error(401, 'unauthorized');
    const targetEmail = decodeURIComponent(accountDeskMatch[1]!);
    return respond(
      await workspace.releaseUserDeskAsAdmin(claims, targetEmail),
      (result) => json(200, result),
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

  // --- Multi-servidor e Convites (Fase 3) -----------------------------------

  if (path === '/api/servers') {
    const token = bearer(req.authorization);
    const claims = token ? await auth.authenticate(token) : null;
    if (!claims) return error(401, 'unauthorized');
    if (method === 'GET') {
      const servers = await workspace.listServers(claims);
      return json(200, { servers });
    }
    if (method === 'POST') {
      const parsed = CreateServerSchema.safeParse(body);
      if (!parsed.success) return error(400, 'invalid_request');
      return respond(
        await workspace.createServer(claims, parsed.data),
        (server) => json(201, { server }),
      );
    }
    return error(405, 'method_not_allowed');
  }

  if (path === '/api/servers/join') {
    if (method !== 'POST') return error(405, 'method_not_allowed');
    const token = bearer(req.authorization);
    const claims = token ? await auth.authenticate(token) : null;
    if (!claims) return error(401, 'unauthorized');
    const parsed = JoinServerInviteSchema.safeParse(body);
    if (!parsed.success) return error(400, 'invalid_request');
    return respond(
      await workspace.joinServerByInvite(claims, parsed.data.code),
      (server) => json(200, { server }),
    );
  }

  const serverInvitesMatch = /^\/api\/servers\/([^/]+)\/invites$/.exec(path);
  if (serverInvitesMatch) {
    const token = bearer(req.authorization);
    const claims = token ? await auth.authenticate(token) : null;
    if (!claims) return error(401, 'unauthorized');
    const serverId = decodeURIComponent(serverInvitesMatch[1]!);
    if (method === 'GET') {
      return respond(
        await workspace.listServerInvites(claims, serverId),
        (invites) => json(200, { invites }),
      );
    }
    if (method === 'POST') {
      const parsed = CreateServerInviteSchema.safeParse(body ?? {});
      if (!parsed.success) return error(400, 'invalid_request');
      return respond(
        await workspace.createServerInvite(claims, serverId, parsed.data),
        (invite) => json(201, { invite }),
      );
    }
    return error(405, 'method_not_allowed');
  }

  const revokeInviteMatch = /^\/api\/servers\/([^/]+)\/invites\/([^/]+)$/.exec(
    path,
  );
  if (revokeInviteMatch) {
    if (method !== 'DELETE') return error(405, 'method_not_allowed');
    const token = bearer(req.authorization);
    const claims = token ? await auth.authenticate(token) : null;
    if (!claims) return error(401, 'unauthorized');
    const serverId = decodeURIComponent(revokeInviteMatch[1]!);
    const code = decodeURIComponent(revokeInviteMatch[2]!);
    return respond(
      await workspace.revokeServerInvite(claims, serverId, code),
      (res) => json(200, res),
    );
  }

  const emailInvitesMatch = /^\/api\/servers\/([^/]+)\/email-invites$/.exec(
    path,
  );
  if (emailInvitesMatch) {
    const token = bearer(req.authorization);
    const claims = token ? await auth.authenticate(token) : null;
    if (!claims) return error(401, 'unauthorized');
    const serverId = decodeURIComponent(emailInvitesMatch[1]!);
    if (method === 'GET') {
      return respond(
        await workspace.listInvitedEmails(claims, serverId),
        (emails) => json(200, { emails }),
      );
    }
    if (method === 'POST') {
      const parsed = RegisterEligibilitySchema.safeParse(body);
      if (!parsed.success) return error(400, 'invalid_request');
      return respond(
        await workspace.addInvitedEmail(claims, serverId, parsed.data.email),
        (invite) => json(201, { invite }),
      );
    }
    return error(405, 'method_not_allowed');
  }

  const removeEmailInviteMatch =
    /^\/api\/servers\/([^/]+)\/email-invites\/([^/]+)$/.exec(path);
  if (removeEmailInviteMatch) {
    if (method !== 'DELETE') return error(405, 'method_not_allowed');
    const token = bearer(req.authorization);
    const claims = token ? await auth.authenticate(token) : null;
    if (!claims) return error(401, 'unauthorized');
    const serverId = decodeURIComponent(removeEmailInviteMatch[1]!);
    const email = decodeURIComponent(removeEmailInviteMatch[2]!);
    return respond(
      await workspace.removeInvitedEmail(claims, serverId, email),
      (res) => json(200, res),
    );
  }

  return null;
};
