import { z } from 'zod';

export const SKIN_TONES = [
  '#ffe7d4', // Porcelana
  '#fcd7b8', // Marfim
  '#d9a066', // Amêndoa
  '#b57a4a', // Mel
  '#8a5530', // Canela
  '#5e3a22', // Cacau
  '#f5c396', // Pêssego
  '#422716', // Ébano
] as const;

export const HAIR_COLORS = [
  '#2a2630', // Preto Ébano
  '#4a3123', // Castanho Escuro
  '#784c2c', // Castanho Mel
  '#e0b14c', // Loiro Dourado
  '#b84a2c', // Ruivo Cobre
  '#8e96a3', // Grisalho
  '#3b73c4', // Azul Royal
  '#e3789b', // Rosa Sakura
  '#e6ebf2', // Branco Neve
  '#4ea37a', // Verde Menta
  '#7b62ad', // Roxo Lavanda
  '#6ab8d9', // Azul Celeste
] as const;

export const SHIRT_COLORS = [
  '#e05a52', // Coral Vibrante
  '#c46841', // Terracota
  '#e8b446', // Amarelo Mostarda
  '#59804b', // Verde-Sálvia
  '#4ea37a', // Verde Menta
  '#397f94', // Azul-Petróleo
  '#8478a6', // Lavanda Tech
  '#3a404f', // Grafite Escuro
  '#2c4670', // Azul Marinho
  '#e8edf5', // Branco Gelo
  '#eb96aa', // Rosa Pastel
  '#7a2e3d', // Vinho Bordô
] as const;

export const PANTS_COLORS = [
  '#3d5885', // Jeans Índigo
  '#252830', // Preto Urbano
  '#353a47', // Sarja Grafite
  '#b89a72', // Caqui / Chino
  '#4c6344', // Verde Militar
  '#6b323e', // Bordô
  '#688eb8', // Azul Lavado
  '#d9c5a7', // Bege Linho
] as const;

export const SHOE_COLORS = [
  '#eef2f7', // Branco Street
  '#2c303b', // Preto Clássico
  '#d64b4b', // Vermelho Skate
  '#3b73c4', // Azul Running
  '#754728', // Couro Marrom
  '#59804b', // Verde Oliva
  '#d9a136', // Mostarda Retrô
  '#6d549e', // Roxo Urbano
] as const;

/** Estilos de cabelo: 0 curto, 1 longo, 2 topete, 3 careca, 4 moicano, 5 cacheado, 6 franja, 7 coque. */
export const HAIR_STYLE_COUNT = 8;

export const HAIR_STYLE_LABELS = [
  'Repartido',
  'Ondulado',
  'Topete',
  'Careca',
  'Moicano',
  'Cacheado',
  'Franja',
  'Coque',
] as const;

export const AVATAR_BODY_STYLES = ['masculine', 'feminine', 'neutral'] as const;
export type AvatarBodyStyle = (typeof AVATAR_BODY_STYLES)[number];

export const AVATAR_BODY_STYLE_LABELS: Record<AvatarBodyStyle, string> = {
  masculine: 'Masculino',
  feminine: 'Feminino',
  neutral: 'Neutro',
};

/** Biotipos corporais: magro, médio ou gordo (mantendo a cabeça sempre no tamanho único padrão). */
export const AVATAR_BODY_SHAPES = ['slim', 'regular', 'chubby'] as const;
export type AvatarBodyShape = (typeof AVATAR_BODY_SHAPES)[number];

export const AVATAR_BODY_SHAPE_LABELS: Record<AvatarBodyShape, string> = {
  slim: 'Magro',
  regular: 'Médio',
  chubby: 'Gordo',
};

/** Estaturas do personagem: baixo, médio ou alto. */
export const AVATAR_HEIGHTS = ['short', 'average', 'tall'] as const;
export type AvatarHeight = (typeof AVATAR_HEIGHTS)[number];

