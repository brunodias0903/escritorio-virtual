import { z } from 'zod';
import { ACCOUNT_TIERS, type AccountTier } from './auth';

// --- Permissões por tier ------------------------------------------------------

export const canManageServer = (tier: AccountTier): boolean =>
  tier === 'master' || tier === 'admin';

/** Tiers que podem visualizar o link de MR/PR em itens de feedback. */
export const canSeeFeedbackMr = (tier: AccountTier): boolean =>
  tier === 'master' ||
  tier === 'admin' ||
  tier === 'developer' ||
  tier === 'tester';

/** Tiers que podem vincular/editar um link de MR/PR em um item de feedback. */
export const canAttachFeedbackMr = (tier: AccountTier): boolean =>
  tier === 'master' || tier === 'admin' || tier === 'developer';

/** Tiers que podem marcar uma solicitação como concluída, fechada ou reaberta. */
export const canResolveFeedback = (tier: AccountTier): boolean =>
  tier === 'master' || tier === 'admin' || tier === 'tester';

/** Tiers que podem mover uma solicitação para em progresso ou em teste. */
export const canProgressFeedback = (tier: AccountTier): boolean =>
  tier === 'master' ||
  tier === 'admin' ||
  tier === 'developer' ||
  tier === 'tester';

export const canWriteInChannel = (
  writeTiers: readonly AccountTier[] | undefined,
  tier: AccountTier,
): boolean => {
  if (tier === 'master') return true;
  if (!writeTiers || writeTiers.length === 0) return true;
  return writeTiers.includes(tier);
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

export const UpdateChannelConfigSchema = z.object({
  topic: z.string().trim().max(160).optional(),
  writeTiers: z.array(z.enum(ACCOUNT_TIERS)).min(1).optional(),
  archived: z.boolean().optional(),
});
export type UpdateChannelConfig = z.infer<typeof UpdateChannelConfigSchema>;

export const CreateChannelConfigSchema = z.object({
  name: z.string().trim().min(2).max(30),
  topic: z.string().trim().max(160).default(''),
  writeTiers: z
    .array(z.enum(ACCOUNT_TIERS))
    .min(1)
    .default([...ACCOUNT_TIERS]),
});
export type CreateChannelConfig = z.infer<typeof CreateChannelConfigSchema>;

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
