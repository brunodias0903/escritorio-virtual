import { z } from 'zod';

import {
  ACCOUNT_TIERS,
  ApiErrorSchema,
  DEFAULT_SERVER_SETTINGS,
  DeskInfoSchema,
  FeedbackCommentSchema,
  FeedbackItemSchema,
  ManagedAccountSchema,
  ModerateAccountResponseSchema,
  ServerSettingsSchema,
  type CreateChannelConfig,
  type CreateFeedback,
  type CreateFeedbackComment,
  type FeedbackComment,
  type FeedbackItem,
  type ManagedAccount,
  type ModerateAccount,
  type ReorderChannels,
  type ServerSettings,
  type UpdateAccountRoles,
  type UpdateChannelConfig,
  type UpdateFeedback,
  type UpdateServerSettings,
} from '@/shared/domain';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export const ManagedChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['public', 'dm']),
  archived: z.boolean(),
  position: z.number().int().min(0).default(0),
  topic: z.string().default(''),
  viewTiers: z.array(z.enum(ACCOUNT_TIERS)).default([...ACCOUNT_TIERS]),
  writeTiers: z.array(z.enum(ACCOUNT_TIERS)).default([...ACCOUNT_TIERS]),
  allowedEmails: z.array(z.string()).default([]),
  blockedEmails: z.array(z.string()).default([]),
});
export type ManagedChannel = z.infer<typeof ManagedChannelSchema>;

async function request<T>(
  baseUrl: string,
  path: string,
  schema: z.ZodType<T>,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  try {
    const headers: Record<string, string> = {};
    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const raw: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const err = ApiErrorSchema.safeParse(raw);
      return {
        ok: false,
        error: err.success ? err.data.error : 'server_error',
      };
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: 'server_error' };
    return { ok: true, data: parsed.data };
  } catch {
    return { ok: false, error: 'network' };
  }
}

export function createWorkspaceApi({ baseUrl }: { baseUrl: string }) {
  return {
    getServerSettings: async (): Promise<ServerSettings> => {
      const res = await request(baseUrl, '/api/server', ServerSettingsSchema);
      return res.ok ? res.data : DEFAULT_SERVER_SETTINGS;
    },

    updateServerSettings: (token: string, body: UpdateServerSettings) =>
      request(baseUrl, '/api/server', ServerSettingsSchema, {
        method: 'PUT',
        token,
        body,
      }),

    listChannels: (token: string) =>
      request(
        baseUrl,
        '/api/server/channels',
        z.object({ channels: z.array(ManagedChannelSchema) }),
        { token },
      ),

    createChannel: (token: string, body: CreateChannelConfig) =>
      request(
        baseUrl,
        '/api/server/channels',
        z.object({ channel: ManagedChannelSchema }),
        { method: 'POST', token, body },
      ),

    updateChannel: (
      token: string,
      channelId: string,
      body: UpdateChannelConfig,
    ) =>
      request(
        baseUrl,
        `/api/server/channels/${encodeURIComponent(channelId)}`,
        z.object({ channel: ManagedChannelSchema }),
        { method: 'PUT', token, body },
      ),

    reorderChannels: (token: string, body: ReorderChannels) =>
      request(
        baseUrl,
        '/api/server/channels/reorder',
        z.object({ channels: z.array(ManagedChannelSchema) }),
        { method: 'PUT', token, body },
      ),

    listFeedback: (token: string) =>
      request(
        baseUrl,
        '/api/feedback',
        z.object({ items: z.array(FeedbackItemSchema) }),
        { token },
      ),

    createFeedback: (token: string, body: CreateFeedback) =>
      request(
        baseUrl,
        '/api/feedback',
        z.object({ item: FeedbackItemSchema }),
        { method: 'POST', token, body },
      ),

    updateFeedback: (token: string, id: string, body: UpdateFeedback) =>
      request(
        baseUrl,
        `/api/feedback/${encodeURIComponent(id)}`,
        z.object({ item: FeedbackItemSchema }),
        { method: 'PATCH', token, body },
      ),

    addFeedbackComment: (
      token: string,
      id: string,
      body: CreateFeedbackComment,
    ): Promise<ApiResult<{ comment: FeedbackComment }>> =>
      request(
        baseUrl,
        `/api/feedback/${encodeURIComponent(id)}/comments`,
        z.object({ comment: FeedbackCommentSchema }),
        { method: 'POST', token, body },
      ),

    listAccounts: (token: string) =>
      request(
        baseUrl,
        '/api/server/accounts',
        z.object({ accounts: z.array(ManagedAccountSchema) }),
        { token },
      ),

    updateAccountRoles: (
      token: string,
      email: string,
      body: UpdateAccountRoles,
    ) =>
      request(
        baseUrl,
        `/api/server/accounts/${encodeURIComponent(email)}/roles`,
        z.object({ account: ManagedAccountSchema }),
        { method: 'PUT', token, body },
      ),

    moderateAccount: (token: string, email: string, body: ModerateAccount) =>
      request(
        baseUrl,
        `/api/server/accounts/${encodeURIComponent(email)}/moderate`,
        ModerateAccountResponseSchema,
        { method: 'POST', token, body },
      ),

    releaseAccountDesk: (token: string, email: string) =>
      request(
        baseUrl,
        `/api/server/accounts/${encodeURIComponent(email)}/desk`,
        z.object({ desk: DeskInfoSchema }),
        { method: 'DELETE', token },
      ),
  };
}

export type WorkspaceApi = ReturnType<typeof createWorkspaceApi>;
export type { FeedbackItem, ManagedAccount };
