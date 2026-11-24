import type {
  FeedbackRepository,
  ServerSettingsRepository,
} from '../../../modules/workspace/workspace.repository.js';
import {
  DEFAULT_SERVER_SETTINGS,
  type AccountTier,
  type FeedbackComment,
  type FeedbackItem,
  type FeedbackKind,
  type FeedbackStatus,
  type ServerSettings,
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
        `SELECT id, kind, title, description, status, author_email, author_name, mr_url, created_at, updated_at, updated_by
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
      `SELECT id, kind, title, description, status, author_email, author_name, mr_url, created_at, updated_at, updated_by
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
    await this.db.query(
      `INSERT INTO feedback_items (id, kind, title, description, status, author_email, author_name, mr_url, created_at, updated_at, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        item.id,
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
