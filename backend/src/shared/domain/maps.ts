import { z } from 'zod';
import { TILE } from './tile.js';

export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export const MAP_IDS = ['lobby', 'andar-2'] as const;
export const MapIdSchema = z.enum(MAP_IDS);
export type MapId = z.infer<typeof MapIdSchema>;
export const DEFAULT_MAP: MapId = 'lobby';

export type SolidKind =
  | 'table'
  | 'desk'
  | 'wall'
  | 'plant'
  | 'sofa'
  | 'shelf'
  | 'pantry'
  | 'fridge'
  | 'printer'
  | 'cabinet'
  | 'lamp'
  | 'booth2'
  | 'booth4';
export type Solid = Rect & { kind: SolidKind };

/**
 * Zona de chamada: quem está dentro entra na chamada de voz e vídeo daquela
 * zona e só ouve e vê quem está nela. Fora de qualquer zona (a "estrada"),
 * não há chamada: microfone e câmera ficam desligados.
 * `private` marca salas fechadas por paredes (só muda o desenho).
 * `capacity` limita quantas pessoas cabem na zona ao mesmo tempo.
 */
export type Area = Rect & {
  id: string;
  name: string;
  private: boolean;
  capacity?: number;
  /** A zona é uma mesinha que alguém pode adotar (veja `DeskDef`). */
  desk?: boolean;
};

/** Mesinha de computador: pode ser adotada e decorada por uma pessoa. */
export type DeskDef = Rect & { id: string; name: string };

/** Quantas pessoas cabem numa mesinha (e, portanto, na chamada dela). */
export const DESK_CAPACITY = 3;
/** A mesinha tem 3 quadradinhos de largura e 1 de altura. */
export const DESK_WIDTH = 3 * TILE;
export const DESK_HEIGHT = TILE;

/** Retângulo medido em quadradinhos (coluna, linha, largura, altura). */
const tiles = (col: number, row: number, cols = 1, rows = 1): Rect => ({
  x: col * TILE,
  y: row * TILE,
  w: cols * TILE,
  h: rows * TILE,
});

/** Centro do quadradinho (coluna, linha). */
const center = (col: number, row: number): Point => ({
  x: col * TILE + TILE / 2,
  y: row * TILE + TILE / 2,
});

/**
 * Monta as mesinhas de uma sala: o desenho, a colisão e a zona de chamada.
 * A zona são os 3 quadradinhos logo à frente (embaixo) da mesinha.
 */
const makeDesks = (
  columns: number[],
  rows: number[],
): { desks: DeskDef[]; solids: Solid[]; areas: Area[] } => {
  const desks: DeskDef[] = [];
  for (const row of rows) {
    for (const col of columns) {
      const n = desks.length + 1;
      desks.push({
        id: `mesa-${n}`,
        name: `Mesa ${n}`,
        ...tiles(col, row, 3, 1),
      });
    }
  }
  return {
    desks,
    solids: desks.map((d): Solid => ({
      kind: 'desk',
      x: d.x,
      y: d.y,
      w: d.w,
      h: d.h,
    })),
    areas: desks.map((d): Area => ({
      id: d.id,
      name: d.name,
      x: d.x,
      y: d.y + d.h,
      w: d.w,
      h: TILE,
      private: false,
      capacity: DESK_CAPACITY,
      desk: true,
    })),
  };
};

export type Door = Rect & {
  label: string;
  to: { map: MapId; x: number; y: number };
};

export type MapDef = {
  id: MapId;
  name: string;
  width: number;
  height: number;
  floor: 'wood' | 'carpet';
  spawn: Point;
  solids: Solid[];
  /** Mesinhas adotáveis (também aparecem em `solids` e em `areas`). */
  desks: DeskDef[];
  /** Tapetes e outros enfeites sem colisão. */
  rugs: (Rect & { color: string })[];
  areas: Area[];
  doors: Door[];
  /** Áreas protegidas onde não é permitido mover mesinhas (entradas, saídas, spawn). */
  noDeskZones: Rect[];
};

const COLS = 30;
const ROWS = 20;

const solid = (kind: SolidKind, col: number, row: number, cols = 1, rows = 1) =>
  ({ kind, ...tiles(col, row, cols, rows) }) satisfies Solid;