export const AVATAR_HEIGHT_LABELS: Record<AvatarHeight, string> = {
  short: 'Baixo',
  average: 'Médio',
  tall: 'Alto',
};

/** Comprimento do cabelo: curto, médio (ombros) ou longo. */
export const AVATAR_HAIR_LENGTHS = ['short', 'medium', 'long'] as const;
export type AvatarHairLength = (typeof AVATAR_HAIR_LENGTHS)[number];

export const AVATAR_HAIR_LENGTH_LABELS: Record<AvatarHairLength, string> = {
  short: 'Curto',
  medium: 'Médio',
  long: 'Longo',
};

/** Expressões faciais do personagem. */
export const AVATAR_FACES = [
  'happy',
  'calm',
  'focused',
  'wink',
  'chill',
  'smirk',
] as const;
export type AvatarFace = (typeof AVATAR_FACES)[number];

export const AVATAR_FACE_LABELS: Record<AvatarFace, string> = {
  happy: 'Feliz',
  calm: 'Sereno',
  focused: 'Focado',
  wink: 'Piscadela',
  chill: 'Tranquilo',
  smirk: 'Confiante',
};

/** Opções de barba e bigode esculpidas à mão. */
export const AVATAR_BEARDS = [
  'none',
  'stubble',
  'mustache',
  'goatee',
  'short_beard',
  'full_beard',
] as const;
export type AvatarBeard = (typeof AVATAR_BEARDS)[number];

export const AVATAR_BEARD_LABELS: Record<AvatarBeard, string> = {
  none: 'Sem barba',
  stubble: 'Por fazer',
  mustache: 'Bigode',
  goatee: 'Cavanhaque',
  short_beard: 'Barba curta',
  full_beard: 'Barba cheia',
};

/** Modelos de roupa superior. */
export const AVATAR_TOPS = [
  'tshirt',
  'polo',
  'hoodie',
  'jacket',
  'shirt_tie',
  'sweater',
  'overalls',
  'striped',
] as const;
export type AvatarTop = (typeof AVATAR_TOPS)[number];

export const AVATAR_TOP_LABELS: Record<AvatarTop, string> = {
  tshirt: 'Camiseta',
  polo: 'Polo',
  hoodie: 'Moletom',
  jacket: 'Jaqueta',
  shirt_tie: 'Social + Gravata',
  sweater: 'Suéter',
  overalls: 'Jardineira',
  striped: 'Listrada',
};

/** Modelos de roupa inferior (calça, bermuda, saia). */
export const AVATAR_BOTTOMS = [
  'pants',
  'shorts',
  'cargo_shorts',
  'skirt',
] as const;
export type AvatarBottom = (typeof AVATAR_BOTTOMS)[number];

export const AVATAR_BOTTOM_LABELS: Record<AvatarBottom, string> = {
  pants: 'Calça',
  shorts: 'Bermuda',
  cargo_shorts: 'Bermuda Cargo',
  skirt: 'Saia',
};

/** Modelos de tênis e calçados. */
export const AVATAR_SHOES = [
  'sneakers',
  'high_tops',
  'running',
  'loafers',
  'boots',
  'slides',
] as const;
export type AvatarShoe = (typeof AVATAR_SHOES)[number];

export const AVATAR_SHOE_LABELS: Record<AvatarShoe, string> = {
  sneakers: 'Tênis Street',
  high_tops: 'Cano Alto',
  running: 'Tênis Corrida',
  loafers: 'Mocassim',
  boots: 'Bota',
  slides: 'Chinelo Slide',
};

export const AVATAR_ACCESSORIES = [
  'none',
  'glasses',
  'sunglasses',
  'headphones',
  'cap',
  'beanie',
  'beard',
] as const;
export type AvatarAccessory = (typeof AVATAR_ACCESSORIES)[number];

