/**
 * Motor Modular de Geração de Personagens em Pixel Art (Detailed Modern RPG Chibi).
 *
 * Regras de Proporção & Cabelo Artesanal:
 * - A CABEÇA tem sempre o MESMO tamanho padrão (12 px de largura frontal, 11 px de perfil),
 *   independentemente do biotipo (`slim`, `regular` ou `chubby`). Quando o personagem é `chubby`,
 *   APENAS o corpo (tronco, barriga e quadril/pernas) fica mais largo e arredondado.
 * - Os CABELOS não são caixas procedurais: cada estilo (`parted`, `spiky`, `curly`, `bangs`,
 *   `wavy`, `bun`, `twintails`, `mohawk`, `buzz`, `bald`) é desenhado com matrizes de pixel art
 *   esculpidas à mão (inspiradas diretamente na prancha OMORI / Cozy RPG), envolvendo o crânio,
 *   cobrindo as têmporas com mechas orgânicas e brilho superior em arco.
 */

export const CHAR_W = 20;
export const CHAR_H = 28;
export const CHAR_SCALE = 2;

export const OUTLINE_HEX = '#1e191d';

/** Clareia (+) ou escurece (-) uma cor hexadecimal mantendo saturação agradável. */
export const shadeHex = (hex, amount) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift) => {
    const v = (n >> shift) & 255;
    const target = amount >= 0 ? 255 : 0;
    const out = Math.round(v + (target - v) * Math.abs(amount));
    return Math.max(0, Math.min(255, out)).toString(16).padStart(2, '0');
  };
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};

// ============================================================================
// 1. CATÁLOGO DE CORES E OPÇÕES DE PERSONALIZAÇÃO
// ============================================================================

export const SKIN_PALETTES = [
  { name: 'Porcelana', base: '#ffe7d4', shadow: '#e6bfa3', blush: '#f7a8a8' },
  { name: 'Marfim', base: '#fcd7b8', shadow: '#dea985', blush: '#f29b9b' },
  { name: 'Pêssego', base: '#f5c396', shadow: '#d49666', blush: '#e88989' },
  { name: 'Amêndoa', base: '#e3ab78', shadow: '#bf814d', blush: '#d67676' },
  { name: 'Mel', base: '#cf925b', shadow: '#a86b38', blush: '#c26363' },
  { name: 'Oliva', base: '#c48e62', shadow: '#9c663d', blush: '#b56262' },
  { name: 'Canela', base: '#ab6e3e', shadow: '#854c22', blush: '#9e4b4b' },
  { name: 'Bronze', base: '#8f562e', shadow: '#6b3a18', blush: '#823b3b' },
  { name: 'Cacau', base: '#6e3f20', shadow: '#4f2810', blush: '#632929' },
  { name: 'Ébano', base: '#4f2c17', shadow: '#361a0b', blush: '#471c1c' },
];

export const HAIR_COLORS = [
  { name: 'Preto Ébano', base: '#2a2630' },
  { name: 'Castanho Escuro', base: '#4a3123' },
  { name: 'Castanho Mel', base: '#784c2c' },
  { name: 'Castanho Claro', base: '#9e6b43' },
  { name: 'Ruivo Cobre', base: '#b84a2c' },
  { name: 'Loiro Dourado', base: '#e0b14c' },
  { name: 'Loiro Platinado', base: '#f0dfaf' },
  { name: 'Grisalho', base: '#8e96a3' },
  { name: 'Branco Neve', base: '#e6ebf2' },
  { name: 'Azul Royal', base: '#3b73c4' },
  { name: 'Azul Celeste', base: '#6ab8d9' },
  { name: 'Rosa Sakura', base: '#e3789b' },
  { name: 'Roxo Lavanda', base: '#7b62ad' },
  { name: 'Verde Menta', base: '#4ea37a' },
];

export const CLOTH_COLORS = [
  { name: 'Azul-Petróleo', base: '#397f94' },
  { name: 'Verde-Sálvia', base: '#59804b' },
  { name: 'Coral Vibrante', base: '#e05a52' },
  { name: 'Amarelo Mostarda', base: '#e8b446' },
  { name: 'Lavanda Tech', base: '#8478a6' },
  { name: 'Branco Gelo', base: '#e8edf5' },
  { name: 'Grafite Escuro', base: '#3a404f' },
  { name: 'Cinza Mescla', base: '#8d97a8' },
  { name: 'Azul Marinho', base: '#2c4670' },
  { name: 'Terracota', base: '#c46841' },
  { name: 'Rosa Pastel', base: '#eb96aa' },
  { name: 'Verde Menta Claro', base: '#75c29b' },
  { name: 'Vinho Bordô', base: '#7a2e3d' },
  { name: 'Bege Areia', base: '#d6be9c' },
];

export const BOTTOM_COLORS = [
  { name: 'Jeans Índigo', base: '#3d5885' },
  { name: 'Sarja Grafite', base: '#353a47' },
  { name: 'Caqui / Chino', base: '#b89a72' },
  { name: 'Verde Militar', base: '#4c6344' },
  { name: 'Cinza Alfaiataria', base: '#6e7787' },
  { name: 'Preto Urbano', base: '#252830' },
  { name: 'Bege Linho', base: '#d9c5a7' },
  { name: 'Azul Claro Lavado', base: '#688eb8' },
  { name: 'Bordô', base: '#6b323e' },
  { name: 'Caramelo', base: '#94623b' },
];

export const SHOE_COLORS = [
  { name: 'Branco Street', base: '#eef2f7', accent: '#397f94' },
  { name: 'Preto Clássico', base: '#2c303b', accent: '#eef2f7' },
  { name: 'Vermelho Skate', base: '#d64b4b', accent: '#eef2f7' },
  { name: 'Azul Running', base: '#3b73c4', accent: '#f7cf59' },
  { name: 'Couro Marrom', base: '#754728', accent: '#522f18' },
  { name: 'Verde Oliva', base: '#59804b', accent: '#eef2f7' },
  { name: 'Mostarda Retrô', base: '#d9a136', accent: '#2c303b' },
  { name: 'Cinza New Balance', base: '#8a94a6', accent: '#eef2f7' },
  { name: 'Roxo Urbano', base: '#6d549e', accent: '#eef2f7' },
  { name: 'Caramelo', base: '#ab7246', accent: '#eef2f7' },
];

export const BODY_TYPES = ['slim', 'regular', 'chubby'];
export const HEIGHT_TYPES = ['short', 'average', 'tall'];
export const FACE_STYLES = [
  'happy',
  'calm',
  'focused',
  'wink',
  'blush',
  'chill',
  'surprised',
  'smirk',
];
export const HAIR_STYLES = [
  'parted',
  'spiky',
  'curly',
  'bangs',
  'wavy',
  'bun',
  'twintails',
  'mohawk',
  'buzz',
  'bald',
];
export const HAIR_LENGTHS = ['short', 'medium', 'long'];
export const FACIAL_HAIRS = [
  'none',
  'stubble',
  'mustache',
  'goatee',
  'short_beard',
  'full_beard',
  'handlebar',
];
export const TOP_STYLES = [
  'tshirt',
  'polo',
  'hoodie',
  'shirt_tie',
  'jacket',
  'sweater',
  'suit',
  'overalls',
  'striped',
  'tank',
];
export const BOTTOM_STYLES = [
  'pants',
  'shorts',
  'cargo_shorts',
  'skirt',
  'joggers',
  'slacks',
];
export const SHOE_STYLES = [
  'sneakers',
  'high_tops',
  'loafers',
  'boots',
  'slides',
  'running',
];
export const ACCESSORIES = [
  'none',
  'glasses',
  'round_glasses',
  'sunglasses',
  'headphones',
  'beanie',
  'cap',
  'lanyard',
  'hair_bow',
];

// ============================================================================
// 2. TEMPLATES ARTESANAIS DE CABELO (20 COLUNAS DE LARGURA, ESCULPIDOS À MÃO)
//    REGRA DE OURO DE LEGIBILIDADE DO ROSTO (Estilo OMORI / Ref Row 1 Col 3):
//    - NUNCA usar contorno preto `O` dentro do rosto/testa (evita "buracos" pretos).
//      A transição entre a franja e a pele da testa usa `d` (sombra do cabelo).
//    - A franja termina no máximo em `headTop + 3` (com 1 ou 2 pontinhas suaves em `+4`),
//      deixando a testa, os olhos (`headTop + 5`) e as bochechas (`headTop + 6..7`)
//      100% livres e iluminados!
// ============================================================================

