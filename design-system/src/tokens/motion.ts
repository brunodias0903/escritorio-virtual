/**
 * Tokens de movimento e curvas de animação do Design System.
 * Valores numéricos em ms para reuso em Web e React Native.
 */

export const MOTION_DURATIONS = {
  /** Feedback imediato de toque/clique. */
  instant: 90,
  /** Hovers, bordas, microtransições de botões. */
  fast: 150,
  /** Troca de abas, rotação de ícones, badges e tooltips. */
  normal: 220,
  /** Expansão e recolhimento de sidebar, drawers e painéis. */
  smooth: 280,
  /** Transições amplas de layout e modais. */
  slow: 360,
} as const;

export const MOTION_EASINGS = {
  /** Desaceleração fluida para a maioria das transições. */
  standard: 'cubic-bezier(0.22, 1, 0.36, 1)',
  /** Entrada responsiva e elegante para drawers, painéis e modais. */
  emphasized: 'cubic-bezier(0.16, 1, 0.3, 1)',
  /** Saída limpa e rápida para elementos fechando. */
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
  /** Micro-impulso sutil para pílulas, indicadores ativos e badges. */
  spring: 'cubic-bezier(0.34, 1.32, 0.64, 1)',
} as const;

export type MotionTokens = {
  durations: typeof MOTION_DURATIONS;
  easings: typeof MOTION_EASINGS;
};

export const MOTION: MotionTokens = {
  durations: MOTION_DURATIONS,
  easings: MOTION_EASINGS,
};