export const AVATAR_ACCESSORY_LABELS: Record<AvatarAccessory, string> = {
  none: 'Nenhum',
  glasses: 'Óculos',
  sunglasses: 'Óculos escuros',
  headphones: 'Fone de ouvido',
  cap: 'Boné',
  beanie: 'Touca',
  beard: 'Barba',
};

/** Tamanho máximo da foto de perfil em data URL (128x128 comprimida). */
export const PROFILE_PHOTO_MAX_LENGTH = 40_000;

const DATA_IMAGE_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export const AppearanceSchema = z.object({
  skin: z
    .number()
    .int()
    .min(0)
    .max(SKIN_TONES.length - 1),
  hair: z
    .number()
    .int()
    .min(0)
    .max(HAIR_COLORS.length - 1),
  style: z
    .number()
    .int()
    .min(0)
    .max(HAIR_STYLE_COUNT - 1),
  shirt: z
    .number()
    .int()
    .min(0)
    .max(SHIRT_COLORS.length - 1),
  pants: z
    .number()
    .int()
    .min(0)
    .max(PANTS_COLORS.length - 1)
    .optional(),
  shoes: z
    .number()
    .int()
    .min(0)
    .max(SHOE_COLORS.length - 1)
    .optional(),
  accessory: z.enum(AVATAR_ACCESSORIES).optional(),
  bodyStyle: z.enum(AVATAR_BODY_STYLES).optional(),
  bodyShape: z.enum(AVATAR_BODY_SHAPES).optional(),
  height: z.enum(AVATAR_HEIGHTS).optional(),
  hairLength: z.enum(AVATAR_HAIR_LENGTHS).optional(),
  face: z.enum(AVATAR_FACES).optional(),
  beard: z.enum(AVATAR_BEARDS).optional(),
  topStyle: z.enum(AVATAR_TOPS).optional(),
  bottomStyle: z.enum(AVATAR_BOTTOMS).optional(),
  shoeStyle: z.enum(AVATAR_SHOES).optional(),
  /** Foto de perfil personalizada (data URL comprimida), ou null para usar só o pixel art. */
  photo: z
    .string()
    .max(PROFILE_PHOTO_MAX_LENGTH)
    .regex(DATA_IMAGE_RE, 'Formato de imagem inválido.')
    .nullable()
    .optional(),
});
export type Appearance = z.infer<typeof AppearanceSchema>;

/** Hash simples (FNV-1a) para derivar a aparência inicial de cada pessoa. */
const hash = (text: string): number => {
  let value = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value;
};

/** Aparência estável para quem ainda não escolheu a sua. */
export const defaultAppearance = (seed: string): Appearance => {
  const h = hash(seed);
  return {
    skin: h % SKIN_TONES.length,
    hair: (h >>> 3) % HAIR_COLORS.length,
    style: (h >>> 7) % HAIR_STYLE_COUNT,
    shirt: (h >>> 11) % SHIRT_COLORS.length,
    pants: (h >>> 15) % PANTS_COLORS.length,
    accessory: 'none',
    photo: null,
  };
};

export const STATUSES = [
  'available',
  'busy',
  'away',
  'coffee',
  'lunch',
] as const;
export const StatusSchema = z.enum(STATUSES);
export type Status = z.infer<typeof StatusSchema>;

export const STATUS_LABELS: Record<Status, string> = {
  available: 'Disponível',
  busy: 'Ocupado',
  away: 'Ausente',
  coffee: 'Tomando um café',
  lunch: 'Almoçando',
};

/** Status em que a pessoa não está disponível para chamadas (ocupado, café ou almoço). */
export const isUnavailableStatus = (status: Status | undefined): boolean =>
  status === 'busy' || status === 'coffee' || status === 'lunch';

export const EMOTES = ['👋', '👍', '😂', '❤️', '🎉', '👏'] as const;
export const EmoteSchema = z.enum(EMOTES);
export type Emote = z.infer<typeof EmoteSchema>;
