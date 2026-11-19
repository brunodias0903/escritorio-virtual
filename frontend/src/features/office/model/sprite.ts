import {
  HAIR_COLORS,
  SHIRT_COLORS,
  SKIN_TONES,
  type Appearance,
} from '@/shared/domain';

import type { Facing } from './officeWorld';

/** Um retângulo de pixels do avatar, em unidades da grade (cada uma vira alguns pixels na tela). */
export type SpriteRect = {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
};

/**
 * Tamanho da grade do avatar: 16 x 24, em pixel art retrô: cabeça grande
 * com cabelo em 3 tons, olhos de 2 pixels,
 * mangas e mãos, roupa sombreada, contorno escuro e 3 poses de andar.
 */
export const SPRITE_W = 16;
export const SPRITE_H = 24;

const OUTLINE = '#28202c';
const PANTS = '#3c4c84';
const SHOES = '#3a3644';

/**
 * Letras: O contorno, H cabelo, h brilho do cabelo, d sombra do cabelo,
 * S pele, s sombra da pele, E olho, T camisa, t sombra da camisa, u brilho
 * da camisa, P calça, p sombra da calça, B sapato, . vazio.
 */
type Row = string;

// --- Cabeça (linhas 0 a 11) -------------------------------------------------

const HEAD_TOP: Row[] = [
  '.....OOOOOO.....',
  '...OOHhhhHHOO...',
  '..OHhhhHHHHHdO..',
  '.OHhhHHHHHHHHdO.',
];

/** De frente: rosto grande, olhos de 2 x 2 com brilho, boca. */
const FACE_DOWN: Row[] = [
  '.OHHdHHHHHHdHdO.',
  '.OHdSSSHHSSSdHO.',
  '.OdSSSSSSSSSSdO.',
  '.OdSOWSSSSOWSdO.',
  '.OdSOOSSSSOOSdO.',
  '..OsSSSSSSSSsO..',
  '...OsSSMMSSsO...',
  '....OOsSSsOO....',
];

/** De costas: só cabelo, até a nuca. */
const FACE_UP: Row[] = [
  '.OHHHHHHHHHHHdO.',
  '.OHHdHHHHHHdHdO.',
  '.OdHHHHHHHHHHdO.',
  '.OdHHHHHHHHHHdO.',
  '.OdHHHHHHHHHHdO.',
  '..OddHHHHHHddO..',
  '...OddddddddO...',
  '....OOsSSsOO....',
];

/** Olhando para a esquerda; para a direita, espelha. */
const FACE_LEFT: Row[] = [
  '.OHHdHHHHHHHHdO.',
  '.OHdSSSHHHHHHdO.',
  '.OdSSSSSHHHHHdO.',
  '.OSOWSSSSHHHHdO.',
  '.OSOOSSSSHHHHdO.',
  '..OsSSSSsHHHdO..',
  '..OMSSSsHHHdO...',
  '...OOsSSsOOO....',
];

// --- Corpo (linhas 12 a 17) -------------------------------------------------

const BODY_FRONT: Row[] = [
  '...OOTTTTTTOO...',
  '..OTTuTTTTuTTO..',
  '.OTtOTTTTTTOtTO.',
  '.OTtOTTuuTTOtTO.',
  '.OSsOttttttOsSO.',
  '..OOOPPPPPPOOO..',
];

const BODY_SIDE: Row[] = [
  '....OTTTTTTO....',
  '...OTTTTuTTTO...',
  '...OTTTOtTTTO...',
  '...OTTTOtTTTO...',
  '...OtttOsStttO..',
  '....OOPPPPPOO...',
];

// --- Pernas (linhas 18 a 23): parado e um passo ------------------------------

const LEGS_FRONT: [Row[], Row[]] = [
  [
    '....OPPPPPPO....',
    '....OPpOOpPO....',
    '....OPpOOpPO....',
    '....OBBOOBBO....',
    '...OBBBOOBBBO...',
    '...OOOO..OOOO...',
  ],
  [
    '....OPPPPPPO....',
    '....OPpOOpPO....',
    '....OBBOOpPO....',
    '...OBBBOOpPO....',
    '...OOOO.OBBBO...',
    '........OOOO....',
  ],
];

