import type {
  FeedbackRepository,
  ServerInviteRepository,
  ServerRepository,
  ServerSettingsRepository,
} from '../../../modules/workspace/workspace.repository.js';
import {
  DEFAULT_SERVER_SETTINGS,
  type AccountTier,
  type FeedbackComment,
  type FeedbackItem,
  type FeedbackKind,
  type FeedbackStatus,
  type ServerInvite,
  type ServerMemberRole,
  type ServerPlanTier,
  type ServerSettings,
  type ServerVisibility,
  type WorkspaceServer,
} from '../../../shared/domain/index.js';
import type { SqlClient } from '../../database/sql-client.js';

type ServerSettingsDbRow = {
  name: string;
  description: string;
  icon: string | null;
  welcome_message: string;
  allow_public_registration: boolean;
  updated_at: string | number;
};

export class PgServerSettingsRepository implements ServerSettingsRepository {
  private readonly db: SqlClient;

  constructor(db: SqlClient) {
    this.db = db;
  }

  async get(): Promise<ServerSettings> {
    const { rows } = await this.db.query(
      `SELECT name, description, icon, welcome_message, allow_public_registration, updated_at
       FROM server_settings WHERE id = 'default'`,
    );
    const row = rows[0] as ServerSettingsDbRow | undefined;
    if (!row) return { ...DEFAULT_SERVER_SETTINGS };
    return {
      name: row.name,
      description: row.description,
      icon: row.icon,
      welcomeMessage: row.welcome_message,
      allowPublicRegistration: row.allow_public_registration,
      updatedAt: Number(row.updated_at),
    };
  }

  async save(
    settings: ServerSettings,
    updatedBy: string,
  ): Promise<ServerSettings> {
    await this.db.query(
      `INSERT INTO server_settings (id, name, description, icon, welcome_message, allow_public_registration, updated_at, updated_by)
       VALUES ('default', $1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         icon = EXCLUDED.icon,
         welcome_message = EXCLUDED.welcome_message,
         allow_public_registration = EXCLUDED.allow_public_registration,
         updated_at = EXCLUDED.updated_at,
         updated_by = EXCLUDED.updated_by`,
      [
        settings.name,
        settings.description,
        settings.icon,
        settings.welcomeMessage,
        settings.allowPublicRegistration,
        settings.updatedAt,
        updatedBy,
      ],
    );
    return { ...settings };
  }
}

type FeedbackDbRow = {
  id: string;
  ticket_key?: string | null;
  kind: FeedbackKind;
  title: string;
  description: string;
  status: FeedbackStatus;
  author_email: string;
  author_name: string;
  mr_url: string | null;
  created_at: string | number;
  updated_at: string | number;
  updated_by: string | null;
};

type FeedbackCommentDbRow = {
  id: string;
  feedback_id: string;
  author_email: string;
  author_name: string;
  author_tier: AccountTier;
  body: string;
  created_at: string | number;
};

const toComment = (row: FeedbackCommentDbRow): FeedbackComment => ({
  id: row.id,
  feedbackId: row.feedback_id,
  authorEmail: row.author_email,
  authorName: row.author_name,
  authorTier: row.author_tier,
  body: row.body,
  createdAt: Number(row.created_at),
});

const toItem = (
  row: FeedbackDbRow,
  comments: FeedbackComment[],
): FeedbackItem => ({
  id: row.id,
  ticketKey: row.ticket_key ?? `EV-${row.id.slice(0, 6).toUpperCase()}`,
  kind: row.kind,
  title: row.title,
  description: row.description,
  status: row.status,
  authorEmail: row.author_email,
  authorName: row.author_name,
  mrUrl: row.mr_url,
  createdAt: Number(row.created_at),
  updatedAt: Number(row.updated_at),
  updatedBy: row.updated_by,
  comments,
});

export class PgFeedbackRepository implements FeedbackRepository {
  private readonly db: SqlClient;

  constructor(db: SqlClient) {
    this.db = db;
  }

