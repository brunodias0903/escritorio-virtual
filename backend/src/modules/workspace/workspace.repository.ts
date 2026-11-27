import type {
  FeedbackComment,
  FeedbackItem,
  FeedbackStatus,
  ServerInvite,
  ServerMemberRole,
  ServerSettings,
  WorkspaceServer,
} from '../../shared/domain/index.js';

export interface ServerSettingsRepository {
  get(serverId?: string): Promise<ServerSettings>;
  save(
    settings: ServerSettings,
    updatedBy: string,
    serverId?: string,
  ): Promise<ServerSettings>;
}

export interface ServerRepository {
  listForUser(email: string): Promise<WorkspaceServer[]>;
  get(id: string): Promise<WorkspaceServer | undefined>;
  create(server: WorkspaceServer, ownerEmail: string): Promise<WorkspaceServer>;
  update?(
    id: string,
    patch: { name?: string; description?: string; accentColor?: string },
  ): Promise<WorkspaceServer | undefined>;
  addMember(
    serverId: string,
    email: string,
    role: ServerMemberRole,
    joinedAt: number,
  ): Promise<void>;
  isMember(serverId: string, email: string): Promise<boolean>;
  countMembers(serverId: string): Promise<number>;
}

export type InvitedEmailEntry = {
  serverId: string;
  email: string;
  invitedBy: string;
  createdAt: number;
};

export interface ServerInviteRepository {
  listByServer(serverId: string): Promise<ServerInvite[]>;
  getByCode(code: string): Promise<ServerInvite | undefined>;
  create(invite: ServerInvite): Promise<ServerInvite>;
  incrementUse(code: string): Promise<void>;
  revoke(code: string, serverId: string): Promise<boolean>;
  listInvitedEmails?(serverId: string): Promise<InvitedEmailEntry[]>;
  addInvitedEmail?(
    serverId: string,
    email: string,
    invitedBy: string,
    createdAt: number,
  ): Promise<void>;
  removeInvitedEmail?(serverId: string, email: string): Promise<boolean>;
  isEmailInvited?(email: string): Promise<boolean>;
  invitedServersForEmail?(email: string): Promise<string[]>;
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