const lobbyDesks = makeDesks([13, 18, 23], [4, 8, 12]);

const LOBBY: MapDef = {
  id: 'lobby',
  name: 'Recepção',
  width: COLS * TILE,
  height: ROWS * TILE,
  floor: 'wood',
  spawn: center(15, 17),
  solids: [
    // Paredes de fora. A porta do Andar 2 fica na direita, nas linhas 8 a 10.
    solid('wall', 0, 0, COLS, 2),
    solid('wall', 0, 19, COLS, 1),
    solid('wall', 0, 2, 1, 17),
    solid('wall', 29, 2, 1, 6),
    solid('wall', 29, 11, 1, 8),
    // Sala de reunião (canto superior esquerdo), com a entrada embaixo.
    solid('wall', 11, 2, 1, 6),
    solid('wall', 1, 8, 4, 1),
    solid('wall', 8, 8, 4, 1),
    solid('table', 4, 3, 5, 3),
    ...lobbyDesks.solids,
    // Plantas biofílicas espalhadas pelo andar
    solid('plant', 1, 2),
    solid('plant', 10, 2),
    solid('plant', 12, 2),
    solid('plant', 12, 9),
    solid('plant', 27, 2),
    solid('plant', 28, 7),
    solid('plant', 1, 9),
    solid('plant', 1, 14),
    solid('plant', 1, 18),
    solid('plant', 2, 18),
    solid('plant', 11, 18),
    solid('plant', 18, 18),
    solid('plant', 28, 15),
    // Mesas de Reunião Rápida (1:1 com 2 cadeiras e 4 cadeiras) encostadas nas paredes e cantos
    solid('booth2', 26, 2, 1, 1),
    solid('booth2', 11, 18, 1, 1),
    solid('booth2', 2, 10, 1, 1),
    solid('booth4', 2, 13, 1, 2),
    solid('booth4', 27, 5, 1, 2),
    solid('booth4', 27, 12, 1, 2),
    solid('booth4', 27, 17, 1, 2),
    // Estantes corporativas e arquivos técnicos
    solid('shelf', 19, 2, 6, 1),
    solid('printer', 13, 2, 2, 1),
    solid('cabinet', 15, 2, 2, 1),
    solid('cabinet', 17, 2, 2, 1),
    // Copa & Café (canto inferior esquerdo) + Lounge de convivência
    solid('pantry', 4, 18, 3, 1),
    solid('fridge', 7, 18, 1, 1),
    solid('cabinet', 9, 18, 2, 1),
    solid('sofa', 4, 15, 3, 1),
    solid('lamp', 3, 15, 1, 1),
    solid('lamp', 8, 15, 1, 1),
    // Lounge principal (canto inferior direito, linha 18 mantém linha 17 livre)
    solid('sofa', 20, 18, 3, 1),
    solid('sofa', 24, 18, 2, 1),
    solid('lamp', 19, 18, 1, 1),
  ],
  desks: lobbyDesks.desks,
  rugs: [
    // Tapetes de acolhimento sob os lounges, cantos de 1:1 e corredor central
    { ...tiles(1, 10, 3, 4), color: '#8478a6' },
    { ...tiles(26, 5, 3, 2), color: '#397f94' },
    { ...tiles(26, 12, 3, 2), color: '#59804b' },
    { ...tiles(3, 15, 6, 3), color: '#397f94' },
    { ...tiles(19, 16, 9, 2), color: '#59804b' },
    { ...tiles(14, 16, 3, 3), color: '#397f94' },
  ],
  areas: [
    {
      id: 'sala-reuniao',
      name: 'Sala de reunião',
      ...tiles(1, 2, 10, 6),
      private: true,
    },
    ...lobbyDesks.areas,
  ],
  doors: [
    {
      label: 'Andar 2',
      ...tiles(29, 8, 1, 3),
      to: { map: 'andar-2', ...center(2, 9) },
    },
  ],
  noDeskZones: [
    // Entrada da sala de reunião (não bloquear a passagem).
    tiles(5, 8, 3, 2),
    // Entrada/saída para o Andar 2.
    tiles(27, 7, 3, 5),
    // Área de chegada (spawn) na recepção.
    tiles(14, 16, 3, 3),
  ],
};

