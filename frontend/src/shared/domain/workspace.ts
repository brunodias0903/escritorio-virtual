import { z } from 'zod';
import { ACCOUNT_TIERS, normalizeEmail, type AccountTier } from './auth';

// --- Permissões por tier (aceita 1 tier ou lista de tiers: principal + secundários) ---

export type TierInput = AccountTier | readonly AccountTier[];

const asTiers = (input: TierInput): readonly AccountTier[] =>
  typeof input === 'string' ? [input] : input;

const hasAnyTier = (
  input: TierInput,
  allowed: readonly AccountTier[],
): boolean => asTiers(input).some((t) => allowed.includes(t));

export const canCreateServer = (tiers: TierInput): boolean =>
  hasAnyTier(tiers, ['master']);

export const canManageServer = (tiers: TierInput): boolean =>
  hasAnyTier(tiers, ['master', 'admin']);

/** Apenas a conta master pode moderar contas (banir, kickar, restringir, remover). */
export const canModerateAccounts = (tiers: TierInput): boolean =>
  hasAnyTier(tiers, ['master']);

/** Master e administradores podem manipular acessos e cargos no painel administrativo. */
export const canManageMembers = (tiers: TierInput): boolean =>
  hasAnyTier(tiers, ['master', 'admin']);

/** Master e administradores podem remover/devolver mesas de outros usuários. */
export const canManageDesks = (tiers: TierInput): boolean =>
  hasAnyTier(tiers, ['master', 'admin']);

/** Tiers que podem visualizar o link de MR/PR em itens de feedback. */
export const canSeeFeedbackMr = (tiers: TierInput): boolean =>
  hasAnyTier(tiers, ['master', 'admin', 'developer', 'tester']);

/** Tiers que podem vincular/editar um link de MR/PR em um item de feedback. */
export const canAttachFeedbackMr = (tiers: TierInput): boolean =>
  hasAnyTier(tiers, ['master', 'admin', 'developer']);

/** Tiers que podem marcar uma solicitação como concluída, fechada ou reaberta. */
export const canResolveFeedback = (tiers: TierInput): boolean =>
  hasAnyTier(tiers, ['master', 'admin', 'tester']);

/** Tiers que podem mover uma solicitação para em progresso ou em teste. */
export const canProgressFeedback = (tiers: TierInput): boolean =>
  hasAnyTier(tiers, ['master', 'admin', 'developer', 'tester']);

export type ChannelAccess = {
  viewTiers?: readonly AccountTier[];
  writeTiers?: readonly AccountTier[];
  allowedEmails?: readonly string[];
  blockedEmails?: readonly string[];
};

export const canViewChannel = (
  access: Pick<ChannelAccess, 'viewTiers' | 'allowedEmails' | 'blockedEmails'>,
  tiers: TierInput,
  email?: string,
): boolean => {
  const list = asTiers(tiers);
  if (list.includes('master')) return true;
  const normalized = email ? normalizeEmail(email) : null;
  if (normalized && access.blockedEmails?.includes(normalized)) return false;
  if (normalized && access.allowedEmails?.includes(normalized)) return true;
  if (!access.viewTiers || access.viewTiers.length === 0) return true;
  return list.some((t) => access.viewTiers!.includes(t));
};

export const canWriteInChannel = (
  writeTiers: readonly AccountTier[] | undefined,
  tiers: TierInput,
  access?: Pick<ChannelAccess, 'viewTiers' | 'allowedEmails' | 'blockedEmails'>,
  email?: string,
): boolean => {
  if (access && !canViewChannel(access, tiers, email)) return false;
  const list = asTiers(tiers);
  if (list.includes('master')) return true;
  if (!writeTiers || writeTiers.length === 0) return true;
  if (
    email &&
    access?.allowedEmails?.includes(normalizeEmail(email)) &&
    access.viewTiers &&
    access.viewTiers.every((t) => writeTiers.includes(t))
  ) {
    return true;
  }
  return list.some((t) => writeTiers.includes(t));
};

// --- Configurações do servidor ------------------------------------------------

const IconDataUrlSchema = z
  .string()
  .max(45_000, 'Imagem muito grande.')
  .refine(
    (v) => v.startsWith('data:image/'),
    'A imagem deve ser um data URL válido.',
  );

