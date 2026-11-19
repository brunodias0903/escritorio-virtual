import { z } from 'zod';

export const SKIN_TONES = [
  '#ffdfc4',
  '#f0c8a0',
  '#d9a066',
  '#b57a4a',
  '#8a5530',
  '#5e3a22',
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
] as const;

/** Estilos de cabelo: 0 curto, 1 longo, 2 topete, 3 careca. */
export const HAIR_STYLE_COUNT = 4;

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
