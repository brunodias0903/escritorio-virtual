import {
  HAIR_COLORS,
  PANTS_COLORS,
  SHIRT_COLORS,
  SKIN_TONES,
  type Appearance,
  type AvatarAccessory,
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
 * com cabelo em 3 tons, olhos de 2 pixels, acessórios,
 * mangas e mãos, roupa sombreada, contorno escuro e 3 poses de andar.
 */
export const SPRITE_W = 16;
export const SPRITE_H = 24;

const OUTLINE = '#28202c';
const SHOES = '#3a3644';

/**
 * Letras: O contorno, H cabelo, h brilho do cabelo, d sombra do cabelo,
 * S pele, s sombra da pele, E olho, W brilho olho, M boca,
 * T camisa, t sombra da camisa, u brilho da camisa,
 * P calça, p sombra da calça, B sapato,
 * G armação óculos, L lente clara, D lente escura,
 * A acessório principal, a brilho acessório, K acessório escuro, . vazio.
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

/**
 * Aplica o estilo de cabelo:
 * 0 curto, 1 longo, 2 topete, 3 careca, 4 moicano, 5 cacheado, 6 franja, 7 coque.
 */
const styled = (
  rows: Row[],
  style: number,
  facing: 'down' | 'up' | 'side',
): Row[] => {
  const out = [...rows];
  if (style === 1 && facing !== 'side') {
    // Cabelo comprido: desce pelos lados até os ombros.
    for (let y = 6; y <= 14; y++) {
      out[y] = setAt(setAt(out[y]!, 1, 'O'), 2, 'H');
      out[y] = setAt(setAt(out[y]!, 14, 'O'), 13, 'H');
    }
  }
  if (style === 2) {
    // Topete arrepiado.
    out[0] = '....OHOHHOHO....';
    out[1] = '...OHHhhhHHHO...';
  }
  if (style === 3) {
    // Careca: a cabeça é toda pele, com brilho e sombra.
    for (let y = 1; y <= 10; y++) {
      out[y] = out[y]!.replace(/[Hh]/g, 'S').replace(/d/g, 's');
    }
  }
  if (style === 4) {
    // Moicano: laterais raspadas (pele) e crista alta no centro.
    out[0] = '......OHHO......';
    out[1] = '.....OHhhHO.....';
    out[2] = '..OOsSHhHHSsOO..';
    out[3] = '.OSssSHHHHSssSO.';
    if (facing === 'down') {
      out[4] = '.OSsSSHHHHSSsSO.';
    }
  }
  if (style === 5) {
    // Cacheado / Afro volumoso.
    out[0] = '...OOHHhhHHOO...';
    out[1] = '.OOHhhHhhHhhHOO.';
    out[2] = 'OHhhHHhHHhHHhhHO';
    out[3] = 'OHhHHHHHHHHHHhHO';
    out[4] = 'OHdHHdHHHHdHHdHO';
    if (facing !== 'side') {
      out[5] = setAt(setAt(out[5]!, 0, 'O'), 15, 'O');
      out[6] = setAt(setAt(out[6]!, 0, 'O'), 15, 'O');
    }
  }
  if (style === 6) {
    // Franja lateral estilizada.
    if (facing === 'down') {
      out[4] = '.OHHHHHHHHHdHdO.';
      out[5] = '.OHHHHHHHHHsdHO.';
      out[6] = '.OdHHHHSSSSSSdO.';
    } else if (facing === 'side') {
      out[4] = '.OHHHHHHHHHHHdO.';
      out[5] = '.OHHHHSHHHHHHdO.';
    }
  }
  if (style === 7) {
    // Coque no topo da cabeça.
    out[0] = '.....OHhhHO.....';
    out[1] = '....OOHhhHOO....';
    out[2] = '..OHHHHHHHHHdO..';
    if (facing === 'up') {
      out[3] = '.OHHhHHHHHHhHdO.';
    }
  }
  return out;
};

/** Aplica acessório pixel-art sobre a cabeça/rosto (mantendo sempre 16 colunas). */
const withAccessory = (
  rows: Row[],
  accessory: AvatarAccessory,
  facing: 'down' | 'up' | 'side',
): Row[] => {
  if (accessory === 'none') return rows;
  const out = [...rows];

  if (accessory === 'glasses') {
    if (facing === 'down') {
      out[6] = '.OdGGGGGGGGGGOO.'.replace('OO.', 'dO.');
      out[7] = '.OdGOWGGLGOWGdO.';
      out[8] = '.OdGOOGSSGOOGdO.';
    } else if (facing === 'side') {
      out[6] = '.OdGGGGSHHHHHdO.';
      out[7] = '.OGOWGGSSHHHHdO.';
      out[8] = '.OGOOGGSSHHHHdO.';
    }
  }

  if (accessory === 'sunglasses') {
    if (facing === 'down') {
      out[6] = '.OdGGGGGGGGGGdO.';
      out[7] = '.OdGDDGGGGDDGdO.';
      out[8] = '.OdGDDGSSGDDGdO.';
    } else if (facing === 'side') {
      out[6] = '.OdGGGGSHHHHHdO.';
      out[7] = '.OGDDGGSSHHHHdO.';
      out[8] = '.OGDDGGSSHHHHdO.';
    }
  }

  if (accessory === 'headphones') {
    out[1] = '...OOAAAAaAOO...';
    out[2] = '..OAaHHHHHHaAO..';
    if (facing !== 'side') {
      for (let y = 5; y <= 8; y++) {
        out[y] = setAt(setAt(out[y]!, 0, 'A'), 1, 'a');
        out[y] = setAt(setAt(out[y]!, 15, 'A'), 14, 'a');
      }
    } else {
      out[5] = setAt(setAt(out[5]!, 8, 'A'), 9, 'a');
      out[6] = setAt(setAt(out[6]!, 8, 'A'), 9, 'a');
      out[7] = setAt(setAt(out[7]!, 8, 'A'), 9, 'a');
      out[8] = setAt(setAt(out[8]!, 8, 'A'), 9, 'a');
    }
  }

  if (accessory === 'cap') {
    out[0] = '....OOAAAAOO....';
    out[1] = '...OAaaAAAAAO...';
    out[2] = '..OAAAAAAAAKKO..';
    if (facing === 'down') {
      out[3] = '.OKKKKKKKKKKKKO.';
      out[4] = '.OAAAAAAAAAAAAO.';
    } else if (facing === 'side') {
      out[3] = 'OKKKKKKKKKKKKKO.';
      out[4] = 'OAAAAAAAAAAAAKO.';
    } else {
      out[3] = '.OAAAAAAAAAAKKO.';
    }
  }

  if (accessory === 'beanie') {
    out[0] = '.....OaaaAO.....';
    out[1] = '...OOAAaaAAOO...';
    out[2] = '..OAAaaAAAAaAO..';
    out[3] = '.OKaKaKaKaKaKKO.';
    out[4] = '.OKKKKKKKKKKKKO.';
  }

  if (accessory === 'beard') {
    if (facing === 'down') {
      out[9] = '..OHdSSSSSSdHO..';
      out[10] = '...OHHHMMHHHO...';
      out[11] = '....OOHHHHOO....';
    } else if (facing === 'side') {
      out[9] = '..OHHSSSsHHHdO..';
      out[10] = '..OHHHHsHHHdO...';
      out[11] = '...OOHHHHOOO....';
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
  const dir: 'down' | 'up' | 'side' =
    facing === 'up' ? 'up' : side ? 'side' : 'down';
  const face = facing === 'up' ? FACE_UP : side ? FACE_LEFT : FACE_DOWN;
  const legs = side ? LEGS_SIDE : LEGS_FRONT;
  const legRows =
    frame === 0 ? legs[0] : frame === 1 ? legs[1] : legs[1].map(mirror);
  const withHair = styled(
    [...HEAD_TOP, ...face, ...(side ? BODY_SIDE : BODY_FRONT), ...legRows],
    appearance.style,
    dir,
  );
  const withBody = applyBodyStyle(
    withHair,
    appearance.bodyStyle ?? 'masculine',
    dir,
  );
  const rows = withAccessory(withBody, appearance.accessory ?? 'none', dir);
  return facing === 'right' ? rows.map(mirror) : rows;
};

/** Ajustes sutis de silhueta/rosto sem restringir cabelos, cores ou acessórios. */
const applyBodyStyle = (
  rows: Row[],
  bodyStyle: 'masculine' | 'feminine' | 'neutral',
  facing: 'down' | 'up' | 'side',
): Row[] => {
  if (bodyStyle === 'masculine') return rows;
  const out = [...rows];
  if (bodyStyle === 'feminine') {
    if (facing === 'down') {
      // Cílios sutis e gola/cintura levemente acinturada
      out[7] = out[7]!.replace('SEW', 'OEW').replace('WES', 'WEO');
      out[14] = '..OOTTTSSSTTOO..';
      out[16] = '...OTTTTTTTTO...';
    } else if (facing === 'up') {
      out[16] = '...OTTTTTTTTO...';
    } else {
      out[16] = '....OTTTTTTO....';
    }
  } else if (bodyStyle === 'neutral') {
    if (facing === 'down') {
      out[14] = '..OOTTTtStTTOO..';
    }
  }
  return out;
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
  const skin = SKIN_TONES[appearance.skin] ?? SKIN_TONES[0];
  const hair = HAIR_COLORS[appearance.hair] ?? HAIR_COLORS[0];
  const shirt = SHIRT_COLORS[appearance.shirt] ?? SHIRT_COLORS[0];
  const pants = PANTS_COLORS[appearance.pants ?? 0] ?? PANTS_COLORS[0];
  const accent = '#5b6cff';

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
    P: pants,
    p: shade(pants, -0.3),
    B: SHOES,
    G: '#2d3142',
    L: '#9be7ff',
    D: '#141726',
    A: accent,
    a: shade(accent, 0.3),
    K: shade(accent, -0.35),
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
