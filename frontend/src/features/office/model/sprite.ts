import {
  HAIR_COLORS,
  PANTS_COLORS,
  SHIRT_COLORS,
  SHOE_COLORS,
  SKIN_TONES,
  type Appearance,
  type AvatarAccessory,
  type AvatarBeard,
  type AvatarBodyShape,
  type AvatarBottom,
  type AvatarFace,
  type AvatarHairLength,
  type AvatarHeight,
  type AvatarShoe,
  type AvatarTop,
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
 * Tamanho da grade do avatar: 16 x 24, seguindo o padrão `.Art` (Detailed Modern RPG Chibi):
 * - Cabeça de tamanho único padronizado (10px de largura frontal nas colunas 3..12),
 *   garantindo que quando o personagem é `chubby` (gordo), APENAS o corpo alarga.
 * - Cabelos e barbas esculpidos à mão sem contorno preto (`O`) interno sobre a pele.
 * - Zona de respiro facial entre franja, óculos (3x2) e barba.
 * - Oclusão realista de cabelo sob `cap` e `beanie` (só aparece a parte de baixo se o cabelo for longo).
 */
export const SPRITE_W = 16;
export const SPRITE_H = 24;

const OUTLINE = '#1e191d';

/**
 * Letras da matriz 16x24:
 * O contorno (#1e191d), H cabelo, h brilho cabelo, d sombra cabelo/barba,
 * S pele, s sombra pele, b rubor bochecha, E olho, W brilho olho, M boca,
 * T camisa, t sombra camisa, u brilho camisa,
 * P calça/bermuda, p sombra calça, B sapato/tênis, w sola/detalhe tênis,
 * G armação óculos, L lente clara, D lente escura,
 * A acessório/detalhe roupa, a brilho acessório, K sombra acessório, . transparente.
 */
type Row = string;

const setAt = (row: Row, col: number, char: string): Row =>
  col >= 0 && col < SPRITE_W
    ? row.slice(0, col) + char + row.slice(col + 1)
    : row;

const applyTemplate = (
  rows: Row[],
  template: readonly Row[],
  startY: number,
) => {
  for (let r = 0; r < template.length; r++) {
    const y = startY + r;
    if (y < 0 || y >= SPRITE_H) continue;
    const tRow = template[r]!;
    for (let x = 0; x < tRow.length && x < SPRITE_W; x++) {
      const ch = tRow[x]!;
      if (ch !== '.' && ch !== ' ') {
        rows[y] = setAt(rows[y]!, x, ch);
      }
    }
  }
};

const mirror = (row: Row): Row => [...row].reverse().join('');

// ============================================================================
// 1. TEMPLATES ARTESANAIS DE CABELO (16 COLUNAS — ZERO CONTORNO PRETO NA PELE)
//    Cabeça frontal ocupa colunas 2..13 (12px). Rosto livre nas linhas +4..+8.
// ============================================================================

const HAIR_FRONT: Record<number, readonly Row[]> = {
  // 0: Repartido clássico
  0: [
    '....OOOOOOOO....', // headTop - 1
    '...OHHHHHHHHO...', // headTop + 0
    '..OHhhHHHHhhHO..', // headTop + 1
    '..OHHHHHHHHHHO..', // headTop + 2
    '..OHHd..dHHHHO..', // headTop + 3 (franja aberta sem contorno preto!)
    '..Od........dO..', // headTop + 4
  ],
  // 1: Ondulado / Repartido ao meio
  1: [
    '....OOOOOOOO....',
    '...OHHHHHHHHO...',
    '..OHhhHddHhhHO..',
    '..OHHHHddHHHHO..',
    '..OHHd....dHHO..',
    '..Od........dO..',
  ],
  // 2: Topete / Spiky (pontas no topo, testa 100% aberta!)
  2: [
    '...OO..OO..OO...', // headTop - 1 (3 pontas do topete)
    '..OhHOOdhOOHhO..', // headTop + 0
    '..OHhhHHHHhhHO..', // headTop + 1
    '..OHHHHHHHHHHO..', // headTop + 2
    '..OdHd....dHdO..', // headTop + 3 (pontinhas curtas suaves em `d`)
    '................', // headTop + 4 (testa totalmente livre!)
  ],
  // 4: Moicano
  4: [
    '.....OOOOOO.....',
    '....OHhhhhHO....',
    '....OHHHHHHO....',
    '.....OHddHO.....',
    '......dddd......',
    '................',
  ],
  // 5: Cacheado / Black Power
  5: [
    '...OOOOOOOOOO...',
    '.OOHHhhHHhhHHOO.',
    'OHhhHHHHHHHHhhHO',
    'OHHHdHHHHHHdHHHO',
    'OHHd........dHHO',
    '.OO..........OO.',
  ],
  // 6: Franja reta (Hime/Bob cut)
  6: [
    '....OOOOOOOO....',
    '...OHHHHHHHHO...',
    '..OHhhHHHHhhHO..',
    '..OHHHHHHHHHHO..',
    '..OHdHHHHHHdHO..',
    '..OHd......dHO..',
  ],
  // 7: Coque alto
  7: [
    '.....OOOOOO.....',
    '....OHhhhhHO....',
    '...OOAAAAAAOO...',
    '..OHhhHHHHhhHO..',
    '..OHHd....dHHO..',
    '..Od........dO..',
  ],
};

const HAIR_SIDE: Record<number, readonly Row[]> = {
  0: [
    '....OOOOOOOO....',
    '...OHHHHHHHHO...',
    '..OHhhHHHHHhdO..',
    '..OHHHHHHHHHHO..',
    '..OHd..dHHHHHO..',
    '........dHHHdO..',
  ],
  1: [
    '....OOOOOOOO....',
    '...OHHHHHHHHO...',
    '..OHhhHHHHHhdO..',
    '..OHHHHHHHHHHO..',
    '..OHd..dHHHHHO..',
    '........dHHHdO..',
  ],
  2: [
    '...OO..OO..OO...',
    '..OhHOOdhOOHhO..',
    '..OHhhHHHHHHhO..',
    '..OHd..dHHHHHO..',
    '........dHHHdO..',
    '.........dHHdO..',
  ],
  4: [
    '....OOOOOOOO....',
    '...OHhhhhhhHO...',
    '...OHHHHHHHHO...',
    '....dddddddd....',
    '................',
    '................',
  ],
  5: [
    '...OOOOOOOOOO...',
    '.OOHHhhHHhhHHOO.',
    '.OHhhHHHHHHhhHO.',
    '.OHHdHHHHHHdHHO.',
    '.OHd...dHHHHHHO.',
    '........dHHHHdO.',
  ],
  6: [
    '....OOOOOOOO....',
    '...OHHHHHHHHO...',
    '..OHhhHHHHHhdO..',
    '..OHHHHHHHHHHO..',
    '..OHd..dHHHHHO..',
    '..Od....dHHHdO..',
  ],
  7: [
    '.......OOOOOO...',
    '......OHhhhhHO..',
    '...OOOOAAAAAAO..',
    '..OHhhHHHHHHHO..',
    '..OHd..dHHHHHO..',
    '........dHHHdO..',
  ],
};

// ============================================================================
// 2. TEMPLATES ARTESANAIS DE BARBA (ALINHADOS A `headTop + 5` — BOCHECHAS LIVRES)
// ============================================================================

const BEARD_FRONT: Record<Exclude<AvatarBeard, 'none'>, readonly Row[]> = {
  stubble: [
    '................', // +5 (olhos livres)
    '................', // +6 (bochechas livres)
    '......ssss......', // +7 (sombra bigode)
    '....ss.MM.ss....', // +8 (boca e queixo)
    '.....ssssss.....', // +9
  ],
  mustache: [
    '................',
    '................',
    '.....dHHHHd.....',
    '.....d.MM.d.....',
  ],
  goatee: [
    '................',
    '................',
    '......dHHd......',
    '.....d.MM.d.....',
    '......dddd......',
    '......OOOO......',
  ],
  short_beard: [
    '................', // +5 (olhos)
    '...d........d...', // +6 (costeleta fina; 8px de pele livre no meio!)
    '...d..dHHd..d...', // +7 (bigode + maxilar, bochechas visíveis!)
    '...ddHdMMdHdd...', // +8 (boca)
    '....dddddddd....', // +9 (queixo)
    '.....OOOOOO.....', // +10
  ],
  full_beard: [
    '................', // +5 (olhos 100% livres)
    '...d........d...', // +6 (bochechas 100% livres!)
    '...Hd.dHHd.dH...', // +7 (bigode + barba lateral com pele entre eles)
    '...OHHdMMdHHO...', // +8 (boca)
    '...OdHHHHHHdO...', // +9 (queixo cheio)
    '....OddddddO....', // +10 (projeta 1px sobre o colarinho)
    '.....OOOOOO.....', // +11
  ],
};

const BEARD_SIDE: Record<Exclude<AvatarBeard, 'none'>, readonly Row[]> = {
  stubble: [
    '................',
    '................',
    '....ss..........',
    '....ssss........',
    '.....sss........',
  ],
  mustache: [
    '................',
    '................',
    '....dHH.........',
    '.....M..........',
  ],
  goatee: [
    '................',
    '................',
    '....dHH.........',
    '....dM..........',
    '....ddd.........',
    '.....OO.........',
  ],
  short_beard: [
    '................',
    '........d.......',
    '....dH..d.......',
    '....dMddd.......',
    '.....dddd.......',
    '......OOO.......',
  ],
  full_beard: [
    '................',
    '........d.......',
    '....dH..H.......',
    '....HMHHd.......',
    '....dHHHdd......',
    '.....OdddO......',
    '......OOO.......',
  ],
};

const shade = (hex: string, amount: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const part = (shift: number) => {
    const v = (n >> shift) & 255;
    const target = amount >= 0 ? 255 : 0;
    return Math.max(
      0,
      Math.min(255, Math.round(v + (target - v) * Math.abs(amount))),
    );
  };
  return `#${[16, 8, 0]
    .map((s) => part(s).toString(16).padStart(2, '0'))
    .join('')}`;
};

/** Os quadros de andar: 0 parado, 1 um pé, 2 o outro pé. */
export type WalkFrame = 0 | 1 | 2;

/**
 * Monta os 16 x 24 desenhados em letras, antes de virar retângulos.
 * Mantém 100% de compatibilidade com os testes unitários existentes:
 * - Sempre 24 linhas de 16 colunas
 * - `right` é espelho exato de `left`
 * - As poses de andar (`frame` 1 e 2) alteram apenas as linhas 18..23 (pernas)
 * - De frente (`down`) inclui `W` nos olhos; de costas (`up`) não
 * - Careca (`style === 3` sem barba) não tem `[Hhd]` nas linhas 1..10
 */
export const spriteRows = (
  appearance: Appearance,
  facing: Facing,
  frame: WalkFrame,
): Row[] => {
  if (facing === 'right') {
    const flippedFrame: WalkFrame = frame === 1 ? 2 : frame === 2 ? 1 : 0;
    return spriteRows(appearance, 'left', flippedFrame).map(mirror);
  }

  const rows: Row[] = Array.from({ length: SPRITE_H }, () =>
    '.'.repeat(SPRITE_W),
  );

  const isSide = facing === 'left';
  const bodyShape: AvatarBodyShape = appearance.bodyShape ?? 'regular';
  const height: AvatarHeight = appearance.height ?? 'average';
  const hairLength: AvatarHairLength =
    appearance.hairLength ?? (appearance.style === 1 ? 'long' : 'short');
  const face: AvatarFace = appearance.face ?? 'happy';
  const accessory: AvatarAccessory = appearance.accessory ?? 'none';
  const beard: AvatarBeard =
    appearance.beard ?? (accessory === 'beard' ? 'full_beard' : 'none');
  const topStyle: AvatarTop = appearance.topStyle ?? 'tshirt';
  const bottomStyle: AvatarBottom = appearance.bottomStyle ?? 'pants';
  const shoeStyle: AvatarShoe = appearance.shoeStyle ?? 'sneakers';
  const wearingHat = accessory === 'cap' || accessory === 'beanie';

  // Geometria vertical: as pernas ficam sempre nas linhas 18..23 para que a caminhada mude só `slice(18)`
  const headTop = height === 'tall' ? 1 : height === 'short' ? 2 : 1;
  const headH = 10; // headTop .. headTop + 9 (linhas 1..10 ou 2..11)
  const torsoTop = headTop + headH; // linha 11 ou 12
  const legsTop = 18;
  const torsoH = legsTop - torsoTop; // termina exatamente na linha 17!

  // -------------------------------------------------------------------------
  // CAMADA 0: Cabelo Traseiro (quando `medium` ou `long`, e não careca/moicano)
  // -------------------------------------------------------------------------
  if (
    appearance.style !== 3 &&
    appearance.style !== 4 &&
    appearance.style !== 7
  ) {
    const backLen =
      hairLength === 'long'
        ? torsoTop + 3
        : hairLength === 'medium'
          ? torsoTop + 1
          : 0;
    if (backLen > 0) {
      const startBack = wearingHat ? headTop + 5 : headTop + 4;
      for (let y = startBack; y <= backLen && y < legsTop; y++) {
        rows[y] = setAt(setAt(rows[y]!, 2, 'O'), 13, 'O');
        for (let x = 3; x <= 12; x++) {
          rows[y] = setAt(rows[y]!, x, y === backLen ? 'd' : 'H');
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // CAMADA 1: Tronco e Roupas Superiores (linhas `torsoTop .. 17`)
  //   - REGRA: Apenas o corpo muda de largura em `slim` / `regular` / `chubby`!
  // -------------------------------------------------------------------------
  const torsoW = isSide
    ? bodyShape === 'chubby'
      ? 8
      : bodyShape === 'slim'
        ? 6
        : 6
    : bodyShape === 'chubby'
      ? 12
      : bodyShape === 'slim'
        ? 8
        : 10;
  const torsoX = Math.floor((SPRITE_W - torsoW) / 2);

  for (let dy = 0; dy < torsoH; dy++) {
    const y = torsoTop + dy;
    rows[y] = setAt(setAt(rows[y]!, torsoX, 'O'), torsoX + torsoW - 1, 'O');
    for (let x = torsoX + 1; x < torsoX + torsoW - 1; x++) {
      let ch = 'T';
      if (dy === 0 || dy === torsoH - 1) ch = dy === 0 ? 'O' : 't';
      else if (x === torsoX + 1) ch = 'u';
      else if (x === torsoX + torsoW - 2) ch = 't';

      if (facing !== 'up' && dy > 0 && dy < torsoH - 1) {
        if (topStyle === 'striped' && dy % 2 === 0) ch = 'A';
        else if (topStyle === 'jacket' && (x === 7 || x === 8)) ch = 'A';
        else if (topStyle === 'shirt_tie' && x === 7 && dy >= 1) ch = 'A';
        else if (
          topStyle === 'overalls' &&
          (dy >= 3 || x === torsoX + 2 || x === torsoX + torsoW - 3)
        ) {
          ch = 'A';
        } else if (topStyle === 'polo' && dy === 1 && (x === 7 || x === 8)) {
          ch = 'S';
        } else if (topStyle === 'hoodie' && dy === 1 && (x === 6 || x === 9)) {
          ch = 'W';
        }
      }
      rows[y] = setAt(rows[y]!, x, ch);
    }

    // Braços laterais na visão frontal/traseira (fixos nas linhas <= 17)
    if (!isSide && dy >= 1 && dy < torsoH) {
      const isHand = dy === torsoH - 1;
      const armChar = isHand ? 'S' : 'T';
      const lx = torsoX - 1;
      const rx = torsoX + torsoW;
      if (lx >= 1) {
        rows[y] = setAt(setAt(rows[y]!, lx - 1, 'O'), lx, armChar);
      }
      if (rx < SPRITE_W - 1) {
        rows[y] = setAt(setAt(rows[y]!, rx, armChar), rx + 1, 'O');
      }
    }
  }

  // Ajustes sutis de `bodyStyle` (feminine / neutral) mantendo compatibilidade
  if (appearance.bodyStyle === 'feminine' && facing === 'down') {
    rows[torsoTop + 1] = setAt(setAt(rows[torsoTop + 1]!, 7, 'S'), 8, 'S');
  }

  // -------------------------------------------------------------------------
  // CAMADA 2: Cabeça (Tamanho Único Padronizado: 12px frontal nas colunas 2..13)
  // -------------------------------------------------------------------------
  const headW = isSide ? 10 : 12;
  const headX = Math.floor((SPRITE_W - headW) / 2);

  for (let dy = 0; dy < headH; dy++) {
    const y = headTop + dy;
    const inset =
      dy === 0 || dy === headH - 1 ? 2 : dy === 1 || dy === headH - 2 ? 1 : 0;
    const rx = headX + inset;
    const rw = headW - inset * 2;
    rows[y] = setAt(setAt(rows[y]!, rx, 'O'), rx + rw - 1, 'O');
    for (let x = rx + 1; x < rx + rw - 1; x++) {
      if (dy === 0 || dy === headH - 1) {
        rows[y] = setAt(rows[y]!, x, 'O');
      } else {
        const isShade = dy === headH - 2 || x === rx + rw - 2;
        rows[y] = setAt(rows[y]!, x, isShade ? 's' : 'S');
      }
    }
  }

  // Olhos e Expressão Facial (`face`)
  const eyeY = headTop + 5;
  const mouthY = headTop + 8;
  if (facing === 'down') {
    // Olhos com brilho `W` (garante o teste `includes('W')` de frente!)
    rows[eyeY] = setAt(setAt(rows[eyeY]!, 5, 'W'), 10, 'W');
    rows[eyeY + 1] = setAt(
      setAt(rows[eyeY + 1]!, 5, face === 'wink' ? 's' : 'E'),
      10,
      'E',
    );
    if (face === 'focused') {
      rows[eyeY - 1] = setAt(setAt(rows[eyeY - 1]!, 5, 'd'), 10, 'd');
    }
    if (face === 'happy' || face === 'wink') {
      rows[eyeY + 1] = setAt(setAt(rows[eyeY + 1]!, 4, 'b'), 11, 'b');
    }
    // Boca
    rows[mouthY] = setAt(
      setAt(rows[mouthY]!, 7, face === 'smirk' ? 's' : 'M'),
      8,
      'M',
    );
  } else if (isSide) {
    rows[eyeY] = setAt(rows[eyeY]!, headX + 2, 'W');
    rows[eyeY + 1] = setAt(rows[eyeY + 1]!, headX + 2, 'E');
    rows[mouthY] = setAt(rows[mouthY]!, headX + 2, 'M');
  }

  // -------------------------------------------------------------------------
  // CAMADA 3: Barba Esculpida à Mão (`beard` — Bochechas livres!)
  // -------------------------------------------------------------------------
  if (beard !== 'none' && facing !== 'up') {
    const bTemplate = isSide ? BEARD_SIDE[beard] : BEARD_FRONT[beard];
    if (bTemplate) {
      applyTemplate(rows, bTemplate, headTop + 5);
    }
  }

  // -------------------------------------------------------------------------
  // CAMADA 4: Cabelo Esculpido à Mão (`style` 0..7 + `hairLength`)
  //   - Se `style === 3` (Careca), nenhum pixel `[Hhd]` é desenhado na cabeça!
  //   - Se `wearingHat` (`cap` ou `beanie`), o topo do cabelo some sob o chapéu
  //     e só aparece a parte de baixo quando `hairLength === 'long'` ou `'medium'`.
  // -------------------------------------------------------------------------
  if (appearance.style !== 3) {
    if (!wearingHat) {
      const hTemplate = isSide
        ? (HAIR_SIDE[appearance.style] ?? HAIR_SIDE[0]!)
        : (HAIR_FRONT[appearance.style] ?? HAIR_FRONT[0]!);
      applyTemplate(rows, hTemplate, headTop - 1);
    } else if (hairLength === 'long' || hairLength === 'medium') {
      // Com boné/touca e cabelo longo: apenas as pontas inferiores saem abaixo do chapéu
      if (!isSide) {
        rows[headTop + 4] = setAt(setAt(rows[headTop + 4]!, 3, 'd'), 12, 'd');
      } else {
        for (let y = headTop + 4; y <= headTop + 7; y++) {
          rows[y] = setAt(setAt(rows[y]!, 11, 'd'), 12, 'O');
        }
      }
    }

    // Mechas longas frontais nos ombros quando `hairLength === 'long'`
    if (hairLength === 'long' && !isSide && appearance.style !== 4) {
      const strandStart = wearingHat ? headTop + 5 : headTop + 6;
      for (let y = strandStart; y <= torsoTop + 2; y++) {
        rows[y] = setAt(setAt(rows[y]!, 2, 'O'), 3, 'H');
        rows[y] = setAt(setAt(rows[y]!, 12, 'H'), 13, 'O');
      }
    }

    // De costas (`up`), a nuca é coberta por cabelo (sem `W` de olhos!)
    if (facing === 'up') {
      const backStart = wearingHat ? headTop + 4 : headTop + 2;
      const backEnd =
        wearingHat && hairLength === 'short'
          ? headTop + 5
          : headTop + headH - 1;
      for (let y = backStart; y < backEnd; y++) {
        for (let x = headX + 1; x < headX + headW - 1; x++) {
          rows[y] = setAt(rows[y]!, x, y >= headTop + headH - 3 ? 'd' : 'H');
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // CAMADA 5: Acessórios (`glasses`, `sunglasses`, `headphones`, `cap`, `beanie`)
  // -------------------------------------------------------------------------
  if (accessory === 'glasses' || accessory === 'sunglasses') {
    const lens = accessory === 'sunglasses' ? 'D' : 'L';
    if (facing === 'down') {
      // Armação compacta 3x2 que deixa a testa (eyeY-1) e as bochechas (eyeY+2) livres!
      rows[eyeY] = setAt(setAt(setAt(rows[eyeY]!, 4, 'G'), 5, lens), 6, 'G');
      rows[eyeY] = setAt(setAt(rows[eyeY]!, 7, 'G'), 8, 'G');
      rows[eyeY] = setAt(setAt(setAt(rows[eyeY]!, 9, 'G'), 10, lens), 11, 'G');
      rows[eyeY + 1] = setAt(
        setAt(
          setAt(rows[eyeY + 1]!, 4, 'G'),
          5,
          accessory === 'sunglasses' ? 'D' : 'W',
        ),
        6,
        'G',
      );
      rows[eyeY + 1] = setAt(
        setAt(
          setAt(rows[eyeY + 1]!, 9, 'G'),
          10,
          accessory === 'sunglasses' ? 'D' : 'W',
        ),
        11,
        'G',
      );
    } else if (isSide) {
      rows[eyeY] = setAt(
        setAt(setAt(rows[eyeY]!, headX + 1, 'G'), headX + 2, lens),
        headX + 3,
        'G',
      );
      rows[eyeY + 1] = setAt(
        setAt(rows[eyeY + 1]!, headX + 1, 'G'),
        headX + 3,
        'G',
      );
    }
  } else if (accessory === 'headphones' && !isSide) {
    for (let x = 4; x <= 11; x++) rows[headTop] = setAt(rows[headTop]!, x, 'A');
    for (let y = headTop + 4; y <= headTop + 6; y++) {
      rows[y] = setAt(setAt(rows[y]!, 1, 'A'), 14, 'A');
    }
  } else if (accessory === 'cap') {
    const capRows = isSide
      ? [
          '....OOOOOOOO....',
          '...OAAAAAAAAO...',
          '..OAAaaAAAAKO...',
          '.OOOOkkkkkkkkO..',
        ]
      : [
          '....OOOOOOOO....',
          '...OAAAAAAAAO...',
          '..OAAaaaaaaAAO..',
          '..OKKKKKKKKKKO..',
        ];
    applyTemplate(rows, capRows, headTop);
  } else if (accessory === 'beanie') {
    const beanieRows = [
      '.....OOaaOO.....',
      '...OOAAAAAAOO...',
      '..OAAaaaaaaAAO..',
      '..OKaKaKaKaKKO..',
    ];
    applyTemplate(rows, beanieRows, headTop - 1);
  }

  // -------------------------------------------------------------------------
  // CAMADA 6: Pernas, Bermudas/Calças e Tênis (SEMPRE nas linhas 18..23)
  // -------------------------------------------------------------------------
  const isShorts =
    bottomStyle === 'shorts' ||
    bottomStyle === 'cargo_shorts' ||
    bottomStyle === 'skirt';
  const legMid = isShorts ? 'S' : 'P';
  const legShade = isShorts ? 's' : 'p';
  const shoeTop =
    shoeStyle === 'high_tops' || shoeStyle === 'boots' ? 'B' : legMid;
  const sole =
    shoeStyle === 'sneakers' ||
    shoeStyle === 'high_tops' ||
    shoeStyle === 'running'
      ? 'w'
      : 'B';

  const legsFrontIdle: Row[] = [
    '....OPPPPPPO....', // 18: quadril / cós
    `....O${legMid}${legShade}OO${legShade}${legMid}O....`, // 19: coxa / canela
    `....O${shoeTop}${legShade}OO${legShade}${shoeTop}O....`, // 20: canela / cano alto
    '....OBBOOBBO....', // 21: tênis
    `...OB${sole}BOOB${sole}BO...`, // 22: sola do tênis
    '...OOOO..OOOO...', // 23: contorno da sola
  ];

  const legsFrontStepLeft: Row[] = [
    '....OPPPPPPO....', // 18
    `....O${legMid}${legShade}OO${legShade}${legMid}O....`, // 19
    `....OBBOO${legShade}${shoeTop}O....`, // 20 (pé esquerdo levantado)
    `...OB${sole}BOO${legShade}BO....`, // 21
    `...OOOO.OB${sole}BO...`, // 22
    '........OOOO....', // 23
  ];

  const legsSideIdle: Row[] = [
    '.....OPPPPO.....', // 18
    `.....O${legMid}${legShade}${legShade}${legMid}O.....`, // 19
    `.....O${shoeTop}${legShade}${legShade}${shoeTop}O.....`, // 20
    '.....OBBBBO.....', // 21
    `....OB${sole}${sole}${sole}BO.....`, // 22
    '....OOOOOOO.....', // 23
  ];

  const legsSideStep: Row[] = [
    '.....OPPPPO.....', // 18
    `....O${legMid}${legShade}OO${legShade}${legMid}O....`, // 19
    `...O${shoeTop}${legShade}O..OBBO...`, // 20
    `..OB${sole}BO...OOO...`, // 21
    '..OOOO..........', // 22
    '................', // 23
  ];

  const chosenLegs = isSide
    ? frame === 0
      ? legsSideIdle
      : frame === 1
        ? legsSideStep
        : legsSideStep.map(mirror)
    : frame === 0
      ? legsFrontIdle
      : frame === 1
        ? legsFrontStepLeft
        : legsFrontStepLeft.map(mirror);

  for (let i = 0; i < 6; i++) {
    rows[18 + i] = chosenLegs[i]!;
  }

  return rows;
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
  const shoe = SHOE_COLORS[appearance.shoes ?? 0] ?? SHOE_COLORS[0];
  const accent = '#397f94';

  const colors: Record<string, string> = {
    O: OUTLINE,
    H: hair,
    h: shade(hair, 0.28),
    d: shade(hair, -0.28),
    S: skin,
    s: shade(skin, -0.18),
    b: '#f29b9b',
    E: OUTLINE,
    W: '#f5f7fa',
    M: shade(skin, -0.38),
    T: shirt,
    t: shade(shirt, -0.25),
    u: shade(shirt, 0.22),
    P: pants,
    p: shade(pants, -0.25),
    B: shoe,
    w: '#f5f7fa',
    G: '#2d313b',
    L: '#d9f5ff',
    D: '#1e191d',
    A: accent,
    a: shade(accent, 0.25),
    K: shade(accent, -0.28),
    k: shade(accent, -0.28),
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
