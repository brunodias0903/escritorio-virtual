import { clamp, type Point } from '@/shared/domain';

/** Zoom 1 mostra 480 px do mapa na largura; 0.5 mostra o dobro (o salão inteiro). */
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2;
/** Ao entrar, mostra um bom pedaço da sala (cerca de 800 px do mapa na largura). */
export const DEFAULT_ZOOM = 0.6;
export const BASE_VIEW_WIDTH = 480;
/** Quanto cada clique nos botões (ou tecla) muda o zoom. */
export const ZOOM_STEP = 1.25;

export const clampZoom = (zoom: number): number =>
  clamp(zoom, MIN_ZOOM, MAX_ZOOM);

/** Distância entre dois dedos. */
export const touchDistance = (
  a: { x: number; y: number },
  b: { x: number; y: number },
): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Zoom depois de uma volta de roda: deltaY negativo aproxima. */
export const wheelZoom = (zoom: number, deltaY: number): number =>
  clampZoom(zoom * Math.exp(-deltaY * 0.0015));

/** Zoom durante a pinça: proporcional à distância entre os dedos. */
export const pinchZoom = (
  startZoom: number,
  startDistance: number,
  distance: number,
): number =>
  startDistance <= 0
    ? startZoom
    : clampZoom(startZoom * (distance / startDistance));

export type Size = { width: number; height: number };
export type ViewBox = { x: number; y: number; w: number; h: number };

/**
 * Parte do mapa que cabe na tela, centrada na pessoa e sem sair do mapa.
 * Zoom menor mostra mais do escritório; zoom maior chega mais perto do avatar.
 */
export const computeViewBox = (
  map: Size,
  screen: Size,
  zoom: number,
  center: Point,
): ViewBox => {
  const ratio = screen.height / screen.width;
  let w = Math.min(map.width, BASE_VIEW_WIDTH / zoom);
  let h = w * ratio;
  if (h > map.height) {
    // Tela muito alta para o mapa: limita pela altura.
    h = map.height;
    w = Math.min(map.width, h / ratio);
  }
  return {
    x: clamp(center.x - w / 2, 0, map.width - w),
    y: clamp(center.y - h / 2, 0, map.height - h),
    w,
    h,
  };
};