  async list(): Promise<FeedbackItem[]> {
    const [itemsRes, commentsRes] = await Promise.all([
      this.db.query(
        `SELECT id, ticket_key, kind, title, description, status, author_email, author_name, mr_url, created_at, updated_at, updated_by
         FROM feedback_items ORDER BY updated_at DESC LIMIT 200`,
      ),
      this.db.query(
        `SELECT id, feedback_id, author_email, author_name, author_tier, body, created_at
         FROM feedback_comments ORDER BY created_at ASC`,
      ),
    ]);
    const byFeedback = new Map<string, FeedbackComment[]>();
    for (const raw of commentsRes.rows) {
      const comment = toComment(raw as FeedbackCommentDbRow);
      const list = byFeedback.get(comment.feedbackId) ?? [];
      list.push(comment);
      byFeedback.set(comment.feedbackId, list);
    }
    return itemsRes.rows.map((raw) => {
      const row = raw as FeedbackDbRow;
      return toItem(row, byFeedback.get(row.id) ?? []);
    });
  }

  async get(id: string): Promise<FeedbackItem | undefined> {
    const { rows } = await this.db.query(
      `SELECT id, ticket_key, kind, title, description, status, author_email, author_name, mr_url, created_at, updated_at, updated_by
       FROM feedback_items WHERE id = $1`,
      [id],
    );
    const row = rows[0] as FeedbackDbRow | undefined;
    if (!row) return undefined;
    const commentsRes = await this.db.query(
      `SELECT id, feedback_id, author_email, author_name, author_tier, body, created_at
       FROM feedback_comments WHERE feedback_id = $1 ORDER BY created_at ASC`,
      [id],
    );
    return toItem(
      row,
      commentsRes.rows.map((c) => toComment(c as FeedbackCommentDbRow)),
    );
  }

  async create(item: FeedbackItem): Promise<void> {
    let ticketKey = item.ticketKey;
    if (!ticketKey) {
      const seqRes = await this.db.query(
        `SELECT nextval('feedback_ticket_seq') AS seq`,
      );
      const seq = Number((seqRes.rows[0] as { seq: string | number }).seq);
      ticketKey = `EV-${seq}`;
      item.ticketKey = ticketKey;
    }
    await this.db.query(
      `INSERT INTO feedback_items (id, ticket_key, kind, title, description, status, author_email, author_name, mr_url, created_at, updated_at, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        item.id,
        ticketKey,
        item.kind,
        item.title,
        item.description,
        item.status,
        item.authorEmail,
        item.authorName,
        item.mrUrl ?? null,
        item.createdAt,
        item.updatedAt,
        item.updatedBy ?? null,
      ],
    );
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
    const existing = await this.get(id);
    if (!existing) return undefined;
    const nextStatus = patch.status ?? existing.status;
    const nextMr =
      patch.mrUrl === undefined ? (existing.mrUrl ?? null) : patch.mrUrl;
    await this.db.query(
      `UPDATE feedback_items
       SET status = $2, mr_url = $3, updated_at = $4, updated_by = $5
       WHERE id = $1`,
      [id, nextStatus, nextMr, patch.updatedAt, patch.updatedBy],
    );
    return {
      ...existing,
      status: nextStatus,
      mrUrl: nextMr,
      updatedAt: patch.updatedAt,
      updatedBy: patch.updatedBy,
    };
  }

  async addComment(comment: FeedbackComment): Promise<void> {
    await this.db.query(
      `INSERT INTO feedback_comments (id, feedback_id, author_email, author_name, author_tier, body, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        comment.id,
        comment.feedbackId,
        comment.authorEmail,
        comment.authorName,
        comment.authorTier,
        comment.body,
        comment.createdAt,
      ],
    );
    await this.db.query(
      `UPDATE feedback_items SET updated_at = GREATEST(updated_at, $2) WHERE id = $1`,
      [comment.feedbackId, comment.createdAt],
    );
  }
}