export const ServerSettingsSchema = z.object({
  name: z.string().trim().min(1).max(40).default('Setter'),
  description: z.string().trim().max(240).default(''),
  icon: IconDataUrlSchema.nullable().default(null),
  welcomeMessage: z.string().trim().max(280).default(''),
  allowPublicRegistration: z.boolean().default(true),
  updatedAt: z.number().default(0),
});
export type ServerSettings = z.infer<typeof ServerSettingsSchema>;

export const DEFAULT_SERVER_SETTINGS: ServerSettings = {
  name: 'Setter',
  description: 'Escritório virtual interativo da equipe',
  icon: null,
  welcomeMessage: '',
  allowPublicRegistration: true,
  updatedAt: 0,
};

export const UpdateServerSettingsSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do servidor.').max(40),
  description: z.string().trim().max(240).default(''),
  icon: IconDataUrlSchema.nullable().optional(),
  welcomeMessage: z.string().trim().max(280).default(''),
  allowPublicRegistration: z.boolean().default(true),
});
export type UpdateServerSettings = z.infer<typeof UpdateServerSettingsSchema>;

const EmailListSchema = z.array(z.string().trim().email().max(254)).max(200);

export const UpdateChannelConfigSchema = z.object({
  topic: z.string().trim().max(160).optional(),
  viewTiers: z.array(z.enum(ACCOUNT_TIERS)).min(1).optional(),
  writeTiers: z.array(z.enum(ACCOUNT_TIERS)).min(1).optional(),
  allowedEmails: EmailListSchema.optional(),
  blockedEmails: EmailListSchema.optional(),
  archived: z.boolean().optional(),
});
export type UpdateChannelConfig = z.infer<typeof UpdateChannelConfigSchema>;

export const CreateChannelConfigSchema = z.object({
  name: z.string().trim().min(2).max(30),
  topic: z.string().trim().max(160).default(''),
  viewTiers: z
    .array(z.enum(ACCOUNT_TIERS))
    .min(1)
    .default([...ACCOUNT_TIERS]),
  writeTiers: z
    .array(z.enum(ACCOUNT_TIERS))
    .min(1)
    .default([...ACCOUNT_TIERS]),
  allowedEmails: EmailListSchema.default([]),
  blockedEmails: EmailListSchema.default([]),
});
export type CreateChannelConfig = z.infer<typeof CreateChannelConfigSchema>;

export const ReorderChannelsSchema = z.object({
  channelIds: z.array(z.string().trim().min(1).max(60)).min(1).max(200),
});
export type ReorderChannels = z.infer<typeof ReorderChannelsSchema>;

// --- Central de feedback / sugestões / bugs -----------------------------------

export const FEEDBACK_KINDS = [
  'suggestion',
  'bug',
  'complaint',
  'question',
] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_STATUSES = [
  'open',
  'in_progress',
  'testing',
  'done',
  'closed',
] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

const HttpUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => /^https?:\/\/\S+$/i.test(v),
    'Informe uma URL válida começando com http:// ou https://.',
  );

export const FeedbackCommentSchema = z.object({
  id: z.string(),
  feedbackId: z.string(),
  authorEmail: z.string(),
  authorName: z.string(),
  authorTier: z.enum(ACCOUNT_TIERS).default('tester'),
  body: z.string(),
  createdAt: z.number(),
});
export type FeedbackComment = z.infer<typeof FeedbackCommentSchema>;

export const FeedbackItemSchema = z.object({
  id: z.string(),
  /** Tag sequencial estilo Jira (ex.: EV-12) para referenciar em branches e MRs. */
  ticketKey: z.string().optional(),
  kind: z.enum(FEEDBACK_KINDS),
  title: z.string(),
  description: z.string(),
  status: z.enum(FEEDBACK_STATUSES),
  authorEmail: z.string(),
  authorName: z.string(),
  /** Enviado apenas para master, admin, developer e tester. */
  mrUrl: z.string().nullable().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  updatedBy: z.string().nullable().optional(),
  comments: z.array(FeedbackCommentSchema).default([]),
});
export type FeedbackItem = z.infer<typeof FeedbackItemSchema>;

const BRANCH_PREFIX_BY_KIND: Record<FeedbackKind, string> = {
  bug: 'bugfix',
  suggestion: 'feat',
  complaint: 'fix',
  question: 'chore',
};

