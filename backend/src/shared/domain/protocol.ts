import { z } from 'zod';
import { AppearanceSchema, EmoteSchema, StatusSchema } from './appearance.js';
import { DeskConfigSchema, DeskInfoSchema } from './desks.js';
import { MapIdSchema } from './maps.js';
import { PersonSchema } from './people.js';

/** O nome que aparece é o completo (nome e sobrenome). */
export const NAME_MAX_LENGTH = 40;
export const DEFAULT_NAME = 'Anônimo';

/** Remove caracteres fora de letras, números, espaço, ".", "_" e "-" (o nickname pode ter ponto). */
export const sanitizeName = (raw: string): string =>
  raw
    .replace(/[^\p{L}\p{N} ._-]/gu, '')
    .trim()
    .slice(0, NAME_MAX_LENGTH) || DEFAULT_NAME;

export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.number().int().min(0).max(0xffffff),
  x: z.number(),
  y: z.number(),
  map: MapIdSchema,
  status: StatusSchema,
  appearance: AppearanceSchema,
  /** E-mail da pessoa: liga o avatar à mesinha que ela adotou. */
  email: z.string().optional(),
});
export type Player = z.infer<typeof PlayerSchema>;

// --- Chat -----------------------------------------------------------------------

export const DEFAULT_CHANNEL = 'geral';
/** Canais públicos criados na primeira subida (veja as migrações). */
export const SEED_CHANNELS = ['geral', 'projetos', 'aleatorio'] as const;
export const CHAT_TEXT_MAX_LENGTH = 500;
export const CHAT_HISTORY_LIMIT = 100; // mensagens carregadas por canal
export const CHANNEL_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,29}$/;

export const ChannelIdSchema = z.string().min(1).max(520);

export const ChatMessageSchema = z.object({
  id: z.string(),
  channel: ChannelIdSchema,
  authorId: z.string(),
  author: z.string(),
  color: z.number().int().min(0).max(0xffffff),
  text: z.string(),
  at: z.number(), // milissegundos desde 1970
  /** Quando é resposta, o id da mensagem que abriu a conversa. */
  threadId: z.string().optional(),
  /** E-mails das pessoas mencionadas com @. */
  mentions: z.array(z.string()).default([]),
  /** Só nas mensagens que abrem conversa: quantas respostas têm. */
  replyCount: z.number().int().min(0).default(0),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChannelInfoSchema = z.object({
  id: ChannelIdSchema,
  name: z.string(),
  kind: z.enum(['public', 'dm']),
  archived: z.boolean(),
  /** Nas conversas diretas, as duas pessoas. */
  members: z.array(z.object({ email: z.string(), name: z.string() })),
  unread: z.number().int().min(0),
  mentions: z.number().int().min(0),
});
export type ChannelInfo = z.infer<typeof ChannelInfoSchema>;

// --- Cliente -> servidor ----------------------------------------------------------

export const ClientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('join'), token: z.string().max(2048) }),
  z.object({ type: z.literal('move'), x: z.number(), y: z.number() }),
  z.object({
    type: z.literal('chat'),
    channel: ChannelIdSchema,
    text: z.string(),
    threadId: z.string().max(80).optional(),
  }),
  z.object({ type: z.literal('status'), status: StatusSchema }),
  z.object({ type: z.literal('emote'), emote: EmoteSchema }),
  z.object({ type: z.literal('appearance'), appearance: AppearanceSchema }),
  /** Pede acesso à chamada da zona onde a pessoa está. */
  z.object({ type: z.literal('media') }),
  z.object({ type: z.literal('markRead'), channel: ChannelIdSchema }),
  z.object({ type: z.literal('thread'), threadId: z.string().max(80) }),
  /** Adota a mesinha em que a pessoa está. */
  z.object({ type: z.literal('deskAdopt'), deskId: z.string().max(40) }),
  /** Devolve a mesinha (só quem adotou, ou um administrador). */
  z.object({ type: z.literal('deskRelease'), deskId: z.string().max(40) }),
  /** Muda a decoração da mesinha (só quem adotou). */
  z.object({
    type: z.literal('deskConfig'),
    deskId: z.string().max(40),
    config: DeskConfigSchema,
  }),
  /** Move a própria mesinha para outra posição livre da sala (só quem adotou). */
  z.object({
    type: z.literal('deskMove'),
    deskId: z.string().max(40),
    col: z.number().int().min(0).max(60),
    row: z.number().int().min(0).max(60),
  }),
  /** Pede a lista de canais e conversas (com não lidas). */
  z.object({ type: z.literal('channels') }),
  z.object({ type: z.literal('createChannel'), name: z.string().max(60) }),
  z.object({ type: z.literal('archiveChannel'), id: z.string().max(60) }),
  /** Abre (ou reaproveita) a conversa direta com outra pessoa. */
  z.object({ type: z.literal('openDm'), email: z.string().max(254) }),
  /** Pede a lista de pessoas para escolher com quem conversar. */
  z.object({ type: z.literal('directory') }),
  /** Pede a lista de pessoas: todas que já entraram, com o status de cada uma. */
  z.object({ type: z.literal('people') }),
]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