type ServerDbRow = {
  id: string;
  name: string;
  description: string;
  accent_color: string;
  visibility: ServerVisibility;
  owner_email: string;
  plan_tier: ServerPlanTier | null;
  max_members: number | null;
  max_pending_invites: number | null;
  created_at: string | number;
};

type ServerInviteDbRow = {
  code: string;
  server_id: string;
  created_by: string;
  max_uses: number | null;
  uses: number;
  expires_at: string | number | null;
  revoked: boolean;
  created_at: string | number;
};

const toServer = (row: ServerDbRow): WorkspaceServer => ({
  id: row.id,
  name: row.name,
  description: row.description,
  accentColor: row.accent_color,
  visibility: row.visibility,
  ownerEmail: row.owner_email,
  planTier: row.plan_tier ?? (row.id === 'default' ? 'unlimited' : 'starter'),
  maxMembers: row.max_members === null ? null : Number(row.max_members),
  maxPendingInvites:
    row.max_pending_invites === null ? null : Number(row.max_pending_invites),
  createdAt: Number(row.created_at),
});

const toInvite = (row: ServerInviteDbRow): ServerInvite => ({
  code: row.code,
  serverId: row.server_id,
  createdBy: row.created_by,
  maxUses: row.max_uses === null ? null : Number(row.max_uses),
  uses: Number(row.uses),
  expiresAt: row.expires_at === null ? null : Number(row.expires_at),
  revoked: Boolean(row.revoked),
  createdAt: Number(row.created_at),
});

export class PgServerRepository implements ServerRepository {
  private readonly db: SqlClient;

  constructor(db: SqlClient) {
    this.db = db;
  }

  async listForUser(email: string): Promise<WorkspaceServer[]> {
    const normalized = email.trim().toLowerCase();
    const { rows } = await this.db.query(
      `SELECT DISTINCT s.id, s.name, s.description, s.accent_color, s.visibility, s.owner_email, s.plan_tier, s.max_members, s.max_pending_invites, s.created_at
       FROM servers s
       LEFT JOIN server_members m ON m.server_id = s.id AND m.user_email = $1
       WHERE s.id = 'default'
          OR s.visibility = 'open'
          OR LOWER(s.owner_email) = $1
          OR m.user_email IS NOT NULL
       ORDER BY s.created_at ASC`,
      [normalized],
    );
    return (rows as ServerDbRow[]).map(toServer);
  }

  async get(id: string): Promise<WorkspaceServer | undefined> {
    const { rows } = await this.db.query(
      `SELECT id, name, description, accent_color, visibility, owner_email, plan_tier, max_members, max_pending_invites, created_at
       FROM servers WHERE id = $1`,
      [id],
    );
    const row = rows[0] as ServerDbRow | undefined;
    return row ? toServer(row) : undefined;
  }

  async create(
    server: WorkspaceServer,
    ownerEmail: string,
  ): Promise<WorkspaceServer> {
    const normalized = ownerEmail.trim().toLowerCase();
    await this.db.query(
      `INSERT INTO servers (id, name, description, accent_color, visibility, owner_email, plan_tier, max_members, max_pending_invites, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        server.id,
        server.name,
        server.description,
        server.accentColor,
        server.visibility,
        normalized,
        server.planTier,
        server.maxMembers,
        server.maxPendingInvites,
        server.createdAt,
      ],
    );
    await this.addMember(server.id, normalized, 'owner', server.createdAt);
    return { ...server };
  }

  async addMember(
    serverId: string,
    email: string,
    role: ServerMemberRole,
    joinedAt: number,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO server_members (server_id, user_email, role, joined_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (server_id, user_email) DO NOTHING`,
      [serverId, email.trim().toLowerCase(), role, joinedAt],
    );
  }

  async isMember(serverId: string, email: string): Promise<boolean> {
    if (serverId === 'default') return true;
    const { rows } = await this.db.query(
      `SELECT 1 FROM server_members WHERE server_id = $1 AND user_email = $2 LIMIT 1`,
      [serverId, email.trim().toLowerCase()],
    );
    return rows.length > 0;
  }

