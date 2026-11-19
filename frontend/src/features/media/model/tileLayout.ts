export const TILE_GAP = 12;
export const TILE_MIN_WIDTH = 150;
export const TILE_MAX_WIDTH = 300;
/** Altura dividida pela largura de um quadro de câmera. */
export const TILE_RATIO = 0.68;

/**
 * Largura de cada quadro de câmera na fileira de cima: divide o espaço entre
 * todos, sem passar do máximo nem ficar menor que o mínimo (aí quebra linha).
 */
export const tileWidth = (areaWidth: number, count: number): number => {
  if (count <= 0) return TILE_MAX_WIDTH;
  const room = areaWidth - TILE_GAP * 2 - TILE_GAP * (count - 1);
  return Math.round(
    Math.min(TILE_MAX_WIDTH, Math.max(TILE_MIN_WIDTH, room / count)),
  );
};

/** Altura dividida pela largura de uma tela compartilhada (16:9). */
export const SCREEN_RATIO = 9 / 16;
/** Largura da coluna de pessoas quando uma tela está ampliada. */
export const FOCUS_SIDEBAR_WIDTH = 220;

/**
 * Fileira de cima: câmeras e telas dos outros com a mesma altura. Uma tela
 * ocupa a largura de quase duas câmeras (é 16:9).
 */
export const rowLayout = (
  areaWidth: number,
  cameras: number,
  screens: number,
): { cameraWidth: number; height: number; screenWidth: number } => {
  const slots = cameras + screens * (TILE_RATIO / SCREEN_RATIO);
  const cameraWidth = tileWidth(areaWidth, Math.ceil(slots));
  const height = Math.round(cameraWidth * TILE_RATIO);
  return {
    cameraWidth,
    height,
    screenWidth: Math.round(height / SCREEN_RATIO),
  };
};

/**
 * Tela ampliada (como no Meet e no Teams): a tela grande à esquerda e as
 * pessoas numa coluna à direita. Devolve o tamanho da tela grande.
 */
export const focusLayout = (
  areaWidth: number,
  areaHeight: number,
): { width: number; height: number } => {
  const room = Math.max(0, areaWidth - FOCUS_SIDEBAR_WIDTH - TILE_GAP * 3);
  const tall = Math.max(0, areaHeight);
  const width = Math.min(room, tall / SCREEN_RATIO);
  return { width: Math.round(width), height: Math.round(width * SCREEN_RATIO) };
};
