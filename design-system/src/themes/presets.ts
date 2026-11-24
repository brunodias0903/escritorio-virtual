export type ThemePresetId = 'default' | 'games' | 'fantasy' | 'scifi';

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
    name: 'Modo Arcade',
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
] as const;

export const findPreset = (id: ThemePresetId): ThemePreset =>
  THEME_PRESETS.find((p) => p.id === id) ?? THEME_PRESETS[0]!;
