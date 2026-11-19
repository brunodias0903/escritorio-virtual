import { z } from 'zod';
import { MapIdSchema } from './maps';

/** Cores do tampo da mesa. */
export const DESK_COLORS = [
  '#a67c52',
  '#8b5a2b',
  '#d9b38c',
  '#4a4e69',
  '#e8e8e8',
  '#2f6f6a',
] as const;

/** Cores do tapete sob a mesa. */
export const RUG_COLORS = [
  '#7a3b3b',
  '#2f4f6f',
  '#3d6b4a',
  '#6b4a7a',
  '#b5833a',
  '#444a5e',
] as const;

/** Enfeites que se pode pôr na mesa (até três). */
export const DESK_ITEMS = [
  'plant',
  'lamp',
  'mug',
  'books',
  'cactus',
  'duck',
  'headphones',
  'trophy',
] as const;
export type DeskItem = (typeof DESK_ITEMS)[number];

export const DESK_ITEM_LABELS: Record<DeskItem, string> = {
  plant: 'Planta',
  lamp: 'Luminária',
  mug: 'Caneca',
  books: 'Livros',
  cactus: 'Cacto',
  duck: 'Patinho',
  headphones: 'Fone',
  trophy: 'Troféu',
};

export const DESK_ITEM_LIMIT = 3;
export const DESK_LABEL_MAX_LENGTH = 24;

/** O computador da mesa (a mesa é individual: um só, no meio). */
export const DESK_COMPUTERS = [
  'desktop',
  'dualMonitor',
  'laptop',
  'laptopMonitor',
] as const;
export type DeskComputer = (typeof DESK_COMPUTERS)[number];

export const DESK_COMPUTER_LABELS: Record<DeskComputer, string> = {
  desktop: 'PC de mesa',
  dualMonitor: 'PC com 2 monitores',
  laptop: 'Notebook',
  laptopMonitor: 'Notebook + monitor',
};

export const DeskConfigSchema = z.object({
  color: z
    .number()
    .int()
    .min(0)
    .max(DESK_COLORS.length - 1),
  /** Índice em RUG_COLORS, ou null para ficar sem tapete. */
  rug: z
    .number()
    .int()
    .min(0)
    .max(RUG_COLORS.length - 1)
    .nullable(),
  items: z
    .array(z.enum(DESK_ITEMS))
    .max(DESK_ITEM_LIMIT)
    .refine(
      (items) => new Set(items).size === items.length,
      'Itens repetidos.',
    ),
  /** Nome na plaquinha da mesa. */
  label: z.string().trim().max(DESK_LABEL_MAX_LENGTH),
  /** O computador no meio da mesa (mesas antigas ficam com o PC de mesa). */
  computer: z.enum(DESK_COMPUTERS).default('desktop'),
  /** Bloqueada pelo dono: impede que outras pessoas entrem nos lugares da mesa. */
  locked: z.boolean().default(false),
  /** Posição personalizada da mesa (coluna e linha do tampo). `null` = posição padrão do mapa. */
  position: z
    .object({
      col: z.number().int().min(0),
      row: z.number().int().min(0),
    })
    .nullable()
    .default(null),
});
export type DeskConfig = z.infer<typeof DeskConfigSchema>;

/** Mesa recém-adotada: simples, com o nome de quem adotou na plaquinha. */
export const defaultDeskConfig = (ownerName: string): DeskConfig => ({
  color: 0,
  rug: null,
  items: ['plant'],
  label: `Mesa de ${ownerName}`.slice(0, DESK_LABEL_MAX_LENGTH),
  computer: 'desktop',
  locked: false,
  position: null,
});

export const DeskOwnerSchema = z.object({
  email: z.string(),
  name: z.string(),
  /** Cargo do dono (pode ficar em branco). */
  role: z.string().default(''),
});

/** Estado de uma mesinha: livre (`owner` nulo) ou adotada, com a decoração dela. */
export const DeskInfoSchema = z.object({
  map: MapIdSchema,
  deskId: z.string(),
  owner: DeskOwnerSchema.nullable(),
  config: DeskConfigSchema,
});
export type DeskInfo = z.infer<typeof DeskInfoSchema>;

export const deskKey = (map: string, deskId: string): string =>
  `${map}:${deskId}`;

/** Aparência de uma mesa livre. */
export const FREE_DESK_CONFIG: DeskConfig = {
  color: 0,
  rug: null,
  items: [],
  label: '',
  computer: 'desktop',
  locked: false,
  position: null,
};
