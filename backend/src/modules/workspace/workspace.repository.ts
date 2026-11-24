import type {
  FeedbackComment,
  FeedbackItem,
  FeedbackStatus,
  ServerSettings,
} from '../../shared/domain/index.js';

export interface ServerSettingsRepository {
  get(): Promise<ServerSettings>;
  save(settings: ServerSettings, updatedBy: string): Promise<ServerSettings>;
}

export interface FeedbackRepository {
  list(): Promise<FeedbackItem[]>;
  get(id: string): Promise<FeedbackItem | undefined>;
  create(item: FeedbackItem): Promise<void>;
  update(
    id: string,
    patch: {
      status?: FeedbackStatus;
      mrUrl?: string | null;
      updatedAt: number;
      updatedBy: string;
    },
  ): Promise<FeedbackItem | undefined>;
  addComment(comment: FeedbackComment): Promise<void>;
}