export const HAIR_TEMPLATES_FRONT = {
  // 1. Repartido lateral limpo (testa aberta à esquerda, mecha suave à direita)
  parted: [
    '....................', // y = headTop - 2
    '......OOOOOOOO......', // y = headTop - 1
    '....OOHHHHHHHHOO....', // y = headTop + 0
    '...OHhhHHHHHHhhHO...', // y = headTop + 1
    '...OHHHHHHHHHHHHO...', // y = headTop + 2
    '...OHHHd..dHHHHHO...', // y = headTop + 3 (divisão limpa sem contorno preto no rosto!)
    '...Odd......ddHdO...', // y = headTop + 4 (apenas pontas laterais suaves)
    '...Od..........dO...', // y = headTop + 5 (costeleta fina de 1px)
  ],

  // 2. Topete / Spiky moderno (pontas para cima, testa aberta e arejada!)
  spiky: [
    '.....OO..OO..OO.....', // y = headTop - 2 (3 pontas de topete no alto)
    '....OhHOOdhOOHhO....', // y = headTop - 1
    '...OdhHHHHHHHHhdO...', // y = headTop + 0
    '...OHhhHHHHHHhhHO...', // y = headTop + 1
    '...OHHHHHHHHHHHHO...', // y = headTop + 2
    '...OHdHd..dHdHHdO...', // y = headTop + 3 (pontinhas curtas sem contorno preto!)
    '...Od..........dO...', // y = headTop + 4 (rosto 100% livre daqui pra baixo)
    '....................', // y = headTop + 5
  ],

  // 3. Cacheado / Black Power / Afro volumoso (volume para fora, rosto limpo)
  curly: [
    '.....OOOOOOOOOO.....', // y = headTop - 2
    '...OOHHhhHHhhHHOO...', // y = headTop - 1
    '..OHhhHHHHHHHHhhHO..', // y = headTop + 0
    '.OOhHHHHdHHdHHHHhOO.', // y = headTop + 1
    '.OHHHdHHHHHHHHdHHHO.', // y = headTop + 2
    '.OHHHd........dHHHO.', // y = headTop + 3 (testa limpa!)
    '.OHdO..........OdHO.', // y = headTop + 4
    '..OO............OO..', // y = headTop + 5
  ],

  // 4. Franja reta com laterais ("Hime cut" / Bob cut — sem linha preta cortando os olhos)
  bangs: [
    '....................', // y = headTop - 2
    '......OOOOOOOO......', // y = headTop - 1
    '....OOHHHHHHHHOO....', // y = headTop + 0
    '...OHhhHHHHHHhhHO...', // y = headTop + 1
    '...OHHHHHHHHHHHHO...', // y = headTop + 2
    '...OHdHHHHHHHHdHO...', // y = headTop + 3 (franja reta suave terminando em `d`)
    '...OHd........dHO...', // y = headTop + 4 (mechas laterais)
    '...OHd........dHO...', // y = headTop + 5
    '...Od..........dO...', // y = headTop + 6
  ],

  // 5. Ondulado / Repartido ao meio ("Curtain Hair")
  wavy: [
    '....................', // y = headTop - 2
    '.....OOOOOOOOOO.....', // y = headTop - 1
    '....OHHHHHHHHHHO....', // y = headTop + 0
    '...OHhhHHHHHHhhHO...', // y = headTop + 1
    '...OHHHHHddHHHHHO...', // y = headTop + 2
    '...OHHHdd..ddHHHO...', // y = headTop + 3 (abertura central limpa sem `O`)
    '...OHd........dHO...', // y = headTop + 4
    '...Od..........dO...', // y = headTop + 5
  ],

  // 6. Coque Alto com elástico e rosto aberto
  bun: [
    '.......OOOOOO.......', // y = headTop - 3 (topo do coque)
    '......OHhhhhHO......', // y = headTop - 2
    '......OdHHHHdO......', // y = headTop - 1
    '....OOOAAAAAAOOO....', // y = headTop + 0 (elástico na base do coque)
    '...OdhHHHHHHHHhdO...', // y = headTop + 1
    '...OHhhHHHHHHhhHO...', // y = headTop + 2
    '...OHHHd....dHHHO...', // y = headTop + 3
    '...Od..........dO...', // y = headTop + 4
  ],

  // 7. Maria-Chiquinha (Twintails) com rosto amplo e caudas externas ao rosto
  twintails: [
    '....................', // y = headTop - 2
    '......OOOOOOOO......', // y = headTop - 1
    '....OOHHHHHHHHOO....', // y = headTop + 0
    '..OOAOhhhhhhhhOAOO..', // y = headTop + 1 (lacinhos laterais fora da cabeça)
    '.OHhAOHHHHHHHHOAhhO.', // y = headTop + 2
    '.OHHdHHd....dHHdHHO.', // y = headTop + 3 (franja leve, centro da testa aberto)
    '.OHdO..........OdHO.', // y = headTop + 4 (caudas descem por fora das colunas 4..15)
    '.OHdO..........OdHO.', // y = headTop + 5
    '.OHdO..........OdHO.', // y = headTop + 6
    '.OHdO..........OdHO.', // y = headTop + 7
    '.OdOO..........OOdO.', // y = headTop + 8
    '..OO............OO..', // y = headTop + 9
  ],

  // 8. Moicano moderno (crista central no topo, testa totalmente livre)
  mohawk: [
    '.......OOOOOO.......', // y = headTop - 2
    '......OHhhhhHO......', // y = headTop - 1
    '......OHHHHHHO......', // y = headTop + 0
    '......OHHHHHHO......', // y = headTop + 1
    '.......OHddHO.......', // y = headTop + 2
    '........dddd........', // y = headTop + 3
    '....................', // y = headTop + 4
  ],

  // 9. Buzzcut / Raspado (linha capilar sutil em `d`, sem barra preta na testa!)
  buzz: [
    '....................', // y = headTop - 2
    '....................', // y = headTop - 1
    '......OOOOOOOO......', // y = headTop + 0
    '....OOHHHHHHHHOO....', // y = headTop + 1
    '...OHHHHHHHHHHHHO...', // y = headTop + 2
    '...Odd........ddO...', // y = headTop + 3 (recuo frontal limpo)
    '....................', // y = headTop + 4
  ],
};

// Templates de PERFIL ESQUERDO (espelhados automaticamente para a direita)
export const HAIR_TEMPLATES_SIDE = {
  parted: [
    '....................',
    '......OOOOOOOO......',
    '....OOHHHHHHHHOO....',
    '...OHhhHHHHHHHhdO...',
    '...OHHHHHHHHHHHHO...',
    '...OHd...dHHHHHHO...',
    '..........dHHHHdO...',
    '...........dHHHdO...',
    '............OOOO....',
  ],
  spiky: [
    '....OO..OO..OO......',
    '...OhHOOdhOOHhOO....',
    '..OdhHHHHHHHHHhdO...',
    '...OHhhHHHHHHHHHO...',
    '...OHd..dHHHHHHHO...',
    '.........dHHHHHdO...',
    '..........dHHHHdO...',
    '...........OOOO.....',
  ],
  curly: [
    '.....OOOOOOOOOO.....',
    '...OOHHhhHHhhHHOO...',
    '..OHhhHHHHHHHHhhHO..',
    '..OhHHHHdHHdHHHHhO..',
    '..OHHdHHHHHHHHdHHO..',
    '..OHd....dHHHHHHHO..',
    '..........dHHHHHdO..',
    '...........OOHHHOO..',
    '.............OOOO...',
  ],
  bangs: [
    '....................',
    '......OOOOOOOO......',
    '....OOHHHHHHHHOO....',
    '...OHhhHHHHHHHhdO...',
    '...OHHHHHHHHHHHHO...',
    '...OHd..dHHHHHHHO...',
    '...OHd...dHHHHHdO...',
    '...Od.....dHHHHdO...',
    '...........OOOO.....',
  ],
  wavy: [
    '....................',
    '.....OOOOOOOOOO.....',
    '....OHHHHHHHHHHO....',
    '...OHhhHHHHHHHhdO...',
    '...OHHHHHHHHHHHHO...',
    '...OHd...dHHHHHHO...',
    '..........dHHHHdO...',
    '...........dHHHdO...',
    '............OOOO....',
  ],
  bun: [
    '..........OOOOOO....',
    '.........OHhhhhHO...',
    '.........OdHHHHdO...',
    '....OOOOOOAAAAAAO...',
    '...OHhhHHHHHHHHHO...',
    '...OHd...dHHHHHHO...',
    '..........dHHHHdO...',
    '...........dHHHdO...',
    '............OOOO....',
  ],
  twintails: [
    '....................',
    '......OOOOOOOO......',
    '....OOHHHHHHHHOO....',
    '...OHhhHHHHHAAHHO...',
    '...OHHHHHHHHAAhhHO..',
    '...OHd...dHHdHHHhO..',
    '..........dHHHHHdO..',
    '...........dHHHHdO..',
    '............OOOO....',
  ],
  mohawk: [
    '.....OOOOOOOOOO.....',
    '....OHhhhhhhhhHO....',
    '....OHHHHHHHHHHO....',
    '.....dddddddddd.....',
    '....................',
  ],
  buzz: [
    '....................',
    '....................',
    '......OOOOOOOO......',
    '....OOHHHHHHHHOO....',
    '...OHHHHHHHHHHHHO...',
    '.........dHHHHHdO...',
    '..........ddddddO...',
    '...........OOOOO....',
  ],
};

// ============================================================================
// 2.B. TEMPLATES ARTESANAIS DE BARBA (20 COLUNAS, ALINHADOS A `headTop + 5`)
//      REGRA DE OURO DA BARBA (Igual ao barbudo da Ref Row 1 Col 3):
//      - As linhas +5 (olhos) e +6 (bochechas/maçãs do rosto) ficam LIVRES
//        com pele visível (apenas 1px de costeleta fina na borda extrema).
//      - Sem contorno preto `O` dentro do rosto: a barba usa apenas `H` (cor do pelo)
//        e `d` (sombra da barba), deixando a boca/queixo claro e legível!
// ============================================================================