  async countMembers(serverId: string): Promise<number> {
    const { rows } = await this.db.query(
      `SELECT COUNT(*)::int AS total FROM server_members WHERE server_id = $1`,
      [serverId],
    );
    return Number((rows[0] as { total: number } | undefined)?.total ?? 0);
  }
}

export class PgServerInviteRepository implements ServerInviteRepository {
  private readonly db: SqlClient;

  constructor(db: SqlClient) {
    this.db = db;
  }

  async listByServer(serverId: string): Promise<ServerInvite[]> {
    const { rows } = await this.db.query(
      `SELECT code, server_id, created_by, max_uses, uses, expires_at, revoked, created_at
       FROM server_invites
       WHERE server_id = $1
       ORDER BY created_at DESC`,
      [serverId],
    );
    return (rows as ServerInviteDbRow[]).map(toInvite);
  }

  async getByCode(code: string): Promise<ServerInvite | undefined> {
    const { rows } = await this.db.query(
      `SELECT code, server_id, created_by, max_uses, uses, expires_at, revoked, created_at
       FROM server_invites
       WHERE code = $1`,
      [code.trim().toUpperCase()],
    );
    const row = rows[0] as ServerInviteDbRow | undefined;
    return row ? toInvite(row) : undefined;
  }

  async create(invite: ServerInvite): Promise<ServerInvite> {
    await this.db.query(
      `INSERT INTO server_invites (code, server_id, created_by, max_uses, uses, expires_at, revoked, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        invite.code.toUpperCase(),
        invite.serverId,
        invite.createdBy,
        invite.maxUses,
        invite.uses,
        invite.expiresAt,
        invite.revoked,
        invite.createdAt,
      ],
    );
    return { ...invite };
  }

  async incrementUse(code: string): Promise<void> {
    await this.db.query(
      `UPDATE server_invites SET uses = uses + 1 WHERE code = $1`,
      [code.trim().toUpperCase()],
    );
  }

  async revoke(code: string, serverId: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE server_invites SET revoked = true WHERE code = $1 AND server_id = $2`,
      [code.trim().toUpperCase(), serverId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async listInvitedEmails(serverId: string) {
    const { rows } = await this.db.query(
      `SELECT server_id, email, invited_by, created_at
       FROM server_email_invites
       WHERE server_id = $1
       ORDER BY created_at DESC`,
      [serverId],
    );
    return (
      rows as Array<{
        server_id: string;
        email: string;
        invited_by: string;
        created_at: string | number;
      }>
    ).map((r) => ({
      serverId: r.server_id,
      email: r.email,
      invitedBy: r.invited_by,
      createdAt: Number(r.created_at),
    }));
  }

  async addInvitedEmail(
    serverId: string,
    email: string,
    invitedBy: string,
    createdAt: number,
  ) {
    await this.db.query(
      `INSERT INTO server_email_invites (server_id, email, invited_by, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (server_id, email) DO NOTHING`,
      [
        serverId,
        email.trim().toLowerCase(),
        invitedBy.trim().toLowerCase(),
        createdAt,
      ],
    );
  }

  async removeInvitedEmail(serverId: string, email: string) {
    const res = await this.db.query(
      `DELETE FROM server_email_invites WHERE server_id = $1 AND email = $2`,
      [serverId, email.trim().toLowerCase()],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async isEmailInvited(email: string) {
    const { rows } = await this.db.query(
      `SELECT 1 FROM server_email_invites WHERE LOWER(email) = $1 LIMIT 1`,
      [email.trim().toLowerCase()],
    );
    return rows.length > 0;
  }

  async invitedServersForEmail(email: string) {
    const { rows } = await this.db.query(
      `SELECT server_id FROM server_email_invites WHERE LOWER(email) = $1`,
      [email.trim().toLowerCase()],
    );
    return (rows as Array<{ server_id: string }>).map((r) => r.server_id);
  }
}
