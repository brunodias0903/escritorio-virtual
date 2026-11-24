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
  '#23263a',
  '#5c3a21',
  '#c98a8b',
  '#3b4d71',
] as const;

/** Cores do tapete sob a mesa. */
export const RUG_COLORS = [
  '#7a3b3b',
  '#2f4f6f',
  '#3d6b4a',
  '#6b4a7a',
  '#b5833a',
  '#444a5e',
  '#236468',
  '#9e4b3a',
  '#26293d',
  '#7f6a93',
] as const;

/** Cores da cadeira da mesa. */
export const CHAIR_COLORS = [
  '#4a4e80',
  '#25283a',
  '#2d7d9a',
  '#1f8a70',
  '#b83b5e',
  '#c88a2e',
  '#7b5ea7',
  '#d6d9e6',
] as const;

/** Estilo visual do tapete sob a mesa. */
export const RUG_PATTERNS = ['bordered', 'solid', 'striped'] as const;
export type RugPattern = (typeof RUG_PATTERNS)[number];

export const RUG_PATTERN_LABELS: Record<RugPattern, string> = {
  bordered: 'Com borda',
  solid: 'Liso',
  striped: 'Listrado',
};

/** Enfeites que se pode pôr na mesa (até quatro). */
export const DESK_ITEMS = [
  'plant',
  'lamp',
  'mug',
  'books',
  'cactus',
  'duck',
  'headphones',
  'trophy',
  'cat',
  'mic',
  'controller',
  'globe',
  'coffee',
  'frame',
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
  cat: 'Gatinho',
  mic: 'Microfone',
  controller: 'Controle',
  globe: 'Globo',
  coffee: 'Café',
  frame: 'Quadro',
};

export const DESK_ITEM_LIMIT = 4;
export const DESK_LABEL_MAX_LENGTH = 24;

/** O computador da mesa (a mesa é individual: um só, no meio). */
export const DESK_COMPUTERS = [
  'desktop',
  'dualMonitor',
  'ultrawide',
  'tripleMonitor',
  'laptop',
  'laptopMonitor',
] as const;
export type DeskComputer = (typeof DESK_COMPUTERS)[number];

export const DESK_COMPUTER_LABELS: Record<DeskComputer, string> = {
  desktop: 'PC de mesa',
  dualMonitor: '2 monitores',
  ultrawide: 'Ultrawide',
  tripleMonitor: '3 monitores',
  laptop: 'Notebook',
  laptopMonitor: 'Notebook + monitor',
};

/** Tipo de máquina na mesa: desktop (com gabinete em cima da mesa) ou notebook. */
export const DESK_MACHINES = ['desktop', 'laptop'] as const;
export type DeskMachine = (typeof DESK_MACHINES)[number];

export const DESK_MACHINE_LABELS: Record<DeskMachine, string> = {
  desktop: 'Desktop (com gabinete)',
  laptop: 'Notebook',
};

/** Tipo e quantidade de monitores na mesa. */
export const DESK_MONITORS = [
  'none',
  'single',
  'dual',
  'ultrawide',
  'triple',
] as const;
export type DeskMonitor = (typeof DESK_MONITORS)[number];

export const DESK_MONITOR_LABELS: Record<DeskMonitor, string> = {
  none: 'Sem monitor extra',
  single: '1 monitor',
  dual: '2 monitores',
  ultrawide: 'Ultrawide',
  triple: '3 monitores',
};

/** Resolve máquina e monitor a partir da configuração (compatível com mesas antigas). */
export const resolveDeskSetup = (
  config: Pick<DeskConfig, 'computer' | 'machine' | 'monitor'>,
): { machine: DeskMachine; monitor: DeskMonitor } => {
  if (config.machine && config.monitor) {
    return {
      machine: config.machine,
      monitor:
        config.machine === 'desktop' && config.monitor === 'none'
          ? 'single'
          : config.monitor,
    };
  }
  switch (config.computer) {
    case 'dualMonitor':
      return { machine: 'desktop', monitor: 'dual' };
    case 'ultrawide':
      return { machine: 'desktop', monitor: 'ultrawide' };
    case 'tripleMonitor':
      return { machine: 'desktop', monitor: 'triple' };
    case 'laptop':
      return { machine: 'laptop', monitor: 'none' };
    case 'laptopMonitor':
      return { machine: 'laptop', monitor: 'single' };
    default:
      return { machine: 'desktop', monitor: 'single' };
  }
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
  /** Estilo do tapete (mesas antigas mantêm com borda). */
  rugPattern: z.enum(RUG_PATTERNS).optional(),
  /** Índice em CHAIR_COLORS para a cor da cadeira. */
  chair: z
    .number()
    .int()
    .min(0)
    .max(CHAIR_COLORS.length - 1)
    .optional(),
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
  /** Máquina escolhida separadamente (desktop ou notebook). */
  machine: z.enum(DESK_MACHINES).optional(),
  /** Configuração de monitor(es) escolhida separadamente. */
  monitor: z.enum(DESK_MONITORS).optional(),
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
  rugPattern: 'bordered',
  chair: 0,
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
  rugPattern: 'bordered',
  chair: 0,
  items: [],
  label: '',
  computer: 'desktop',
  locked: false,
  position: null,
};