export const BEARD_TEMPLATES_FRONT = {
  // 1. Barba por fazer (sombra suave apenas no queixo e bigode, bochechas limpas)
  stubble: [
    '....................', // +5 (olhos livres)
    '....................', // +6 (bochechas 100% livres)
    '........ssss........', // +7 (sombra de bigode)
    '......ss.MM.ss......', // +8 (boca e maxilar)
    '.......ssssss.......', // +9 (queixo)
  ],

  // 2. Bigode clássico (apenas acima da boca, sem fechar o queixo)
  mustache: [
    '....................', // +5
    '....................', // +6
    '.......dHHHHd.......', // +7 (bigode)
    '.......d.MM.d.......', // +8 (pontas laterais)
  ],

  // 3. Bigode Handlebar / Imperial
  handlebar: [
    '....................', // +5
    '....................', // +6
    '......ddHHHHdd......', // +7
    '.....d...MM...d.....', // +8
  ],

  // 4. Cavanhaque (bigode + tufo no queixo, bochechas 100% livres de pele!)
  goatee: [
    '....................', // +5
    '....................', // +6 (bochechas livres)
    '........dHHd........', // +7 (bigode compacto)
    '.......d.MM.d.......', // +8 (ao redor da boca)
    '........dddd........', // +9 (queixo)
    '........OOOO........', // +10
  ],

  // 5. Barba Curta Aparada (igual à Ref Row 1 Col 3: costeleta fina de 1px, bochechas de pele visíveis!)
  short_beard: [
    '....................', // +5 (olhos)
    '.....d........d.....', // +6 (costeleta fina de 1px; 8px centrais de PELE livre!)
    '.....d..dHHd..d.....', // +7 (bigode central + maxilar; bochechas de pele entre eles!)
    '.....ddHdMMdHdd.....', // +8 (une maxilar na altura da boca)
    '......dddddddd......', // +9 (queixo fechado)
    '.......OOOOOO.......', // +10 (contorno inferior do queixo)
  ],

  // 6. Barba Cheia (mantém bochechas e olhos abertos em +5 e +6, e ganha volume para baixo no queixo)
  full_beard: [
    '....................', // +5 (olhos 100% livres)
    '.....d........d.....', // +6 (bochechas e nariz 100% livres!)
    '.....Hd.dHHd.dH.....', // +7 (bigode + início da barba lateral, ainda com pele nas bochechas)
    '.....OHHdMMdHHO.....', // +8 (barba envolve a boca)
    '.....OdHHHHHHdO.....', // +9 (queixo cheio)
    '......OddddddO......', // +10 (desce 1px sobre o pescoço)
    '.......OOOOOO.......', // +11 (base arredondada limpa)
  ],
};

export const BEARD_TEMPLATES_SIDE = {
  stubble: [
    '....................', // +5
    '....................', // +6
    '.....ss.............', // +7
    '.....ssss...........', // +8
    '......sss...........', // +9
  ],
  mustache: [
    '....................',
    '....................',
    '.....dHH............',
    '......M.............',
  ],
  handlebar: [
    '....................',
    '....................',
    '.....dHHd...........',
    '......M.d...........',
  ],
  goatee: [
    '....................',
    '....................',
    '.....dHH............',
    '.....dM.............',
    '.....ddd............',
    '......OO............',
  ],
  short_beard: [
    '....................', // +5
    '.........d..........', // +6 (costeleta fina)
    '.....dH..d..........', // +7 (bochecha livre no meio!)
    '.....dMddd..........', // +8
    '......dddd..........', // +9
    '.......OOO..........', // +10
  ],
  full_beard: [
    '....................', // +5
    '.........d..........', // +6 (bochecha livre!)
    '.....dH..H..........', // +7
    '.....HMHHd..........', // +8
    '.....dHHHdd.........', // +9
    '......OdddO.........', // +10
    '.......OOO..........', // +11
  ],
};

// ============================================================================
// 3. MOTOR RASTERIZADOR EM CAMADAS (20 x 28 PIXELS DE ARTE)
// ============================================================================

const createCanvas = () =>
  Array.from({ length: CHAR_H }, () => Array(CHAR_W).fill(null));

const setPx = (grid, x, y, hex) => {
  if (x >= 0 && x < CHAR_W && y >= 0 && y < CHAR_H && hex) {
    grid[y][x] = hex;
  }
};

const fillRect = (grid, x, y, w, h, hex) => {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setPx(grid, x + dx, y + dy, hex);
    }
  }
};

const strokeBox = (grid, x, y, w, h, fillHex, outlineHex = OUTLINE_HEX) => {
  fillRect(grid, x, y, w, h, outlineHex);
  if (w > 2 && h > 2) {
    fillRect(grid, x + 1, y + 1, w - 2, h - 2, fillHex);
  }
};

const mirrorCanvas = (grid) => grid.map((row) => [...row].reverse());

/** Aplica uma matriz de template de cabelo sobre o canvas. */
const applyHairTemplate = (grid, rows, startY, palette) => {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const y = startY + r;
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch !== '.' && ch !== ' ' && palette[ch]) {
        setPx(grid, x, y, palette[ch]);
      }
    }
  }
};

/**
 * Renderiza um personagem completo para uma matriz 20x28 de cores hexadecimais.
 */