const BRANCH_STOPWORDS = new Set([
  'a',
  'o',
  'as',
  'os',
  'um',
  'uma',
  'de',
  'da',
  'do',
  'das',
  'dos',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'para',
  'pra',
  'por',
  'com',
  'sem',
  'que',
  'ao',
  'aos',
  'se',
  'quando',
  'como',
  'mais',
  'muito',
  'modo',
  'parte',
  'clicar',
  'usar',
  'fazer',
  'ficar',
  'estar',
  'ter',
  'cheia',
]);

const BRANCH_PT_EN: Record<string, string> = {
  erro: 'error',
  falha: 'failure',
  barra: 'sidebar',
  lateral: 'sidebar',
  sair: 'exit',
  fechar: 'close',
  abrir: 'open',
  tela: 'screen',
  chamada: 'call',
  camera: 'camera',
  webcam: 'camera',
  microfone: 'mic',
  audio: 'audio',
  som: 'sound',
  mesa: 'desk',
  conversa: 'chat',
  mensagem: 'message',
  mensagens: 'messages',
  notificacao: 'notifications',
  notificacoes: 'notifications',
  tema: 'theme',
  conta: 'account',
  perfil: 'profile',
  entrar: 'login',
  senha: 'password',
  lentidao: 'slowness',
  lento: 'slow',
  duvida: 'question',
  ajuste: 'tweak',
  melhoria: 'improve',
  adicionar: 'add',
  novo: 'new',
  nova: 'new',
  remover: 'remove',
  apagar: 'delete',
  excluir: 'delete',
  editar: 'edit',
  lista: 'list',
  convite: 'invite',
  servidor: 'server',
  canal: 'channel',
  canais: 'channels',
  botao: 'button',
};

/** Gera o nome de branch curto em inglês com a tag do ticket (ex.: bugfix/ev-12-sidebar). */
export function suggestedFeedbackBranch(item: {
  id: string;
  ticketKey?: string | null;
  kind: FeedbackKind;
  title: string;
}): string {
  const prefix = BRANCH_PREFIX_BY_KIND[item.kind];
  const tag = (item.ticketKey?.trim() || `EV-${item.id.slice(0, 6)}`)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-');
  const words = item.title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w && !BRANCH_STOPWORDS.has(w))
    .map((w) => BRANCH_PT_EN[w] ?? w);

  const unique: string[] = [];
  for (const w of words) {
    if (!unique.includes(w)) unique.push(w);
    if (unique.length >= 3) break;
  }

  let slug = '';
  for (const w of unique) {
    const next = slug ? `${slug}-${w}` : w;
    if (next.length > 20) break;
    slug = next;
  }
  return slug ? `${prefix}/${tag}-${slug}` : `${prefix}/${tag}`;
}

export const CreateFeedbackSchema = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  title: z.string().trim().min(3, 'Escreva um título curto.').max(120),
  description: z.string().trim().min(5, 'Descreva com detalhes.').max(2000),
});
export type CreateFeedback = z.infer<typeof CreateFeedbackSchema>;

export const UpdateFeedbackSchema = z.object({
  status: z.enum(FEEDBACK_STATUSES).optional(),
  mrUrl: z.union([HttpUrlSchema, z.literal(''), z.null()]).optional(),
});
export type UpdateFeedback = z.infer<typeof UpdateFeedbackSchema>;

export const CreateFeedbackCommentSchema = z.object({
  body: z.string().trim().min(1, 'Escreva uma resposta.').max(1000),
});
export type CreateFeedbackComment = z.infer<typeof CreateFeedbackCommentSchema>;

// --- Moderação de contas e mesas (Master) -------------------------------------

export const MODERATION_ACTIONS = [
  'ban',
  'unban',
  'kick',
  'restrict',
  'unrestrict',
  'remove',
] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

export const ManagedAccountDeskSchema = z.object({
  map: z.string(),
  deskId: z.string(),
  label: z.string(),
});
export type ManagedAccountDesk = z.infer<typeof ManagedAccountDeskSchema>;