// --- Servidor -> cliente ----------------------------------------------------------

export const ServerMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('init'),
    id: z.string(),
    map: MapIdSchema,
    players: z.array(PlayerSchema),
  }),
  z.object({ type: z.literal('joined'), player: PlayerSchema }),
  z.object({
    type: z.literal('moved'),
    id: z.string(),
    x: z.number(),
    y: z.number(),
  }),
  z.object({ type: z.literal('left'), id: z.string() }),
  z.object({ type: z.literal('correct'), x: z.number(), y: z.number() }),
  /** Mudança de sala (porta): a nova sala, a posição e quem está nela. */
  z.object({
    type: z.literal('map'),
    map: MapIdSchema,
    x: z.number(),
    y: z.number(),
    players: z.array(PlayerSchema),
  }),
  z.object({ type: z.literal('status'), id: z.string(), status: StatusSchema }),
  z.object({ type: z.literal('emote'), id: z.string(), emote: EmoteSchema }),
  z.object({
    type: z.literal('appearance'),
    id: z.string(),
    appearance: AppearanceSchema,
  }),
  z.object({ type: z.literal('chat'), message: ChatMessageSchema }),
  z.object({
    type: z.literal('history'),
    messages: z.array(ChatMessageSchema),
  }),
  z.object({
    type: z.literal('channels'),
    channels: z.array(ChannelInfoSchema),
  }),
  z.object({
    type: z.literal('thread'),
    threadId: z.string(),
    messages: z.array(ChatMessageSchema),
  }),
  z.object({
    type: z.literal('media'),
    /** Zona de chamada em que a pessoa está (ex.: "mesa-1"). */
    zone: z.string(),
    url: z.string(),
    token: z.string(),
  }),
  /** A pessoa está na estrada (fora de qualquer zona): não há chamada. */
  z.object({ type: z.literal('mediaNone') }),
  z.object({ type: z.literal('mediaUnavailable') }),
  /** A lista de canais mudou: peça de novo com `channels`. */
  z.object({ type: z.literal('channelsChanged') }),
  z.object({ type: z.literal('channelOpened'), channel: ChannelInfoSchema }),
  z.object({
    type: z.literal('directory'),
    people: z.array(z.object({ email: z.string(), name: z.string() })),
  }),
  /** Algo que a pessoa pediu não pôde ser feito. `code` é um dos códigos de erro do app. */
  z.object({ type: z.literal('chatError'), code: z.string() }),
  /** Todas as mesinhas com dono, ao entrar. */
  z.object({ type: z.literal('desks'), desks: z.array(DeskInfoSchema) }),
  /** Uma mesinha mudou (adotada, decorada ou devolvida). */
  z.object({ type: z.literal('desk'), desk: DeskInfoSchema }),
  z.object({ type: z.literal('deskError'), code: z.string() }),
  /** A pessoa tentou entrar numa mesinha cheia. */
  z.object({ type: z.literal('zoneFull'), zone: z.string() }),
  /** A pessoa tentou entrar numa mesinha bloqueada pelo dono. */
  z.object({ type: z.literal('zoneLocked'), zone: z.string() }),
  /** Todas as pessoas que já entraram, com o status de cada uma. */
  z.object({ type: z.literal('people'), people: z.array(PersonSchema) }),
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