export const renderCharacterGrid = (spec, facing = 'down', frame = 0) => {
  if (facing === 'right') {
    const leftFlipFrame = frame === 1 ? 2 : frame === 2 ? 1 : 0;
    return mirrorCanvas(renderCharacterGrid(spec, 'left', leftFlipFrame));
  }

  const grid = createCanvas();

  // Paletas derivadas
  const skin = SKIN_PALETTES[spec.skinTone ?? 1] ?? SKIN_PALETTES[1];
  const hairBase = (HAIR_COLORS[spec.hairColor ?? 1] ?? HAIR_COLORS[1]).base;
  const hairLight = shadeHex(hairBase, 0.28);
  const hairDark = shadeHex(hairBase, -0.28);

  const topBase = (CLOTH_COLORS[spec.topColor ?? 0] ?? CLOTH_COLORS[0]).base;
  const topLight = shadeHex(topBase, 0.22);
  const topDark = shadeHex(topBase, -0.25);

  const accBase = (CLOTH_COLORS[spec.accentColor ?? 3] ?? CLOTH_COLORS[3]).base;
  const accDark = shadeHex(accBase, -0.25);

  const botBase = (BOTTOM_COLORS[spec.bottomColor ?? 0] ?? BOTTOM_COLORS[0])
    .base;
  const botDark = shadeHex(botBase, -0.25);

  const shoePal = SHOE_COLORS[spec.shoeColor ?? 0] ?? SHOE_COLORS[0];
  const shoeBase = shoePal.base;
  const shoeAccent = shoePal.accent;

  const bodyType = spec.bodyType ?? 'regular';
  const heightType = spec.heightType ?? 'average';
  const hairStyle = spec.hairStyle ?? 'parted';
  const hairLength = spec.hairLength ?? 'short';
  const faceStyle = spec.faceStyle ?? 'happy';
  const facialHair = spec.facialHair ?? 'none';
  const topStyle = spec.topStyle ?? 'tshirt';
  const bottomStyle = spec.bottomStyle ?? 'pants';
  const shoeStyle = spec.shoeStyle ?? 'sneakers';
  const accessory = spec.accessory ?? 'none';

  // Geometria vertical por Altura (short, average, tall)
  const headTop = heightType === 'tall' ? 2 : heightType === 'short' ? 4 : 3;
  const headH = 10;
  const headBottom = headTop + headH - 1;
  const torsoTop = headBottom + 1;
  const torsoH = heightType === 'tall' ? 8 : heightType === 'short' ? 6 : 7;
  const torsoBottom = torsoTop + torsoH - 1;
  const legsTop = torsoBottom + 1;
  const feetBottom = 26;

  // REGRA FIXA: A cabeça tem SEMPRE o mesmo tamanho (12px frontal, 11px perfil)!
  // Apenas o CORPO (`torsoW` e quadril/pernas) muda quando `bodyType === 'chubby'` ou `'slim'`.
  const isSide = facing === 'left';
  const headW = isSide ? 11 : 12;
  const headX = Math.floor((CHAR_W - headW) / 2); // Sempre 4 na visão frontal (colunas 4..15)

  const torsoW = isSide
    ? bodyType === 'chubby'
      ? 10
      : bodyType === 'slim'
        ? 6
        : 8
    : bodyType === 'chubby'
      ? 12
      : bodyType === 'slim'
        ? 8
        : 10;
  const torsoX = Math.floor((CHAR_W - torsoW) / 2);

  // -------------------------------------------------------------------------
  // CAMADA 0: Cabelo Traseiro (Médio nos ombros ou Longo descendo pelas costas)
  // -------------------------------------------------------------------------
  if (
    hairStyle !== 'bald' &&
    hairStyle !== 'buzz' &&
    hairStyle !== 'mohawk' &&
    hairStyle !== 'bun'
  ) {
    const wearingHatEarly = accessory === 'cap' || accessory === 'beanie';
    const extraBack =
      hairLength === 'long' ? 5 : hairLength === 'medium' ? 2 : 0;
    if (extraBack > 0) {
      const backStart = wearingHatEarly ? headTop + 5 : headTop + 4;
      const backBottom = torsoTop + extraBack;
      const bx = headX - 1;
      const bw = headW + 2;
      for (let y = backStart; y <= backBottom; y++) {
        const taper = y === backBottom ? 1 : 0;
        setPx(grid, bx + taper, y, OUTLINE_HEX);
        setPx(grid, bx + bw - 1 - taper, y, OUTLINE_HEX);
        for (let x = bx + 1 + taper; x < bx + bw - 1 - taper; x++) {
          setPx(grid, x, y, y >= backBottom - 1 ? hairDark : hairBase);
        }
      }
      for (let x = bx + 2; x < bx + bw - 2; x++) {
        setPx(grid, x, backBottom + 1, OUTLINE_HEX);
      }
    }
  }

  // -------------------------------------------------------------------------
  // CAMADA 1: Pernas, Bermudas/Calças/Saia e Tênis/Calçados
  // -------------------------------------------------------------------------
  const legW = bodyType === 'chubby' ? 4 : 3;
  const leftLegX = isSide ? 8 : bodyType === 'chubby' ? 5 : 6;
  const rightLegX = isSide ? 8 : CHAR_W - leftLegX - legW;

  const leftLift = frame === 1 ? -1 : 0;
  const rightLift = frame === 2 ? -1 : 0;
  const sideStepOffset = isSide ? (frame === 1 ? -2 : frame === 2 ? 2 : 0) : 0;

  const drawSingleLeg = (lx, lift, isBackLeg = false) => {
    const topY = legsTop;
    const botY = feetBottom + lift;
    const h = botY - topY + 1;
    if (h < 3) return;

    const shadeMod = isBackLeg ? -0.15 : 0;
    const pColor = shadeHex(botBase, shadeMod);
    const pShadow = shadeHex(botDark, shadeMod);
    const sColor = shadeHex(shoeBase, shadeMod);
    const sAcc = shadeHex(shoeAccent, shadeMod);

    for (let y = topY; y <= botY; y++) {
      const relY = y - topY;
      const isShoe = y >= botY - 2;
      const isHighTop =
        (shoeStyle === 'high_tops' || shoeStyle === 'boots') && y === botY - 3;

      setPx(grid, lx - 1, y, OUTLINE_HEX);
      setPx(grid, lx + legW, y, OUTLINE_HEX);

      for (let dx = 0; dx < legW; dx++) {
        let pixel = pColor;

        if (bottomStyle === 'shorts' || bottomStyle === 'cargo_shorts') {
          const shortsEnd = Math.max(1, Math.floor(h * 0.42));
          if (relY < shortsEnd) {
            pixel = dx === legW - 1 ? pShadow : pColor;
            if (
              bottomStyle === 'cargo_shorts' &&
              relY === shortsEnd - 1 &&
              dx === 0
            ) {
              pixel = pShadow;
            }
          } else {
            pixel = dx === legW - 1 ? skin.shadow : skin.base;
          }
        } else if (bottomStyle === 'skirt') {
          const skirtEnd = Math.max(1, Math.floor(h * 0.38));
          pixel =
            relY < skirtEnd
              ? dx % 2 === 0
                ? pColor
                : pShadow
              : dx === legW - 1
                ? skin.shadow
                : skin.base;
        } else {
          pixel = dx === legW - 1 ? pShadow : pColor;
          if (bottomStyle === 'joggers' && y === botY - 3) {
            pixel = OUTLINE_HEX;
          }
        }

        if (isHighTop) {
          pixel = sColor;
        } else if (isShoe) {
          if (y === botY) {
            pixel =
              shoeStyle === 'sneakers' ||
              shoeStyle === 'high_tops' ||
              shoeStyle === 'running'
                ? '#f5f7fa'
                : shadeHex(sColor, -0.35);
          } else if (y === botY - 1) {
            pixel =
              shoeStyle === 'slides'
                ? dx === 1
                  ? sColor
                  : skin.base
                : dx === 1 &&
                    (shoeStyle === 'sneakers' || shoeStyle === 'running')
                  ? sAcc
                  : sColor;
          } else {
            pixel =
              shoeStyle === 'slides' ? skin.base : dx === 1 ? sAcc : sColor;
          }
        }

        setPx(grid, lx + dx, y, pixel);
      }
    }
    for (let dx = -1; dx <= legW; dx++) {
      setPx(grid, lx + dx, botY + 1, OUTLINE_HEX);
    }
  };

  if (isSide) {
    if (frame !== 0) {
      drawSingleLeg(leftLegX - sideStepOffset, 0, true);
      drawSingleLeg(leftLegX + sideStepOffset, -1, false);
    } else {
      drawSingleLeg(leftLegX, 0, false);
    }
  } else {
    drawSingleLeg(leftLegX, leftLift, false);
    drawSingleLeg(rightLegX, rightLift, false);
    const hipW = rightLegX + legW - leftLegX;
    for (let x = leftLegX; x < leftLegX + hipW; x++) {
      setPx(grid, x, legsTop, botBase);
      if (bottomStyle === 'skirt') {
        setPx(grid, x, legsTop + 1, x % 2 === 0 ? botBase : botDark);
      }
    }
    setPx(grid, Math.floor(CHAR_W / 2), legsTop, botDark);
  }

  // -------------------------------------------------------------------------
  // CAMADA 2: Tronco, Roupas Superiores e Braços/Mãos
  // -------------------------------------------------------------------------
  strokeBox(grid, torsoX, torsoTop, torsoW, torsoH, topBase);

  for (let y = torsoTop + 1; y < torsoBottom; y++) {
    setPx(grid, torsoX + 1, y, topLight);
    setPx(grid, torsoX + torsoW - 2, y, topDark);
  }
  for (let x = torsoX + 1; x < torsoX + torsoW - 1; x++) {
    setPx(grid, x, torsoBottom - 1, topDark);
  }

  // Barriga arredondada exclusiva para o corpo `chubby` (sem alterar a cabeça!)
  if (bodyType === 'chubby') {
    if (!isSide) {
      for (let y = torsoTop + 2; y <= torsoBottom - 1; y++) {
        setPx(grid, torsoX - 1, y, OUTLINE_HEX);
        setPx(grid, torsoX, y, topLight);
        setPx(grid, torsoX + torsoW - 1, y, topDark);
        setPx(grid, torsoX + torsoW, y, OUTLINE_HEX);
      }
    } else {
      // Barriga projetada para a frente no perfil
      for (let y = torsoTop + 2; y <= torsoBottom - 1; y++) {
        setPx(grid, torsoX - 1, y, OUTLINE_HEX);
        setPx(grid, torsoX, y, topLight);
      }
    }
  }

  const cx = Math.floor(CHAR_W / 2);
  if (facing !== 'up') {
    if (topStyle === 'striped') {
      for (let y = torsoTop + 2; y < torsoBottom - 1; y += 2) {
        for (let x = torsoX + 1; x < torsoX + torsoW - 1; x++) {
          setPx(grid, x, y, accBase);
        }
      }
    } else if (topStyle === 'polo') {
      setPx(grid, cx - 2, torsoTop + 1, topDark);
      setPx(grid, cx + 1, torsoTop + 1, topDark);
      setPx(grid, cx - 1, torsoTop + 1, skin.base);
      setPx(grid, cx, torsoTop + 1, skin.base);
      setPx(grid, cx - 1, torsoTop + 2, '#f5f7fa');
      setPx(grid, cx, torsoTop + 3, '#f5f7fa');
    } else if (topStyle === 'hoodie') {
      setPx(grid, cx - 2, torsoTop + 1, '#f5f7fa');
      setPx(grid, cx - 2, torsoTop + 2, '#f5f7fa');
      setPx(grid, cx + 1, torsoTop + 1, '#f5f7fa');
      setPx(grid, cx + 1, torsoTop + 2, '#f5f7fa');
      for (let x = torsoX + 2; x < torsoX + torsoW - 2; x++) {
        setPx(grid, x, torsoBottom - 2, topDark);
      }
    } else if (topStyle === 'shirt_tie') {
      setPx(grid, cx - 2, torsoTop + 1, '#f5f7fa');
      setPx(grid, cx + 1, torsoTop + 1, '#f5f7fa');
      for (let y = torsoTop + 1; y < torsoBottom - 1; y++) {
        setPx(grid, cx - 1, y, y === torsoTop + 1 ? accDark : accBase);
        setPx(grid, cx, y, accDark);
      }
    } else if (topStyle === 'jacket' || topStyle === 'suit') {
      const innerHex = topStyle === 'suit' ? '#f5f7fa' : accBase;
      for (let y = torsoTop + 1; y < torsoBottom; y++) {
        setPx(grid, cx - 1, y, innerHex);
        setPx(grid, cx, y, shadeHex(innerHex, -0.12));
        setPx(grid, cx - 2, y, topDark);
        setPx(grid, cx + 1, y, topDark);
      }
      if (topStyle === 'suit') {
        setPx(grid, cx - 1, torsoTop + 2, '#e05a52');
        setPx(grid, cx, torsoTop + 3, '#e05a52');
      }
    } else if (topStyle === 'overalls') {
      for (let y = torsoTop + 1; y < torsoBottom; y++) {
        setPx(grid, torsoX + 2, y, accBase);
        setPx(grid, torsoX + torsoW - 3, y, accBase);
      }
      for (let y = torsoTop + 3; y < torsoBottom; y++) {
        for (let x = torsoX + 2; x < torsoX + torsoW - 2; x++) {
          setPx(grid, x, y, y === torsoTop + 3 ? accDark : accBase);
        }
      }
      setPx(grid, torsoX + 2, torsoTop + 2, '#f7cf59');
      setPx(grid, torsoX + torsoW - 3, torsoTop + 2, '#f7cf59');
    } else if (topStyle === 'sweater') {
      for (let x = torsoX + 1; x < torsoX + torsoW - 1; x++) {
        setPx(grid, x, torsoTop + 1, accBase);
        setPx(grid, x, torsoBottom - 1, accDark);
      }
    } else if (topStyle === 'tank') {
      setPx(grid, torsoX + 1, torsoTop + 1, skin.base);
      setPx(grid, torsoX + torsoW - 2, torsoTop + 1, skin.base);
      setPx(grid, cx - 1, torsoTop + 1, skin.base);
      setPx(grid, cx, torsoTop + 1, skin.base);
    }
  }

  if (accessory === 'lanyard' && facing === 'down') {
    setPx(grid, cx - 2, torsoTop + 1, '#58a6b8');
    setPx(grid, cx + 1, torsoTop + 1, '#58a6b8');
    setPx(grid, cx - 1, torsoTop + 2, '#58a6b8');
    setPx(grid, cx, torsoTop + 2, '#58a6b8');
    setPx(grid, cx - 1, torsoTop + 3, '#f5f7fa');
    setPx(grid, cx, torsoTop + 3, '#f5f7fa');
    setPx(grid, cx - 1, torsoTop + 4, '#397f94');
    setPx(grid, cx, torsoTop + 4, '#f5f7fa');
  }

  // Braços e Mãos (ajustados à largura do corpo `torsoX`)
  const armH = torsoH - 1;
  const sleeveShort =
    topStyle === 'tshirt' || topStyle === 'polo' || topStyle === 'tank';
  if (!isSide) {
    const leftArmX = bodyType === 'chubby' ? torsoX - 3 : torsoX - 2;
    const rightArmX =
      bodyType === 'chubby' ? torsoX + torsoW : torsoX + torsoW - 1;
    const drawFrontArm = (ax, swing) => {
      const ay = torsoTop + 1 + swing;
      for (let dy = 0; dy < armH; dy++) {
        const isHand = dy >= armH - 2;
        const isSkinArm =
          topStyle === 'tank' || (sleeveShort && dy >= Math.floor(armH / 2));
        const fill = isHand
          ? skin.base
          : isSkinArm
            ? skin.shadow
            : dy === 0
              ? topLight
              : topBase;
        setPx(grid, ax, ay + dy, OUTLINE_HEX);
        setPx(grid, ax + 1, ay + dy, fill);
        setPx(grid, ax + 2, ay + dy, OUTLINE_HEX);
      }
      setPx(grid, ax + 1, ay - 1, OUTLINE_HEX);
      setPx(grid, ax + 1, ay + armH, OUTLINE_HEX);
    };
    drawFrontArm(leftArmX, frame === 1 ? 1 : frame === 2 ? -1 : 0);
    drawFrontArm(rightArmX, frame === 2 ? 1 : frame === 1 ? -1 : 0);
  } else {
    const armX = cx - 1 + (frame === 1 ? 1 : frame === 2 ? -1 : 0);
    for (let dy = 1; dy < armH; dy++) {
      const isHand = dy >= armH - 2;
      const fill = isHand
        ? skin.base
        : sleeveShort && dy >= Math.floor(armH / 2)
          ? skin.base
          : topLight;
      setPx(grid, armX - 1, torsoTop + dy, OUTLINE_HEX);
      setPx(grid, armX, torsoTop + dy, fill);
      setPx(grid, armX + 1, torsoTop + dy, fill);
      setPx(grid, armX + 2, torsoTop + dy, OUTLINE_HEX);
    }
    setPx(grid, armX, torsoTop + armH, OUTLINE_HEX);
    setPx(grid, armX + 1, torsoTop + armH, OUTLINE_HEX);
  }

  // -------------------------------------------------------------------------
  // CAMADA 3: Cabeça (Tamanho Único Padronizado), Orelhas, Rosto e Barba
  // -------------------------------------------------------------------------
  for (let dy = 0; dy < headH; dy++) {
    const y = headTop + dy;
    const inset =
      dy === 0 || dy === headH - 1 ? 2 : dy === 1 || dy === headH - 2 ? 1 : 0;
    const rowX = headX + inset;
    const rowW = headW - inset * 2;
    setPx(grid, rowX, y, OUTLINE_HEX);
    setPx(grid, rowX + rowW - 1, y, OUTLINE_HEX);
    for (let x = rowX + 1; x < rowX + rowW - 1; x++) {
      const isBorder =
        dy === 0 ||
        dy === headH - 1 ||
        ((dy === 1 || dy === headH - 2) &&
          (x === rowX + 1 || x === rowX + rowW - 2));
      if (isBorder) {
        setPx(grid, x, y, OUTLINE_HEX);
      } else {
        const isBottomShade = dy >= headH - 2 || x === rowX + rowW - 2;
        setPx(grid, x, y, isBottomShade ? skin.shadow : skin.base);
      }
    }
  }

  // Orelhas laterais
  if (!isSide) {
    const earY = headTop + 5;
    setPx(grid, headX - 1, earY, OUTLINE_HEX);
    setPx(grid, headX - 1, earY + 1, skin.shadow);
    setPx(grid, headX - 2, earY + 1, OUTLINE_HEX);
    setPx(grid, headX - 1, earY + 2, OUTLINE_HEX);

    setPx(grid, headX + headW, earY, OUTLINE_HEX);
    setPx(grid, headX + headW, earY + 1, skin.shadow);
    setPx(grid, headX + headW + 1, earY + 1, OUTLINE_HEX);
    setPx(grid, headX + headW, earY + 2, OUTLINE_HEX);
  }

  // Expressões Faciais (`faceStyle`)
  const eyeY = headTop + 5;
  const mouthY = headTop + 8;
  if (facing === 'down') {
    const leftEyeX = cx - 3;
    const rightEyeX = cx + 2;

    if (faceStyle === 'wink') {
      setPx(grid, leftEyeX, eyeY + 1, OUTLINE_HEX);
      setPx(grid, leftEyeX + 1, eyeY + 1, OUTLINE_HEX);
      setPx(grid, rightEyeX, eyeY, OUTLINE_HEX);
      setPx(grid, rightEyeX, eyeY + 1, OUTLINE_HEX);
    } else if (faceStyle === 'chill') {
      setPx(grid, leftEyeX, eyeY + 1, OUTLINE_HEX);
      setPx(grid, leftEyeX + 1, eyeY + 1, OUTLINE_HEX);
      setPx(grid, rightEyeX - 1, eyeY + 1, OUTLINE_HEX);
      setPx(grid, rightEyeX, eyeY + 1, OUTLINE_HEX);
    } else {
      setPx(grid, leftEyeX, eyeY, OUTLINE_HEX);
      setPx(grid, leftEyeX, eyeY + 1, OUTLINE_HEX);
      setPx(grid, rightEyeX, eyeY, OUTLINE_HEX);
      setPx(grid, rightEyeX, eyeY + 1, OUTLINE_HEX);
    }

    if (faceStyle === 'focused') {
      setPx(grid, leftEyeX, eyeY - 1, hairDark);
      setPx(grid, leftEyeX + 1, eyeY - 1, hairDark);
      setPx(grid, rightEyeX - 1, eyeY - 1, hairDark);
      setPx(grid, rightEyeX, eyeY - 1, hairDark);
    }
    if (
      faceStyle === 'blush' ||
      faceStyle === 'happy' ||
      faceStyle === 'wink'
    ) {
      setPx(grid, leftEyeX - 1, eyeY + 2, skin.blush);
      setPx(grid, rightEyeX + 1, eyeY + 2, skin.blush);
    }

    if (faceStyle === 'surprised') {
      setPx(grid, cx - 1, mouthY, OUTLINE_HEX);
      setPx(grid, cx, mouthY, OUTLINE_HEX);
    } else if (faceStyle === 'smirk') {
      setPx(grid, cx - 1, mouthY, skin.shadow);
      setPx(grid, cx, mouthY, OUTLINE_HEX);
      setPx(grid, cx + 1, mouthY - 1, OUTLINE_HEX);
    } else if (faceStyle === 'calm' || faceStyle === 'focused') {
      setPx(grid, cx - 1, mouthY, skin.shadow);
      setPx(grid, cx, mouthY, skin.shadow);
    } else {
      setPx(grid, cx - 1, mouthY, OUTLINE_HEX);
      setPx(grid, cx, mouthY, OUTLINE_HEX);
    }
  } else if (facing === 'left') {
    const sideEyeX = headX + 3;
    setPx(grid, sideEyeX, eyeY, OUTLINE_HEX);
    setPx(grid, sideEyeX, eyeY + 1, OUTLINE_HEX);
    setPx(grid, sideEyeX, mouthY, skin.shadow);
  }

  // Barba / Pelos Faciais (`facialHair`) — Templates Artesanais Esculpidos à Mão
  if (facialHair !== 'none' && facing !== 'up') {
    const beardPalette = {
      O: OUTLINE_HEX,
      H: hairBase,
      h: hairLight,
      d: hairDark,
      M: skin.shadow,
      s: shadeHex(skin.shadow, -0.18),
    };
    const bTemplate = isSide
      ? BEARD_TEMPLATES_SIDE[facialHair]
      : BEARD_TEMPLATES_FRONT[facialHair];
    if (bTemplate) {
      applyHairTemplate(grid, bTemplate, headTop + 5, beardPalette);
    }
  }

  // -------------------------------------------------------------------------
  // CAMADA 4: Cabelo Esculpido à Mão (Templates Artesanais)
  //   - Se o personagem estiver de Boné (`cap`) ou Touca (`beanie`), o chapéu
  //     substitui o topo do cabelo (para não vazar coque/topete/afro por cima),
  //     mantendo apenas a parte de baixo quando o cabelo for médio ou longo!
  // -------------------------------------------------------------------------
  const wearingHat = accessory === 'cap' || accessory === 'beanie';

  if (hairStyle !== 'bald') {
    if (!wearingHat) {
      const hairPalette = {
        O: OUTLINE_HEX,
        H: hairBase,
        h: hairLight,
        d: hairDark,
        A: accBase,
      };

      const startY = hairStyle === 'bun' ? headTop - 3 : headTop - 2;
      const template = isSide
        ? (HAIR_TEMPLATES_SIDE[hairStyle] ?? HAIR_TEMPLATES_SIDE.parted)
        : (HAIR_TEMPLATES_FRONT[hairStyle] ?? HAIR_TEMPLATES_FRONT.parted);

      applyHairTemplate(grid, template, startY, hairPalette);
    } else if (hairLength === 'medium' || hairLength === 'long') {
      // Com boné/touca e cabelo médio/longo: aparece apenas a parte de baixo saindo sob o chapéu
      if (!isSide) {
        setPx(grid, headX + 1, headTop + 4, hairDark);
        setPx(grid, headX + headW - 2, headTop + 4, hairDark);
      } else {
        for (let y = headTop + 4; y <= headTop + 8; y++) {
          setPx(grid, headX + headW - 3, y, hairBase);
          setPx(grid, headX + headW - 2, y, hairDark);
          setPx(grid, headX + headW - 1, y, OUTLINE_HEX);
        }
      }
    }

    // Mechas frontais longas caindo sobre os ombros quando `hairLength === 'long'`
    // (Mesmo com boné/touca, a parte de baixo longa continua caindo sobre os ombros!)
    if (
      hairLength === 'long' &&
      !isSide &&
      hairStyle !== 'buzz' &&
      hairStyle !== 'mohawk'
    ) {
      const strandStart = wearingHat ? headTop + 5 : headTop + 6;
      for (let y = strandStart; y <= torsoTop + 3; y++) {
        // Mecha esquerda
        setPx(grid, headX, y, OUTLINE_HEX);
        setPx(grid, headX + 1, y, y >= torsoTop + 2 ? hairDark : hairBase);
        setPx(grid, headX + 2, y, OUTLINE_HEX);
        // Mecha direita
        setPx(grid, headX + headW - 3, y, OUTLINE_HEX);
        setPx(
          grid,
          headX + headW - 2,
          y,
          y >= torsoTop + 2 ? hairDark : hairBase,
        );
        setPx(grid, headX + headW - 1, y, OUTLINE_HEX);
      }
      setPx(grid, headX + 1, torsoTop + 4, OUTLINE_HEX);
      setPx(grid, headX + headW - 2, torsoTop + 4, OUTLINE_HEX);
    }

    // Se estiver de costas (`facing === 'up'`), preenche a nuca abaixo do chapéu (ou toda a cabeça sem chapéu)
    if (facing === 'up') {
      const backStart = wearingHat ? 4 : 2;
      const backEnd = wearingHat && hairLength === 'short' ? 5 : headH - 1;
      for (let dy = backStart; dy < backEnd; dy++) {
        const y = headTop + dy;
        for (let x = headX + 1; x < headX + headW - 1; x++) {
          setPx(grid, x, y, dy >= headH - 3 ? hairDark : hairBase);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // CAMADA 5: Acessórios de Cabeça e Óculos (`accessory`)
  // -------------------------------------------------------------------------
  if (
    accessory === 'glasses' ||
    accessory === 'round_glasses' ||
    accessory === 'sunglasses'
  ) {
    const frameHex = accessory === 'round_glasses' ? '#454c5c' : '#2d313b';
    const lensHex = accessory === 'sunglasses' ? '#2d313b' : '#d9f5ff';
    if (facing === 'down') {
      // Armação compacta 3x2 (libera a testa em eyeY-1 e as bochechas em eyeY+2!)
      fillRect(grid, cx - 4, eyeY, 3, 2, frameHex);
      setPx(grid, cx - 3, eyeY, lensHex);
      if (accessory !== 'sunglasses')
        setPx(grid, cx - 3, eyeY + 1, OUTLINE_HEX);
      // Ponte fina de 1px entre as lentes
      setPx(grid, cx - 1, eyeY, frameHex);
      setPx(grid, cx, eyeY, frameHex);
      // Lente direita
      fillRect(grid, cx + 1, eyeY, 3, 2, frameHex);
      setPx(grid, cx + 2, eyeY, lensHex);
      if (accessory !== 'sunglasses')
        setPx(grid, cx + 2, eyeY + 1, OUTLINE_HEX);
    } else if (facing === 'left') {
      fillRect(grid, headX + 2, eyeY, 3, 2, frameHex);
      setPx(grid, headX + 3, eyeY, lensHex);
      setPx(grid, headX + 5, eyeY, frameHex);
      setPx(grid, headX + 6, eyeY, frameHex);
    }
  } else if (accessory === 'headphones' && !isSide) {
    for (let x = headX + 1; x < headX + headW - 1; x++) {
      setPx(grid, x, headTop - 1, '#454c5c');
    }
    fillRect(grid, headX - 2, headTop + 4, 2, 4, '#397f94');
    fillRect(grid, headX + headW, headTop + 4, 2, 4, '#397f94');
  } else if (accessory === 'beanie') {
    const capLight = shadeHex(accBase, 0.25);
    const beanieFront = [
      '.......OOOOOO.......', // y = headTop - 2 (pompom)
      '......OhhhhhhO......', // y = headTop - 1
      '.....OOAAAAAAOO.....', // y = headTop + 0 (copa da touca)
      '....OAAhhhhhhAAO....', // y = headTop + 1
      '...OAAAAAAAAAAAAO...', // y = headTop + 2
      '...OAdAdAdAdAdAdO...', // y = headTop + 3 (barra canelada)
      '...OOOOOOOOOOOOOO...', // y = headTop + 4
    ];
    applyHairTemplate(grid, beanieFront, headTop - 2, {
      O: OUTLINE_HEX,
      A: accBase,
      h: capLight,
      d: accDark,
    });
  } else if (accessory === 'cap') {
    const capLight = shadeHex(accBase, 0.25);
    if (!isSide) {
      const capFront = [
        '......OOOOOOOO......', // y = headTop - 1
        '....OOdAAAAAAdOO....', // y = headTop + 0 (copa do boné)
        '...OdAAhhhhhhAAdO...', // y = headTop + 1
        '...OAAAAAAAAAAAAO...', // y = headTop + 2
        '..OOddddddddddddOO..', // y = headTop + 3 (aba frontal curvada projetando sombra)
        '..OOOOOOOOOOOOOOOO..', // y = headTop + 4
      ];
      applyHairTemplate(grid, capFront, headTop - 1, {
        O: OUTLINE_HEX,
        A: accBase,
        h: capLight,
        d: accDark,
      });
    } else {
      // Boné de perfil com aba projetada para a frente (esquerda)
      const capSide = [
        '......OOOOOOOO......', // y = headTop - 1
        '....OOAAAAAAAAOO....', // y = headTop + 0
        '...OAAhhhhhAAAAdO...', // y = headTop + 1
        '...OAAAAAAAAAAAdO...', // y = headTop + 2
        '.OOOOddddddddddOO...', // y = headTop + 3 (aba para a frente!)
        '.OdddOOOOOOOOOOO....', // y = headTop + 4
        '..OOOO..............', // y = headTop + 5
      ];
      applyHairTemplate(grid, capSide, headTop - 1, {
        O: OUTLINE_HEX,
        A: accBase,
        h: capLight,
        d: accDark,
      });
    }
  } else if (accessory === 'hair_bow' && facing !== 'up') {
    setPx(grid, headX + headW - 4, headTop, '#e3789b');
    setPx(grid, headX + headW - 3, headTop + 1, '#b83b5e');
    setPx(grid, headX + headW - 2, headTop, '#e3789b');
  }

  return grid;
};

/**
 * Converte a matriz 20x28 de cores hexadecimais em retângulos otimizados (Greedy 2D Meshing).
 */
export const compileCharacterRects = (
  spec,
  facing = 'down',
  frame = 0,
  scale = CHAR_SCALE,
) => {
  const grid = renderCharacterGrid(spec, facing, frame);
  const rects = [
    {
      x: 5 * scale,
      y: 26 * scale,
      w: 10 * scale,
      h: 2 * scale,
      fill: '#141218',
      opacity: 0.24,
    },
  ];

  const visited = Array.from({ length: CHAR_H }, () => new Uint8Array(CHAR_W));

  for (let y = 0; y < CHAR_H; y++) {
    for (let x = 0; x < CHAR_W; x++) {
      if (visited[y][x]) continue;
      const fill = grid[y][x];
      if (!fill) {
        visited[y][x] = 1;
        continue;
      }

      let w = 1;
      while (x + w < CHAR_W && !visited[y][x + w] && grid[y][x + w] === fill) {
        w++;
      }

      let h = 1;
      while (y + h < CHAR_H) {
        let canExpand = true;
        for (let dx = 0; dx < w; dx++) {
          if (visited[y + h][x + dx] || grid[y + h][x + dx] !== fill) {
            canExpand = false;
            break;
          }
        }
        if (!canExpand) break;
        h++;
      }

      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          visited[y + dy][x + dx] = 1;
        }
      }

      rects.push({
        x: x * scale,
        y: y * scale,
        w: w * scale,
        h: h * scale,
        fill,
      });
    }
  }

  return rects;
};

// ============================================================================
// 4. ELENCO DE 36 PRESETS DIVERSOS (ESTILO PRANCHA DE REFERÊNCIA 6x6)
// ============================================================================

export const CHARACTER_PRESETS = [
  {
    id: 'char_01_maya',
    name: 'Maya (UX Designer)',
    bodyType: 'regular',
    heightType: 'average',
    skinTone: 1,
    faceStyle: 'calm',
    hairStyle: 'bangs',
    hairLength: 'medium',
    hairColor: 3,
    facialHair: 'none',
    topStyle: 'jacket',
    topColor: 10,
    accentColor: 5,
    bottomStyle: 'shorts',
    bottomColor: 1,
    shoeStyle: 'sneakers',
    shoeColor: 1,
    accessory: 'none',
  },
  {
    id: 'char_02_arthur',
    name: 'Arthur (Tech Lead)',
    bodyType: 'regular',
    heightType: 'tall',
    skinTone: 0,
    faceStyle: 'focused',
    hairStyle: 'parted',
    hairLength: 'short',
    hairColor: 0,
    facialHair: 'none',
    topStyle: 'jacket',
    topColor: 7,
    accentColor: 5,
    bottomStyle: 'slacks',
    bottomColor: 4,
    shoeStyle: 'loafers',
    shoeColor: 1,
    accessory: 'glasses',
  },
  {
    id: 'char_03_bruno',
    name: 'Bruno (DevOps Senior — Alto & Barba)',
    bodyType: 'chubby',
    heightType: 'tall',
    skinTone: 2,
    faceStyle: 'happy',
    hairStyle: 'spiky',
    hairLength: 'short',
    hairColor: 2,
    facialHair: 'full_beard',
    topStyle: 'tshirt',
    topColor: 6,
    accentColor: 0,
    bottomStyle: 'pants',
    bottomColor: 0,
    shoeStyle: 'boots',
    shoeColor: 4,
    accessory: 'none',
  },
  {
    id: 'char_04_leo',
    name: 'Léo (Estagiário Front — Bermuda & Tênis)',
    bodyType: 'regular',
    heightType: 'short',
    skinTone: 1,
    faceStyle: 'happy',
    hairStyle: 'wavy',
    hairLength: 'short',
    hairColor: 1,
    facialHair: 'none',
    topStyle: 'tshirt',
    topColor: 11,
    accentColor: 5,
    bottomStyle: 'shorts',
    bottomColor: 0,
    shoeStyle: 'sneakers',
    shoeColor: 0,
    accessory: 'none',
  },
  {
    id: 'char_05_kenji',
    name: 'Kenji (Barista & Maker — Jardineira)',
    bodyType: 'slim',
    heightType: 'average',
    skinTone: 0,
    faceStyle: 'blush',
    hairStyle: 'parted',
    hairLength: 'short',
    hairColor: 0,
    facialHair: 'none',
    topStyle: 'overalls',
    topColor: 0,
    accentColor: 3,
    bottomStyle: 'pants',
    bottomColor: 0,
    shoeStyle: 'sneakers',
    shoeColor: 1,
    accessory: 'round_glasses',
  },
  {
    id: 'char_06_clara',
    name: 'Clara (Researcher — Magra & Cabelo Longo)',
    bodyType: 'slim',
    heightType: 'average',
    skinTone: 2,
    faceStyle: 'calm',
    hairStyle: 'wavy',
    hairLength: 'long',
    hairColor: 3,
    facialHair: 'none',
    topStyle: 'sweater',
    topColor: 13,
    accentColor: 1,
    bottomStyle: 'shorts',
    bottomColor: 6,
    shoeStyle: 'loafers',
    shoeColor: 4,
    accessory: 'none',
  },
  {
    id: 'char_07_guile',
    name: 'Guile (Security Eng — Alto & Topete)',
    bodyType: 'regular',
    heightType: 'tall',
    skinTone: 1,
    faceStyle: 'focused',
    hairStyle: 'spiky',
    hairLength: 'short',
    hairColor: 5,
    facialHair: 'stubble',
    topStyle: 'tank',
    topColor: 1,
    accentColor: 3,
    bottomStyle: 'cargo_shorts',
    bottomColor: 3,
    shoeStyle: 'boots',
    shoeColor: 1,
    accessory: 'none',
  },
  {
    id: 'char_08_sora',
    name: 'Sora (Game Dev — Cabelo Celeste)',
    bodyType: 'slim',
    heightType: 'short',
    skinTone: 0,
    faceStyle: 'happy',
    hairStyle: 'bangs',
    hairLength: 'medium',
    hairColor: 10,
    facialHair: 'none',
    topStyle: 'jacket',
    topColor: 2,
    accentColor: 5,
    bottomStyle: 'pants',
    bottomColor: 0,
    shoeStyle: 'high_tops',
    shoeColor: 2,
    accessory: 'none',
  },
  {
    id: 'char_09_malik',
    name: 'Malik (Product Manager)',
    bodyType: 'regular',
    heightType: 'average',
    skinTone: 7,
    faceStyle: 'calm',
    hairStyle: 'curly',
    hairLength: 'short',
    hairColor: 0,
    facialHair: 'none',
    topStyle: 'sweater',
    topColor: 1,
    accentColor: 5,
    bottomStyle: 'slacks',
    bottomColor: 1,
    shoeStyle: 'loafers',
    shoeColor: 1,
    accessory: 'lanyard',
  },
  {
    id: 'char_10_dandara',
    name: 'Dandara (Data Scientist)',
    bodyType: 'regular',
    heightType: 'tall',
    skinTone: 8,
    faceStyle: 'smirk',
    hairStyle: 'parted',
    hairLength: 'medium',
    hairColor: 0,
    facialHair: 'none',
    topStyle: 'suit',
    topColor: 6,
    accentColor: 2,
    bottomStyle: 'slacks',
    bottomColor: 5,
    shoeStyle: 'loafers',
    shoeColor: 1,
    accessory: 'none',
  },
  {
    id: 'char_11_kofi',
    name: 'Kofi (QA Lead — Jaleco/Blazer Branco)',
    bodyType: 'regular',
    heightType: 'tall',
    skinTone: 7,
    faceStyle: 'calm',
    hairStyle: 'buzz',
    hairLength: 'short',
    hairColor: 0,
    facialHair: 'goatee',
    topStyle: 'jacket',
    topColor: 5,
    accentColor: 0,
    bottomStyle: 'slacks',
    bottomColor: 5,
    shoeStyle: 'loafers',
    shoeColor: 1,
    accessory: 'none',
  },
  {
    id: 'char_12_nina',
    name: 'Nina (UI Animator — Maria-Chiquinha Rosa)',
    bodyType: 'slim',
    heightType: 'short',
    skinTone: 0,
    faceStyle: 'happy',
    hairStyle: 'twintails',
    hairLength: 'long',
    hairColor: 11,
    facialHair: 'none',
    topStyle: 'overalls',
    topColor: 10,
    accentColor: 3,
    bottomStyle: 'shorts',
    bottomColor: 6,
    shoeStyle: 'high_tops',
    shoeColor: 2,
    accessory: 'none',
  },
  {
    id: 'char_13_bia',
    name: 'Bia (People Ops)',
    bodyType: 'slim',
    heightType: 'short',
    skinTone: 0,
    faceStyle: 'calm',
    hairStyle: 'bangs',
    hairLength: 'medium',
    hairColor: 0,
    facialHair: 'none',
    topStyle: 'overalls',
    topColor: 5,
    accentColor: 0,
    bottomStyle: 'skirt',
    bottomColor: 0,
    shoeStyle: 'sneakers',
    shoeColor: 0,
    accessory: 'none',
  },
  {
    id: 'char_14_otavio',
    name: 'Otávio (DBA Senior — Corpo Gordo & Cabeça Padrão)',
    bodyType: 'chubby',
    heightType: 'tall',
    skinTone: 1,
    faceStyle: 'chill',
    hairStyle: 'parted',
    hairLength: 'short',
    hairColor: 0,
    facialHair: 'stubble',
    topStyle: 'jacket',
    topColor: 7,
    accentColor: 6,
    bottomStyle: 'pants',
    bottomColor: 1,
    shoeStyle: 'sneakers',
    shoeColor: 7,
    accessory: 'none',
  },
  {
    id: 'char_15_caio',
    name: 'Caio (Mobile Dev — Afro & Óculos)',
    bodyType: 'regular',
    heightType: 'average',
    skinTone: 5,
    faceStyle: 'happy',
    hairStyle: 'curly',
    hairLength: 'short',
    hairColor: 0,
    facialHair: 'none',
    topStyle: 'tshirt',
    topColor: 10,
    accentColor: 11,
    bottomStyle: 'shorts',
    bottomColor: 0,
    shoeStyle: 'running',
    shoeColor: 3,
    accessory: 'glasses',
  },
  {
    id: 'char_16_mimi',
    name: 'Mimi (Illustrator — Lacinho & Cabelo Cinza)',
    bodyType: 'slim',
    heightType: 'short',
    skinTone: 0,
    faceStyle: 'blush',
    hairStyle: 'bangs',
    hairLength: 'medium',
    hairColor: 7,
    facialHair: 'none',
    topStyle: 'striped',
    topColor: 5,
    accentColor: 10,
    bottomStyle: 'shorts',
    bottomColor: 8,
    shoeStyle: 'sneakers',
    shoeColor: 2,
    accessory: 'hair_bow',
  },
  {
    id: 'char_17_zuri',
    name: 'Zuri (Backend Eng — Maria-Chiquinha Longa)',
    bodyType: 'slim',
    heightType: 'average',
    skinTone: 7,
    faceStyle: 'happy',
    hairStyle: 'twintails',
    hairLength: 'long',
    hairColor: 0,
    facialHair: 'none',
    topStyle: 'overalls',
    topColor: 5,
    accentColor: 3,
    bottomStyle: 'shorts',
    bottomColor: 2,
    shoeStyle: 'sneakers',
    shoeColor: 0,
    accessory: 'none',
  },
  {
    id: 'char_18_lucas',
    name: 'Lucas (Fullstack — Bermuda & Polo)',
    bodyType: 'regular',
    heightType: 'tall',
    skinTone: 0,
    faceStyle: 'smirk',
    hairStyle: 'spiky',
    hairLength: 'short',
    hairColor: 0,
    facialHair: 'none',
    topStyle: 'polo',
    topColor: 4,
    accentColor: 5,
    bottomStyle: 'shorts',
    bottomColor: 4,
    shoeStyle: 'sneakers',
    shoeColor: 1,
    accessory: 'none',
  },
  {
    id: 'char_19_ayla',
    name: 'Ayla (Scrum Master)',
    bodyType: 'regular',
    heightType: 'average',
    skinTone: 6,
    faceStyle: 'calm',
    hairStyle: 'wavy',
    hairLength: 'long',
    hairColor: 0,
    facialHair: 'none',
    topStyle: 'polo',
    topColor: 5,
    accentColor: 6,
    bottomStyle: 'skirt',
    bottomColor: 5,
    shoeStyle: 'loafers',
    shoeColor: 1,
    accessory: 'none',
  },
  {
    id: 'char_20_sofia',
    name: 'Sofia (Product Designer)',
    bodyType: 'slim',
    heightType: 'average',
    skinTone: 5,
    faceStyle: 'happy',
    hairStyle: 'bangs',
    hairLength: 'long',
    hairColor: 0,
    facialHair: 'none',
    topStyle: 'polo',
    topColor: 5,
    accentColor: 0,
    bottomStyle: 'skirt',
    bottomColor: 1,
    shoeStyle: 'loafers',
    shoeColor: 1,
    accessory: 'none',
  },
  {
    id: 'char_21_ravi',
    name: 'Ravi (Data Engineer)',
    bodyType: 'slim',
    heightType: 'short',
    skinTone: 5,
    faceStyle: 'calm',
    hairStyle: 'parted',
    hairLength: 'short',
    hairColor: 0,
    facialHair: 'none',
    topStyle: 'polo',
    topColor: 5,
    accentColor: 7,
    bottomStyle: 'slacks',
    bottomColor: 5,
    shoeStyle: 'loafers',
    shoeColor: 1,
    accessory: 'none',
  },
  {
    id: 'char_22_marcos',
    name: 'Marcos (Architect — Corpo Gordo & Bigode)',
    bodyType: 'chubby',
    heightType: 'tall',
    skinTone: 2,
    faceStyle: 'happy',
    hairStyle: 'parted',
    hairLength: 'short',
    hairColor: 2,
    facialHair: 'mustache',
    topStyle: 'tshirt',
    topColor: 6,
    accentColor: 5,
    bottomStyle: 'pants',
    bottomColor: 7,
    shoeStyle: 'sneakers',
    shoeColor: 0,
    accessory: 'none',
  },
  {
    id: 'char_23_theo',
    name: 'Theo (Cloud Eng — Alto & Magro)',
    bodyType: 'slim',
    heightType: 'tall',
    skinTone: 1,
    faceStyle: 'calm',
    hairStyle: 'wavy',
    hairLength: 'short',
    hairColor: 3,
    facialHair: 'none',
    topStyle: 'shirt_tie',
    topColor: 5,
    accentColor: 1,
    bottomStyle: 'slacks',
    bottomColor: 3,
    shoeStyle: 'loafers',
    shoeColor: 4,
    accessory: 'none',
  },
  {
    id: 'char_24_luna',
    name: 'Luna (Creative Dev — Cabelo Roxo)',
    bodyType: 'slim',
    heightType: 'short',
    skinTone: 1,
    faceStyle: 'happy',
    hairStyle: 'bangs',
    hairLength: 'medium',
    hairColor: 12,
    facialHair: 'none',
    topStyle: 'jacket',
    topColor: 4,
    accentColor: 11,
    bottomStyle: 'shorts',
    bottomColor: 3,
    shoeStyle: 'high_tops',
    shoeColor: 8,
    accessory: 'none',
  },
  {
    id: 'char_25_dj_kai',
    name: 'Kai (Audio/RTC Eng — Headphone & Bermuda)',
    bodyType: 'slim',
    heightType: 'short',
    skinTone: 0,
    faceStyle: 'chill',
    hairStyle: 'wavy',
    hairLength: 'short',
    hairColor: 0,
    facialHair: 'none',
    topStyle: 'tank',
    topColor: 0,
    accentColor: 5,
    bottomStyle: 'shorts',
    bottomColor: 1,
    shoeStyle: 'sneakers',
    shoeColor: 0,
    accessory: 'headphones',
  },
  {
    id: 'char_26_walter',
    name: 'Walter (Staff Eng — Cavanhaque)',
    bodyType: 'regular',
    heightType: 'tall',
    skinTone: 1,
    faceStyle: 'focused',
    hairStyle: 'parted',
    hairLength: 'short',
    hairColor: 0,
    facialHair: 'goatee',
    topStyle: 'jacket',
    topColor: 10,
    accentColor: 5,
    bottomStyle: 'pants',
    bottomColor: 7,
    shoeStyle: 'loafers',
    shoeColor: 1,
    accessory: 'none',
  },
  {
    id: 'char_27_helena',
    name: 'Helena (CFO — Coque Loiro)',
    bodyType: 'regular',
    heightType: 'average',
    skinTone: 1,
    faceStyle: 'focused',
    hairStyle: 'bun',
    hairLength: 'short',
    hairColor: 6,
    facialHair: 'none',
    topStyle: 'jacket',
    topColor: 11,
    accentColor: 5,
    bottomStyle: 'slacks',
    bottomColor: 1,
    shoeStyle: 'loafers',
    shoeColor: 1,
    accessory: 'none',
  },
  {
    id: 'char_28_guga',
    name: 'Guga (SysAdmin — Corpo Gordo & Bermuda)',
    bodyType: 'chubby',
    heightType: 'short',
    skinTone: 2,
    faceStyle: 'happy',
    hairStyle: 'buzz',
    hairLength: 'short',
    hairColor: 3,
    facialHair: 'stubble',
    topStyle: 'tshirt',
    topColor: 6,
    accentColor: 2,
    bottomStyle: 'shorts',
    bottomColor: 4,
    shoeStyle: 'slides',
    shoeColor: 1,
    accessory: 'none',
  },
  {
    id: 'char_29_enzo',
    name: 'Enzo (Intern — Regata Azul & Bermuda)',
    bodyType: 'regular',
    heightType: 'average',
    skinTone: 3,
    faceStyle: 'happy',
    hairStyle: 'spiky',
    hairLength: 'short',
    hairColor: 2,
    facialHair: 'none',
    topStyle: 'tank',
    topColor: 0,
    accentColor: 5,
    bottomStyle: 'shorts',
    bottomColor: 0,
    shoeStyle: 'running',
    shoeColor: 3,
    accessory: 'none',
  },
  {
    id: 'char_30_diego',
    name: 'Diego (Growth — Listrado & Bermuda)',
    bodyType: 'regular',
    heightType: 'average',
    skinTone: 3,
    faceStyle: 'wink',
    hairStyle: 'spiky',
    hairLength: 'short',
    hairColor: 2,
    facialHair: 'none',
    topStyle: 'striped',
    topColor: 2,
    accentColor: 5,
    bottomStyle: 'shorts',
    bottomColor: 2,
    shoeStyle: 'sneakers',
    shoeColor: 6,
    accessory: 'none',
  },
  {
    id: 'char_31_noah',
    name: 'Noah (Indie Hacker — Listrado)',
    bodyType: 'slim',
    heightType: 'short',
    skinTone: 0,
    faceStyle: 'calm',
    hairStyle: 'wavy',
    hairLength: 'short',
    hairColor: 0,
    facialHair: 'none',
    topStyle: 'striped',
    topColor: 8,
    accentColor: 5,
    bottomStyle: 'shorts',
    bottomColor: 1,
    shoeStyle: 'sneakers',
    shoeColor: 1,
    accessory: 'none',
  },
  {
    id: 'char_32_eric',
    name: 'Eric (iOS Dev — Loiro & Regata)',
    bodyType: 'regular',
    heightType: 'average',
    skinTone: 1,
    faceStyle: 'happy',
    hairStyle: 'spiky',
    hairLength: 'short',
    hairColor: 5,
    facialHair: 'none',
    topStyle: 'tank',
    topColor: 0,
    accentColor: 5,
    bottomStyle: 'shorts',
    bottomColor: 0,
    shoeStyle: 'sneakers',
    shoeColor: 0,
    accessory: 'none',
  },
  {
    id: 'char_33_mel',
    name: 'Mel (Copywriter — Cabelo Castanho Longo)',
    bodyType: 'slim',
    heightType: 'short',
    skinTone: 3,
    faceStyle: 'blush',
    hairStyle: 'bangs',
    hairLength: 'long',
    hairColor: 2,
    facialHair: 'none',
    topStyle: 'sweater',
    topColor: 3,
    accentColor: 5,
    bottomStyle: 'skirt',
    bottomColor: 6,
    shoeStyle: 'loafers',
    shoeColor: 4,
    accessory: 'none',
  },
  {
    id: 'char_34_hugo',
    name: 'Hugo (AI Researcher — Óculos & Listras)',
    bodyType: 'regular',
    heightType: 'short',
    skinTone: 3,
    faceStyle: 'happy',
    hairStyle: 'parted',
    hairLength: 'short',
    hairColor: 2,
    facialHair: 'none',
    topStyle: 'striped',
    topColor: 0,
    accentColor: 5,
    bottomStyle: 'shorts',
    bottomColor: 8,
    shoeStyle: 'sneakers',
    shoeColor: 2,
    accessory: 'glasses',
  },
  {
    id: 'char_35_vovo_mentor',
    name: 'Sr. Roberto (Principal Advisor — Barba Branca)',
    bodyType: 'chubby',
    heightType: 'average',
    skinTone: 4,
    faceStyle: 'happy',
    hairStyle: 'parted',
    hairLength: 'short',
    hairColor: 8,
    facialHair: 'full_beard',
    topStyle: 'jacket',
    topColor: 0,
    accentColor: 5,
    bottomStyle: 'pants',
    bottomColor: 1,
    shoeStyle: 'loafers',
    shoeColor: 1,
    accessory: 'none',
  },
  {
    id: 'char_36_tiana',
    name: 'Tiana (VP of Engineering — Black Power)',
    bodyType: 'chubby',
    heightType: 'average',
    skinTone: 8,
    faceStyle: 'happy',
    hairStyle: 'curly',
    hairLength: 'medium',
    hairColor: 0,
    facialHair: 'none',
    topStyle: 'hoodie',
    topColor: 10,
    accentColor: 5,
    bottomStyle: 'pants',
    bottomColor: 2,
    shoeStyle: 'sneakers',
    shoeColor: 0,
    accessory: 'none',
  },
];
