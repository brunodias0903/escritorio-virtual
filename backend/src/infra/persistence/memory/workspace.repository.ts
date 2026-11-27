import type {
  FeedbackRepository,
  ServerInviteRepository,
  ServerRepository,
  ServerSettingsRepository,
} from '../../../modules/workspace/workspace.repository.js';
import {
  DEFAULT_SERVER_SETTINGS,
  type FeedbackComment,
  type FeedbackItem,
  type FeedbackStatus,
  type ServerInvite,
  type ServerMemberRole,
  type ServerSettings,
  type WorkspaceServer,
} from '../../../shared/domain/index.js';

export class MemoryServerSettingsRepository implements ServerSettingsRepository {
  private readonly byServer = new Map<string, ServerSettings>([
    ['default', { ...DEFAULT_SERVER_SETTINGS }],
  ]);

  async get(serverId = 'default'): Promise<ServerSettings> {
    const found = this.byServer.get(serverId);
    return found ? { ...found } : { ...DEFAULT_SERVER_SETTINGS };
  }

  async save(
    settings: ServerSettings,
    _updatedBy: string,
    serverId = 'default',
  ): Promise<ServerSettings> {
    const copy = { ...settings };
    this.byServer.set(serverId, copy);
    return { ...copy };
  }
}

export class MemoryFeedbackRepository implements FeedbackRepository {
  private readonly items = new Map<string, FeedbackItem>();
  private nextTicketSeq = 1;