export const ManagedAccountSchema = z.object({
  email: z.string(),
  fullName: z.string(),
  nickname: z.string(),
  role: z.string(),
  tier: z.enum(ACCOUNT_TIERS),
  secondaryTiers: z.array(z.enum(ACCOUNT_TIERS)).default([]),
  online: z.boolean().default(false),
  status: z
    .enum(['available', 'busy', 'away', 'coffee', 'lunch', 'offline'])
    .default('offline'),
  map: z.string().nullable().default(null),
  bannedAt: z.number().nullable().default(null),
  banReason: z.string().default(''),
  restrictedUntil: z.number().nullable().default(null),
  restrictionReason: z.string().default(''),
  desk: ManagedAccountDeskSchema.nullable().default(null),
  createdAt: z.number(),
});
export type ManagedAccount = z.infer<typeof ManagedAccountSchema>;

export const UpdateAccountRolesSchema = z.object({
  /** Cargo principal (destaque e cor principal da conta). */
  tier: z.enum(ACCOUNT_TIERS),
  /** Cargos secundários (somam permissões e badges, estilo Discord). */
  secondaryTiers: z
    .array(z.enum(ACCOUNT_TIERS))
    .max(ACCOUNT_TIERS.length)
    .default([]),
  /** Cargo / função exibido no perfil e na mesa (opcional). */
  role: z.string().trim().max(60).optional(),
});
export type UpdateAccountRoles = z.infer<typeof UpdateAccountRolesSchema>;

export const ModerateAccountSchema = z.object({
  action: z.enum(MODERATION_ACTIONS),
  reason: z.string().trim().max(200).optional(),
  /** Duração da restrição em minutos (apenas para action = 'restrict'; padrão 60 min). */
  durationMinutes: z.number().int().min(1).max(43_200).optional(),
});
export type ModerateAccount = z.infer<typeof ModerateAccountSchema>;

export const ModerateAccountResponseSchema = z.object({
  email: z.string(),
  action: z.enum(MODERATION_ACTIONS),
  deskReleased: z.boolean(),
  account: ManagedAccountSchema.nullable(),
});
export type ModerateAccountResponse = z.infer<
  typeof ModerateAccountResponseSchema
>;

// --- Multi-servidor e Convites (Fase 3) -------------------------------------

export const SERVER_VISIBILITIES = ['invite', 'open'] as const;
export type ServerVisibility = (typeof SERVER_VISIBILITIES)[number];

export const SERVER_MEMBER_ROLES = ['owner', 'admin', 'member'] as const;
export type ServerMemberRole = (typeof SERVER_MEMBER_ROLES)[number];

export const SERVER_PLAN_TIERS = [
  'free',
  'starter',
  'intermediate',
  'pro',
  'unlimited',
] as const;
export type ServerPlanTier = (typeof SERVER_PLAN_TIERS)[number];

export const WorkspaceServerSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(2).max(40),
  description: z.string().trim().max(160).default(''),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#5b6cff'),
  visibility: z.enum(SERVER_VISIBILITIES).default('invite'),
  ownerEmail: z.string(),
  planTier: z.enum(SERVER_PLAN_TIERS).default('starter'),
  maxMembers: z.number().int().min(1).nullable().default(null),
  maxPendingInvites: z.number().int().min(1).nullable().default(null),
  createdAt: z.number(),
});
export type WorkspaceServer = z.infer<typeof WorkspaceServerSchema>;

export const CreateServerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Informe um nome com pelo menos 2 caracteres.')
    .max(40, 'O nome do servidor deve ter no máximo 40 caracteres.'),
  description: z.string().trim().max(160).optional().default(''),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .default('#5b6cff'),
  visibility: z.enum(SERVER_VISIBILITIES).optional().default('invite'),
});
export type CreateServerInput = z.infer<typeof CreateServerSchema>;

export const ServerInviteSchema = z.object({
  code: z.string(),
  serverId: z.string(),
  createdBy: z.string(),
  maxUses: z.number().int().min(1).nullable(),
  uses: z.number().int().min(0),
  expiresAt: z.number().nullable(),
  revoked: z.boolean(),
  createdAt: z.number(),
});
export type ServerInvite = z.infer<typeof ServerInviteSchema>;

export const CreateServerInviteSchema = z.object({
  maxUses: z.number().int().min(1).max(500).nullable().optional().default(null),
  expiresInHours: z
    .number()
    .int()
    .min(1)
    .max(720)
    .nullable()
    .optional()
    .default(168),
});
export type CreateServerInviteInput = z.infer<typeof CreateServerInviteSchema>;

export const JoinServerInviteSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4, 'Informe um código de convite válido.')
    .max(64),
});
export type JoinServerInviteInput = z.infer<typeof JoinServerInviteSchema>;