const andarDesks = makeDesks([13, 18, 23], [5, 10]);

const ANDAR_2: MapDef = {
  id: 'andar-2',
  name: 'Andar 2',
  width: COLS * TILE,
  height: ROWS * TILE,
  floor: 'carpet',
  spawn: center(2, 9),
  solids: [
    solid('wall', 0, 0, COLS, 2),
    solid('wall', 0, 19, COLS, 1),
    solid('wall', 29, 2, 1, 17),
    solid('wall', 0, 2, 1, 6),
    solid('wall', 0, 11, 1, 8),
    // Lounge norte & Copa do Andar 2
    solid('pantry', 2, 2, 3, 1),
    solid('fridge', 5, 2, 1, 1),
    solid('sofa', 6, 3, 4, 2),
    solid('lamp', 10, 3, 1, 1),
    // Hub de colaboração central-esquerdo (Mesa de reunião aberta com cadeiras)
    solid('table', 6, 8, 5, 3),
    // Lounge sul & Biblioteca do Andar 2
    solid('sofa', 6, 14, 4, 2),
    solid('lamp', 5, 14, 1, 1),
    solid('lamp', 10, 14, 1, 1),
    solid('shelf', 2, 18, 8, 1),
    ...andarDesks.solids,
    // Hub técnico norte e sul
    solid('printer', 13, 2, 2, 1),
    solid('cabinet', 15, 2, 2, 1),
    solid('cabinet', 18, 2, 2, 1),
    solid('shelf', 21, 2, 5, 1),
    solid('sofa', 14, 17, 4, 1),
    solid('sofa', 20, 17, 4, 1),
    solid('lamp', 13, 17, 1, 1),
    solid('lamp', 19, 17, 1, 1),
    solid('shelf', 14, 18, 10, 1),
    // Mesas de Reunião Rápida (1:1 com 2 cadeiras e 4 cadeiras) nas paredes e cantos do Andar 2
    solid('booth4', 2, 5, 1, 2),
    solid('booth4', 2, 12, 1, 2),
    solid('booth2', 2, 16, 1, 1),
    solid('booth2', 11, 2, 1, 1),
    solid('booth2', 27, 2, 1, 1),
    solid('booth4', 27, 5, 1, 2),
    solid('booth2', 27, 9, 1, 1),
    solid('booth4', 27, 12, 1, 2),
    solid('booth4', 27, 16, 1, 2),
    solid('booth2', 11, 18, 1, 1),
    // Plantas biofílicas pelo Andar 2
    solid('plant', 1, 2),
    solid('plant', 28, 2),
    solid('plant', 28, 8),
    solid('plant', 28, 15),
    solid('plant', 1, 18),
    solid('plant', 28, 18),
  ],
  desks: andarDesks.desks,
  rugs: [
    { ...tiles(1, 5, 3, 2), color: '#397f94' },
    { ...tiles(1, 12, 3, 2), color: '#59804b' },
    { ...tiles(26, 5, 3, 2), color: '#8478a6' },
    { ...tiles(26, 12, 3, 2), color: '#397f94' },
    { ...tiles(26, 16, 3, 2), color: '#59804b' },
    { ...tiles(5, 3, 6, 3), color: '#59804b' },
    { ...tiles(4, 7, 7, 5), color: '#397f94' },
    { ...tiles(5, 14, 6, 3), color: '#8478a6' },
    { ...tiles(13, 16, 12, 2), color: '#59804b' },
  ],
  areas: andarDesks.areas,
  doors: [
    {
      label: 'Recepção',
      ...tiles(0, 8, 1, 3),
      to: { map: 'lobby', ...center(28, 9) },
    },
  ],
  noDeskZones: [
    // Entrada/saída para a Recepção e ponto de chegada (spawn).
    tiles(0, 7, 4, 5),
  ],
};

export const MAPS: Record<MapId, MapDef> = {
  lobby: LOBBY,
  'andar-2': ANDAR_2,
};

export const getMap = (id: MapId): MapDef => MAPS[id];

/** O ponto está dentro do retângulo? (a borda de cima e da esquerda contam, as outras não) */
const inside = (rect: Rect, { x, y }: Point): boolean =>
  x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;

