import { z } from 'zod';

export const SKIN_TONES = [
  '#ffdfc4',
  '#f0c8a0',
  '#d9a066',
  '#b57a4a',
  '#8a5530',
  '#5e3a22',
  '#ffe8d6',
  '#422716',
] as const;

export const HAIR_COLORS = [
  '#2b1b10',
  '#5a3a1a',
  '#a0522d',
  '#d9a441',
  '#c0392b',
  '#8e8e93',
  '#3b5bdb',
  '#f06292',
  '#eceff4',
  '#20c997',
  '#845ef7',
  '#15aabf',
] as const;

export const SHIRT_COLORS = [
  '#e74c3c',
  '#e67e22',
  '#f1c40f',
  '#2ecc71',
  '#1abc9c',
  '#3498db',
  '#9b59b6',
  '#34495e',
  '#1f2438',
  '#ecf0f1',
  '#ff6b81',
  '#5b6cff',
] as const;

export const PANTS_COLORS = [
  '#3c4c84',
  '#232736',
  '#4e5468',
  '#a68a64',
  '#3b5e47',
  '#6b2d3c',
  '#273c75',
  '#cfd4e0',
] as const;

/** Estilos de cabelo: 0 curto, 1 longo, 2 topete, 3 careca, 4 moicano, 5 cacheado, 6 franja, 7 coque. */
export const HAIR_STYLE_COUNT = 8;

export const HAIR_STYLE_LABELS = [
  'Curto',
  'Longo',
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
  accessory: z.enum(AVATAR_ACCESSORIES).optional(),
  bodyStyle: z.enum(AVATAR_BODY_STYLES).optional(),
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

export const STATUSES = ['available', 'busy', 'away'] as const;
export const StatusSchema = z.enum(STATUSES);
export type Status = z.infer<typeof StatusSchema>;

export const STATUS_LABELS: Record<Status, string> = {
  available: 'Disponível',
  busy: 'Ocupado',
  away: 'Ausente',
};

export const EMOTES = ['👋', '👍', '😂', '❤️', '🎉', '👏'] as const;
export const EmoteSchema = z.enum(EMOTES);
export type Emote = z.infer<typeof EmoteSchema>;
