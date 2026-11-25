import { z } from 'zod';
import { MapIdSchema } from './maps.js';

/** Cores do tampo da mesa (Paleta Corporativa Detailed Modern RPG Office). */
export const DESK_COLORS = [
  '#e1e6ef', // 0: Laca Branca / Off-White Tech
  '#754728', // 1: Nogueira Executiva
  '#cfa06e', // 2: Freixo Claro Nórdico
  '#454c5c', // 3: Stealth Grafite Escuro
  '#59804b', // 4: Verde-Sálvia Studio
  '#397f94', // 5: Azul-Petróleo Corporativo
  '#23263a', // 6: Ardósia Noite
  '#8b5a2b', // 7: Carvalho Clássico
  '#c98a8b', // 8: Terracota Suave
  '#3b4d71', // 9: Azul Marinho
] as const;

/** Cores do tapete sob a mesa. */
export const RUG_COLORS = [
  '#59804b', // Verde-Sálvia
  '#397f94', // Azul-Petróleo
  '#42526b', // Azul-Ardósia
  '#8478a6', // Lavanda Corporativo
  '#b5833a', // Âmbar / Ocre
  '#454c5c', // Grafite
  '#7a3b3b', // Bordô
  '#9e4b3a', // Terracota
  '#26293d', // Marinho Profundo
  '#dfd0b8', // Marfim Claro
] as const;

/** Cores da cadeira executiva da mesa. */
export const CHAIR_COLORS = [
  '#397f94', // Azul-Petróleo (Padrão Ref 4)
  '#2d313b', // Grafite Preto
  '#59804b', // Verde-Sálvia
  '#8478a6', // Lavanda
  '#e05a52', // Coral
  '#cc962b', // Mostarda / Âmbar
  '#42526b', // Azul-Ardósia
  '#e1e6ef', // Off-White
] as const;

/** Estilo visual do tapete sob a mesa. */
export const RUG_PATTERNS = ['bordered', 'solid', 'striped'] as const;
export type RugPattern = (typeof RUG_PATTERNS)[number];

export const RUG_PATTERN_LABELS: Record<RugPattern, string> = {
  bordered: 'Moldura Ornamental',
  solid: 'Liso',
  striped: 'Listrado',
};

/**
 * Enfeites que se pode pôr na mesa (até quatro) — Tag: `desk-decor`.
 * Inclui os 14 originais + 10 novos enfeites do Atlas `.Art`.
 */
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
  'bonsai',
  'hourglass',
  'figure',
  'fan',
  'notebook',
  'lavaLamp',
  'teapot',
  'camera',
  'clock',
  'rubik',
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
  bonsai: 'Bonsai',
  hourglass: 'Ampulheta',
  figure: 'Robô Geek',
  fan: 'Ventilador',
  notebook: 'Moleskine',
  lavaLamp: 'Lava Lamp',
  teapot: 'Bule de Chá',
  camera: 'Câmera Retrô',
  clock: 'Despertador',
  rubik: 'Cubo Mágico',
};

/** Tags de categorização dos itens de decoração de mesa (`tag: 'desk-decor'`). */
export const DESK_DECOR_TAG = 'desk-decor';

export const DESK_ITEM_TAGS: Record<DeskItem, readonly string[]> = {
  plant: ['desk-decor', 'desk-item', 'nature', 'core-14'],
  lamp: ['desk-decor', 'desk-item', 'lighting', 'core-14'],
  mug: ['desk-decor', 'desk-item', 'food-drink', 'core-14'],
  books: ['desk-decor', 'desk-item', 'stationery', 'core-14'],
  cactus: ['desk-decor', 'desk-item', 'nature', 'core-14'],
  duck: ['desk-decor', 'desk-item', 'geek', 'core-14'],
  headphones: ['desk-decor', 'desk-item', 'audio', 'core-14'],
  trophy: ['desk-decor', 'desk-item', 'award', 'core-14'],
  cat: ['desk-decor', 'desk-item', 'pet', 'core-14'],
  mic: ['desk-decor', 'desk-item', 'audio', 'core-14'],
  controller: ['desk-decor', 'desk-item', 'geek', 'core-14'],
  globe: ['desk-decor', 'desk-item', 'scholar', 'core-14'],
  coffee: ['desk-decor', 'desk-item', 'food-drink', 'core-14'],
  frame: ['desk-decor', 'desk-item', 'personal', 'core-14'],
  bonsai: ['desk-decor', 'desk-item', 'nature', 'extra'],
  hourglass: ['desk-decor', 'desk-item', 'productivity', 'extra'],
  figure: ['desk-decor', 'desk-item', 'geek', 'extra'],
  fan: ['desk-decor', 'desk-item', 'gadget', 'extra'],
  notebook: ['desk-decor', 'desk-item', 'stationery', 'extra'],
  lavaLamp: ['desk-decor', 'desk-item', 'lighting', 'extra'],
  teapot: ['desk-decor', 'desk-item', 'food-drink', 'extra'],
  camera: ['desk-decor', 'desk-item', 'personal', 'extra'],
  clock: ['desk-decor', 'desk-item', 'productivity', 'extra'],
  rubik: ['desk-decor', 'desk-item', 'geek', 'extra'],
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
  color: 1,
  rug: null,
  rugPattern: 'bordered',
  chair: 0,
  items: [],
  label: '',
  computer: 'desktop',
  locked: false,
  position: null,
};
