import type {
  FeedbackRepository,
  ServerSettingsRepository,
} from '../../../modules/workspace/workspace.repository.js';
import {
  DEFAULT_SERVER_SETTINGS,
  type FeedbackComment,
  type FeedbackItem,
  type FeedbackStatus,
  type ServerSettings,
} from '../../../shared/domain/index.js';

export class MemoryServerSettingsRepository implements ServerSettingsRepository {
  private settings: ServerSettings = { ...DEFAULT_SERVER_SETTINGS };

  async get(): Promise<ServerSettings> {
    return { ...this.settings };
  }

  async save(settings: ServerSettings): Promise<ServerSettings> {
    this.settings = { ...settings };
    return { ...this.settings };
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