const LEGS_SIDE: [Row[], Row[]] = [
  [
    '.....OPPPPO.....',
    '.....OPppPO.....',
    '.....OPppPO.....',
    '.....OBBBBO.....',
    '....OBBBBBO.....',
    '....OOOOOOO.....',
  ],
  [
    '.....OPPPPO.....',
    '....OPpOOpPO....',
    '...OPpO..OBBO...',
    '..OBBBO...OOO...',
    '..OOOO..........',
    '................',
  ],
];

const mirror = (row: Row): Row => [...row].reverse().join('');

const setAt = (row: Row, col: number, char: string): Row =>
  row.slice(0, col) + char + row.slice(col + 1);

/** Aplica o estilo de cabelo: 0 curto, 1 longo, 2 topete, 3 careca. */
const styled = (rows: Row[], style: number, side: boolean): Row[] => {
  const out = [...rows];
  if (style === 1 && !side) {
    // Cabelo comprido: desce pelos lados até os ombros.
    for (let y = 6; y <= 14; y++) {
      out[y] = setAt(setAt(out[y]!, 1, 'O'), 2, 'H');
      out[y] = setAt(setAt(out[y]!, 14, 'O'), 13, 'H');
    }
  }
  if (style === 2) {
    out[0] = '....OHOHHOHO....';
    out[1] = '...OHHhhhHHHO...';
  }
  if (style === 3) {
    // Careca: a cabeça é toda pele, com brilho e sombra.
    for (let y = 1; y <= 10; y++) {
      out[y] = out[y]!.replace(/[Hh]/g, 'S').replace(/d/g, 's');
    }
  }
  return out;
};

const shade = (hex: string, amount: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const part = (shift: number) =>
    Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) * (1 + amount))));
  return `#${[16, 8, 0].map((s) => part(s).toString(16).padStart(2, '0')).join('')}`;
};

/** Os quadros de andar: 0 parado, 1 um pé, 2 o outro pé. */
export type WalkFrame = 0 | 1 | 2;

/** Os 16 x 24 desenhados em letras, antes de virar retângulos (útil nos testes). */
export const spriteRows = (
  appearance: Appearance,
  facing: Facing,
  frame: WalkFrame,
): Row[] => {
  const side = facing === 'left' || facing === 'right';
  const face = facing === 'up' ? FACE_UP : side ? FACE_LEFT : FACE_DOWN;
  const legs = side ? LEGS_SIDE : LEGS_FRONT;
  const legRows =
    frame === 0 ? legs[0] : frame === 1 ? legs[1] : legs[1].map(mirror);
  const rows = styled(
    [...HEAD_TOP, ...face, ...(side ? BODY_SIDE : BODY_FRONT), ...legRows],
    appearance.style,
    side,
  );
  return facing === 'right' ? rows.map(mirror) : rows;
};

/**
 * Monta o avatar em retângulos de pixel art. `frame` é a pose de andar
 * (0 parado, 1 e 2 um pé de cada vez).
 */
export const buildSprite = (
  appearance: Appearance,
  facing: Facing,
  frame: WalkFrame,
): SpriteRect[] => {
  const skin = SKIN_TONES[appearance.skin];
  const hair = HAIR_COLORS[appearance.hair];
  const shirt = SHIRT_COLORS[appearance.shirt];
  const colors: Record<string, string> = {
    O: OUTLINE,
    H: hair,
    h: shade(hair, 0.45),
    d: shade(hair, -0.35),
    S: skin,
    s: shade(skin, -0.18),
    E: OUTLINE,
    W: '#ffffff',
    M: shade(skin, -0.4),
    T: shirt,
    t: shade(shirt, -0.28),
    u: shade(shirt, 0.25),
    P: PANTS,
    p: shade(PANTS, -0.3),
    B: SHOES,
  };

  const rects: SpriteRect[] = [];
  spriteRows(appearance, facing, frame).forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const char = row[x]!;
      let end = x + 1;
      while (end < row.length && row[end] === char) end++;
      const fill = colors[char];
      if (fill) rects.push({ x, y, w: end - x, h: 1, fill });
      x = end;
    }
  });
  return rects;
};