/** Bloqueado: fora do mapa ou em cima de um objeto sólido. */
export const isBlocked = (map: MapDef, point: Point): boolean =>
  !inside({ x: 0, y: 0, w: map.width, h: map.height }, point) ||
  map.solids.some((solid) => inside(solid, point));

export const doorAt = (map: MapDef, point: Point): Door | undefined =>
  map.doors.find((door) => inside(door, point));

export const areaAt = (map: MapDef, point: Point): Area | undefined =>
  map.areas.find((area) => inside(area, point));

/** Mesinha pelo id (o mesmo id da zona de chamada). */
export const deskOf = (map: MapDef, deskId: string): DeskDef | undefined =>
  map.desks.find((desk) => desk.id === deskId);

/** Retângulos se sobrepõem (bordas encostadas, como mesas coladas lado a lado, NÃO contam). */
const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export type DeskPlacementOverride = {
  map: MapId;
  deskId: string;
  owner: unknown | null;
  config: { position?: { col: number; row: number } | null };
};

/**
 * Monta o mapa aplicando as posições personalizadas das mesinhas movidas
 * pelos donos. Sem alterações, devolve o mapa base direto.
 */
export const resolveMap = (
  id: MapId,
  overrides?: Iterable<DeskPlacementOverride>,
): MapDef => {
  const base = MAPS[id];
  if (!overrides) return base;
  const custom = new Map<string, { col: number; row: number }>();
  for (const desk of overrides) {
    if (desk.map === id && desk.owner && desk.config.position) {
      custom.set(desk.deskId, desk.config.position);
    }
  }
  if (custom.size === 0) return base;

  const desks: DeskDef[] = base.desks.map((desk) => {
    const pos = custom.get(desk.id);
    if (!pos) return desk;
    return { ...desk, x: pos.col * TILE, y: pos.row * TILE };
  });
  const byId = new Map(desks.map((d) => [d.id, d]));

  const nonDeskSolids = base.solids.filter((s) => s.kind !== 'desk');
  const deskSolids: Solid[] = desks.map((d) => ({
    kind: 'desk',
    x: d.x,
    y: d.y,
    w: d.w,
    h: d.h,
  }));
  const areas: Area[] = base.areas.map((area) => {
    if (!area.desk) return area;
    const moved = byId.get(area.id);
    if (!moved) return area;
    return { ...area, x: moved.x, y: moved.y + moved.h };
  });

  return {
    ...base,
    desks,
    solids: [...nonDeskSolids, ...deskSolids],
    areas,
  };
};

/**
 * Confere se a mesinha `deskId` pode ser colocada na coluna/linha `(col, row)`.
 * Permite mesas coladas lado a lado, mas impede sobrepor paredes, móveis,
 * outras mesas, entradas/saídas, spawn ou salas importantes (como reunião).
 */
export const canPlaceDesk = (
  baseMap: MapDef,
  deskId: string,
  col: number,
  row: number,
  overrides?: Iterable<DeskPlacementOverride>,
): boolean => {
  if (!deskOf(baseMap, deskId)) return false;
  const map = resolveMap(baseMap.id, overrides);
  const cols = map.width / TILE;
  const rows = map.height / TILE;
  if (col < 1 || col + 3 > cols - 1 || row < 2 || row + 2 > rows - 1) {
    return false;
  }

  const footprint: Rect = {
    x: col * TILE,
    y: row * TILE,
    w: DESK_WIDTH,
    h: DESK_HEIGHT + TILE,
  };

  if (
    map.solids.some((s) => s.kind !== 'desk' && overlaps(footprint, s)) ||
    map.areas.some((a) => !a.desk && overlaps(footprint, a)) ||
    map.doors.some((d) => overlaps(footprint, d)) ||
    map.noDeskZones.some((z) => overlaps(footprint, z))
  ) {
    return false;
  }

  // Não pode sobrepor outra mesinha (nem tampo nem lugares), mas pode ficar colada nela.
  for (const other of map.desks) {
    if (other.id === deskId) continue;
    const otherFootprint: Rect = {
      x: other.x,
      y: other.y,
      w: other.w,
      h: other.h + TILE,
    };
    if (overlaps(footprint, otherFootprint)) return false;
  }

  return true;
};
