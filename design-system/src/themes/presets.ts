export type ThemePresetId =
  | 'default'
  | 'games'
  | 'fantasy'
  | 'scifi'
  | 'violet'
  | 'emerald'
  | 'sapphire'
  | 'sunset'
  | 'amethyst'
  | 'rose'
  | 'monochrome';

export type ThemeMode = 'light' | 'dark';

export type ThemeColors = {
  /** Cor da barra fina lateral (rail). */
  rail: string;
  /** Cor principal dos painéis e menus. */
  surface: string;
  /** Cor de destaque principal (botões, bordas ativas, links). */
  accent: string;
  /** Cor de presença/online e indicadores positivos. */
  presence: string;
};

export type ThemePreset = {
  id: ThemePresetId;
  name: string;
  subtitle: string;
  badge: string;
  colors: ThemeColors;
  surfaceElevated: string;
  bar: string;
  control: string;
  input: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  serverGradient: string;
};

export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    id: 'default',
    name: 'Cósmico (Padrão)',
    subtitle: 'Índigo profundo com destaque violeta e verde-água.',
    badge: '✨',
    colors: {
      rail: '#0d102c',
      surface: '#1f1f36',
      accent: '#5b6cff',
      presence: '#31e0c1',
    },
    surfaceElevated: '#161a3d',
    bar: '#12163a',
    control: '#1d2250',
    input: '#2a2a45',
    border: '#2b3166',
    textPrimary: '#ffffff',
    textSecondary: '#c8c8e0',
    textMuted: '#aab2e6',
    serverGradient:
      'linear-gradient(135deg, #6226d9 0%, #5b6cff 55%, #37a5d9 100%)',
  },
  {
    id: 'games',
    name: 'Arcade',
    subtitle: 'Preto gamer com neon magenta, roxo elétrico e ciano.',
    badge: '🎮',
    colors: {
      rail: '#0f091d',
      surface: '#17102b',
      accent: '#ff2e93',
      presence: '#00f5d4',
    },
    surfaceElevated: '#130c24',
    bar: '#0d081a',
    control: '#221640',
    input: '#261a45',
    border: '#3b246b',
    textPrimary: '#ffffff',
    textSecondary: '#e2d4ff',
    textMuted: '#b79ee6',
    serverGradient:
      'linear-gradient(135deg, #ff2e93 0%, #8338ec 55%, #00f5d4 100%)',
  },
  {
    id: 'fantasy',
    name: 'Reino da Floresta',
    subtitle: 'Verde-musgo antigo, pergaminho quente e ouro forjado.',
    badge: '🌿',
    colors: {
      rail: '#0c1712',
      surface: '#16261f',
      accent: '#d4a853',
      presence: '#52c48c',
    },
    surfaceElevated: '#122019',
    bar: '#0e1a14',
    control: '#1f352b',
    input: '#233a2f',
    border: '#325242',
    textPrimary: '#f7f3e8',
    textSecondary: '#dcd4be',
    textMuted: '#b2beaa',
    serverGradient:
      'linear-gradient(135deg, #8c6222 0%, #d4a853 55%, #3f7d58 100%)',
  },
  {
    id: 'scifi',
    name: 'Ordem Estelar',
    subtitle: 'Casco espacial grafite com plasma azul e aço escovado.',
    badge: '🚀',
    colors: {
      rail: '#070a11',
      surface: '#121826',
      accent: '#38bdf8',
      presence: '#4ade80',
    },
    surfaceElevated: '#0d121d',
    bar: '#0a0e17',
    control: '#192235',
    input: '#1d273b',
    border: '#273552',
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    serverGradient:
      'linear-gradient(135deg, #0284c7 0%, #38bdf8 55%, #1e293b 100%)',
  },
  {
    id: 'violet',
    name: 'Violeta',
    subtitle: 'Violeta profundo com destaque vibrante e superfícies limpas.',
    badge: '◆',
    colors: {
      rail: '#0c0918',
      surface: '#161129',
      accent: '#7c3aed',
      presence: '#2dd4bf',
    },
    surfaceElevated: '#120d22',
    bar: '#0f0b1c',
    control: '#20183c',
    input: '#241c42',
    border: '#342861',
    textPrimary: '#fafafa',
    textSecondary: '#ddd6fe',
    textMuted: '#a78bfa',
    serverGradient:
      'linear-gradient(135deg, #6d28d9 0%, #7c3aed 55%, #a855f7 100%)',
  },
  {
    id: 'emerald',
    name: 'Esmeralda',
    subtitle: 'Verde esmeralda equilibrado com contraste nítido.',
    badge: '◆',
    colors: {
      rail: '#07140f',
      surface: '#0e2018',
      accent: '#059669',
      presence: '#34d399',
    },
    surfaceElevated: '#0b1a13',
    bar: '#091610',
    control: '#153024',
    input: '#183629',
    border: '#234a39',
    textPrimary: '#f8fafc',
    textSecondary: '#d1fae5',
    textMuted: '#6ee7b7',
    serverGradient:
      'linear-gradient(135deg, #047857 0%, #059669 55%, #10b981 100%)',
  },
  {
    id: 'sapphire',
    name: 'Safira',
    subtitle: 'Azul safira clássico com foco preciso e leitura confortável.',
    badge: '◆',
    colors: {
      rail: '#070e1c',
      surface: '#101a30',
      accent: '#2563eb',
      presence: '#22d3ee',
    },
    surfaceElevated: '#0c1526',
    bar: '#091120',
    control: '#182848',
    input: '#1c2d52',
    border: '#283f6e',
    textPrimary: '#f8fafc',
    textSecondary: '#dbeafe',
    textMuted: '#93c5fd',
    serverGradient:
      'linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #0284c7 100%)',
  },
  {
    id: 'sunset',
    name: 'Pôr do sol',
    subtitle: 'Âmbar e terracota quentes com energia visual equilibrada.',
    badge: '◆',
    colors: {
      rail: '#170c07',
      surface: '#24140d',
      accent: '#ea580c',
      presence: '#22c55e',
    },
    surfaceElevated: '#1d100a',
    bar: '#190d08',
    control: '#361f14',
    input: '#3d2418',
    border: '#543222',
    textPrimary: '#fff7ed',
    textSecondary: '#fed7aa',
    textMuted: '#fdba74',
    serverGradient:
      'linear-gradient(135deg, #c2410c 0%, #ea580c 55%, #f59e0b 100%)',
  },
  {
    id: 'amethyst',
    name: 'Ametista',
    subtitle: 'Roxo ametista elegante com acentos suaves e modernos.',
    badge: '◆',
    colors: {
      rail: '#12081b',
      surface: '#1d0f2b',
      accent: '#9333ea',
      presence: '#34d399',
    },
    surfaceElevated: '#170c22',
    bar: '#140a1e',
    control: '#2b1740',
    input: '#311a47',
    border: '#462666',
    textPrimary: '#faf5ff',
    textSecondary: '#e9d5ff',
    textMuted: '#c084fc',
    serverGradient:
      'linear-gradient(135deg, #7e22ce 0%, #9333ea 55%, #c084fc 100%)',
  },
  {
    id: 'rose',
    name: 'Rosa',
    subtitle: 'Carmim e rosa contemporâneos com alto contraste.',
    badge: '◆',
    colors: {
      rail: '#17080f',
      surface: '#240f19',
      accent: '#e11d48',
      presence: '#2dd4bf',
    },
    surfaceElevated: '#1c0b13',
    bar: '#180910',
    control: '#361626',
    input: '#3d192b',
    border: '#57243d',
    textPrimary: '#fff1f2',
    textSecondary: '#fecdd3',
    textMuted: '#fda4af',
    serverGradient:
      'linear-gradient(135deg, #be123c 0%, #e11d48 55%, #fb7185 100%)',
  },
  {
    id: 'monochrome',
    name: 'Monocromático',
    subtitle:
      'Escala neutra em grafite e branco com foco limpo e alto contraste.',
    badge: '◐',
    colors: {
      rail: '#09090b',
      surface: '#141417',
      accent: '#52525b',
      presence: '#16a34a',
    },
    surfaceElevated: '#101013',
    bar: '#0d0d10',
    control: '#1f1f24',
    input: '#222228',
    border: '#2e2e36',
    textPrimary: '#fafafa',
    textSecondary: '#d4d4d8',
    textMuted: '#a1a1aa',
    serverGradient:
      'linear-gradient(135deg, #3f3f46 0%, #52525b 55%, #27272a 100%)',
  },
] as const;

export const findPreset = (id: ThemePresetId): ThemePreset =>
  THEME_PRESETS.find((p) => p.id === id) ?? THEME_PRESETS[0]!;