  async list(): Promise<FeedbackItem[]> {
    return [...this.items.values()]
      .map((item) => ({ ...item, comments: [...item.comments] }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async get(id: string): Promise<FeedbackItem | undefined> {
    const item = this.items.get(id);
    return item ? { ...item, comments: [...item.comments] } : undefined;
  }

  async create(item: FeedbackItem): Promise<void> {
    const ticketKey = item.ticketKey ?? `EV-${this.nextTicketSeq++}`;
    item.ticketKey = ticketKey;
    this.items.set(item.id, {
      ...item,
      ticketKey,
      comments: [...item.comments],
    });
  }

  async update(
    id: string,
    patch: {
      status?: FeedbackStatus;
      mrUrl?: string | null;
      updatedAt: number;
      updatedBy: string;
    },
  ): Promise<FeedbackItem | undefined> {
    const item = this.items.get(id);
    if (!item) return undefined;
    const next: FeedbackItem = {
      ...item,
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.mrUrl !== undefined ? { mrUrl: patch.mrUrl } : {}),
      updatedAt: patch.updatedAt,
      updatedBy: patch.updatedBy,
    };
    this.items.set(id, next);
    return { ...next, comments: [...next.comments] };
  }

  async addComment(comment: FeedbackComment): Promise<void> {
    const item = this.items.get(comment.feedbackId);
    if (!item) return;
    item.comments = [...item.comments, comment];
    item.updatedAt = Math.max(item.updatedAt, comment.createdAt);
  }
}

export class MemoryServerRepository implements ServerRepository {
  private readonly servers = new Map<string, WorkspaceServer>([
    [
      'default',
      {
        id: 'default',
        name: DEFAULT_SERVER_SETTINGS.name,
        description: DEFAULT_SERVER_SETTINGS.description,
        accentColor: '#5b6cff',
        visibility: 'open',
        ownerEmail: 'system@local',
        planTier: 'unlimited',
        maxMembers: null,
        maxPendingInvites: null,
        createdAt: 0,
      },
    ],
  ]);

  private readonly members = new Map<string, Map<string, ServerMemberRole>>();

  async listForUser(email: string): Promise<WorkspaceServer[]> {
    const normalized = email.trim().toLowerCase();
    return [...this.servers.values()]
      .filter((srv) => {
        if (srv.id === 'default' || srv.visibility === 'open') return true;
        if (srv.ownerEmail.toLowerCase() === normalized) return true;
        return this.members.get(srv.id)?.has(normalized) ?? false;
      })
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  async get(id: string): Promise<WorkspaceServer | undefined> {
    const srv = this.servers.get(id);
    return srv ? { ...srv } : undefined;
  }

  async create(
    server: WorkspaceServer,
    ownerEmail: string,
  ): Promise<WorkspaceServer> {
    const normalized = ownerEmail.trim().toLowerCase();
    this.servers.set(server.id, { ...server });
    const map =
      this.members.get(server.id) ?? new Map<string, ServerMemberRole>();
    map.set(normalized, 'owner');
    this.members.set(server.id, map);
    return { ...server };
  }

  async update(
    id: string,
    patch: { name?: string; description?: string; accentColor?: string },
  ): Promise<WorkspaceServer | undefined> {
    const existing = this.servers.get(id);
    if (!existing) return undefined;
    const next: WorkspaceServer = {
      ...existing,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.description !== undefined
        ? { description: patch.description }
        : {}),
      ...(patch.accentColor !== undefined
        ? { accentColor: patch.accentColor }
        : {}),
    };
    this.servers.set(id, next);
    return { ...next };
  }

  async addMember(
    serverId: string,
    email: string,
    role: ServerMemberRole,
  ): Promise<void> {
    const map =
      this.members.get(serverId) ?? new Map<string, ServerMemberRole>();
    map.set(email.trim().toLowerCase(), role);
    this.members.set(serverId, map);
  }

  async isMember(serverId: string, email: string): Promise<boolean> {
    if (serverId === 'default') return true;
    return this.members.get(serverId)?.has(email.trim().toLowerCase()) ?? false;
  }

  async countMembers(serverId: string): Promise<number> {
    return this.members.get(serverId)?.size ?? 0;
  }
}

export class MemoryServerInviteRepository implements ServerInviteRepository {
  private readonly invites = new Map<string, ServerInvite>();
  private readonly emailInvites = new Map<
    string,
    Map<string, { invitedBy: string; createdAt: number }>
  >();

  async listByServer(serverId: string): Promise<ServerInvite[]> {
    return [...this.invites.values()]
      .filter((inv) => inv.serverId === serverId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async getByCode(code: string): Promise<ServerInvite | undefined> {
    const inv = this.invites.get(code.trim().toUpperCase());
    return inv ? { ...inv } : undefined;
  }

  async create(invite: ServerInvite): Promise<ServerInvite> {
    this.invites.set(invite.code.toUpperCase(), { ...invite });
    return { ...invite };
  }

  async incrementUse(code: string): Promise<void> {
    const key = code.trim().toUpperCase();
    const inv = this.invites.get(key);
    if (!inv) return;
    this.invites.set(key, { ...inv, uses: inv.uses + 1 });
  }

  async revoke(code: string, serverId: string): Promise<boolean> {
    const key = code.trim().toUpperCase();
    const inv = this.invites.get(key);
    if (!inv || inv.serverId !== serverId) return false;
    this.invites.set(key, { ...inv, revoked: true });
    return true;
  }

  async listInvitedEmails(serverId: string) {
    const map = this.emailInvites.get(serverId);
    if (!map) return [];
    return [...map.entries()]
      .map(([email, meta]) => ({
        serverId,
        email,
        invitedBy: meta.invitedBy,
        createdAt: meta.createdAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async addInvitedEmail(
    serverId: string,
    email: string,
    invitedBy: string,
    createdAt: number,
  ) {
    const map =
      this.emailInvites.get(serverId) ??
      new Map<string, { invitedBy: string; createdAt: number }>();
    map.set(email.trim().toLowerCase(), { invitedBy, createdAt });
    this.emailInvites.set(serverId, map);
  }

  async removeInvitedEmail(serverId: string, email: string) {
    return (
      this.emailInvites.get(serverId)?.delete(email.trim().toLowerCase()) ??
      false
    );
  }

  async isEmailInvited(email: string) {
    const normalized = email.trim().toLowerCase();
    for (const map of this.emailInvites.values()) {
      if (map.has(normalized)) return true;
    }
    return false;
  }

  async invitedServersForEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    const out: string[] = [];
    for (const [serverId, map] of this.emailInvites.entries()) {
      if (map.has(normalized)) out.push(serverId);
    }
    return out;
  }
}
