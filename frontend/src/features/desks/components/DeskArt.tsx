import {
  CHAIR_COLORS,
  DESK_COLORS,
  FREE_DESK_CONFIG,
  RUG_COLORS,
  TILE,
  resolveDeskSetup,
  type DeskConfig,
  type DeskDef,
  type DeskItem,
  type DeskMachine,
  type DeskMonitor,
} from '@/shared/domain';

const INK = '#1e191d';

/** Tamanho (em pixels do mapa) da área de cada enfeite sobre a mesa (matriz 10x10 em 1.1px = 11x11px). */
const ITEM_PX = 1.1;
const ITEM_SIZE = 10 * ITEM_PX;

/**
 * Posições dos 4 enfeites dentro da área útil da superfície do tampo (`y + 2` até `y + h - 10`),
 * distribuídos nas alas laterais esquerda e direita (acima dos dois gaveteiros) para nunca
 * transbordar para fora da mesa nem colidir com monitores, teclado, mouse ou gabinete:
 * - Slot 0: Ala esquerda superior
 * - Slot 1: Ala direita superior
 * - Slot 2: Ala esquerda frontal
 * - Slot 3: Ala direita frontal
 */
const slotOf = (
  desk: DeskDef,
  index: number,
  setup: { machine: DeskMachine; monitor: DeskMonitor },
) => {
  const hasTower = setup.machine === 'desktop';
  const wideMonitors = setup.monitor === 'triple' || setup.monitor === 'dual';
  const leftBackX = desk.x + 2;
  const leftFrontX = wideMonitors ? desk.x + 14 : desk.x + 15;
  const rightFrontX = hasTower
    ? desk.x + desk.w - 33
    : desk.x + desk.w - 15 - ITEM_SIZE;
  const rightBackX = desk.x + desk.w - ITEM_SIZE - 2;

  const slots = [
    { x: leftBackX, y: desk.y + 1 },
    { x: rightBackX, y: desk.y + 1 },
    { x: leftFrontX, y: desk.y + 11 },
    { x: rightFrontX, y: desk.y + 11 },
  ];
  return slots[index] ?? slots[0]!;
};

/** Paleta padronizada `.Art` para compilar as matrizes 10x10 dos 24 itens `tag: 'desk-decor'`. */
const ITEM_PALETTE: Readonly<Record<string, string>> = {
  O: '#1e191d',
  x: '#2d313b',
  A: '#454c5c',
  a: '#697387',
  s: '#96a1b5',
  S: '#c3ccd9',
  f: '#f5f7fa',
  F: '#e1e6ef',
  e: '#c5cddb',
  h: '#f7e8d0',
  l: '#bdaea0',
  U: '#58a6b8',
  y: '#397f94',
  J: '#245566',
  G: '#7ca36b',
  g: '#59804b',
  t: '#3d5c33',
  j: '#8cd668',
  L: '#52ab3a',
  T: '#2d6e22',
  w: '#e8be8e',
  W: '#cfa06e',
  m: '#ab7b4b',
  n: '#9c653e',
  N: '#754728',
  d: '#522f18',
  R: '#e05a52',
  b: '#a33631',
  Y: '#f7cf59',
  2: '#cc962b',
  v: '#d9f5ff',
  V: '#8cd8f5',
  i: '#4fa3c7',
  9: '#5b4e7a',
};

/** Matrizes 10x10 (escala 1.5x = 15x15 px no mapa) dos 24 itens `tag: 'desk-decor'`. */
const ITEM_MATRICES: Record<DeskItem, readonly string[]> = {
  plant: [
    '..OO..OO..',
    '.OjjOOjjO.',
    '.OjLLLLjO.',
    '..OTLLTO..',
    '..OOOOOO..',
    '.ORRRRRRO.',
    '.ORbbbbRO.',
    '..ORbbRO..',
    '..ObbbbO..',
    '...OOOO...',
  ],
  lamp: [
    '..OOOOOO..',
    '.OYYYYYYO.',
    'OYffffffYO',
    'O22222222O',
    '.OOOOOOOO.',
    '....OSO...',
    '....OsO...',
    '...OOsOO..',
    '..OSSSSSO.',
    '..OOOOOOO.',
  ],
  mug: [
    '...f..f...',
    '..f..f....',
    '.OOOOOOO..',
    'Off999ffOO',
    'OffffffffO',
    'OfUUUUUUOO',
    'OyyyyyyfOO',
    'OfffffffO.',
    'OeeeeeeeO.',
    '.OOOOOOO..',
  ],
  books: [
    '..........',
    '.OOOOOOOO.',
    'OGGGGGhhhO',
    'OttttttllO',
    'OOOOOOOOOO',
    'OUUUUUhhhO',
    'OyyyyyyllO',
    'OOOOOOOOOO',
    'ORRRRRhhhO',
    'OOOOOOOOOO',
  ],
  cactus: [
    '....OR....',
    '...OjjO...',
    '.OOjLLjOO.',
    'OjLLLLLLjO',
    'OTLTTTTLTO',
    '.OOTLLTOO.',
    '..OOOOOO..',
    '..O2222O..',
    '..O2222O..',
    '...OOOO...',
  ],
  duck: [
    '...OOOO...',
    '..OYYYYO..',
    '..OYxYYOO.',
    '..OYYYYRRO',
    '.OO2222OO.',
    'OYYYYYYYO.',
    'OYfYYYYYO.',
    'O2222222O.',
    '.OOOOOOO..',
    '..........',
  ],
  headphones: [
    '..OOOOOO..',
    '.OAAAAAAO.',
    'OAO....OAO',
    'OxO....OxO',
    'OUUO..OUUO',
    'OyyO..OyyO',
    'OJJO..OJJO',
    '.OO....OO.',
    '..........',
    '..........',
  ],
  trophy: [
    '.OOOOOOOO.',
    'OYYfYYYYYO',
    'OAOYYYYOAO',
    '.OOY22YOO.',
    '..OO22OO..',
    '...O22O...',
    '..OO22OO..',
    '.ONNNNNNO.',
    '.OddddddO.',
    '..OOOOOO..',
  ],
  cat: [
    '.OO....OO.',
    'O2YO..OY2O',
    'OYYYYYYYYO',
    'OYxYYYYxYO',
    'OYYYRYYYYO',
    'O22222222O',
    'OYYYYYY22O',
    '.OOOOOOOO.',
    '..........',
    '..........',
  ],
  mic: [
    '...OOOO...',
    '..OSSSSO..',
    '..OsasSO..',
    '..OSSSSO..',
    '..OAxxAO..',
    '..OAGGAA..',
    '...OxxO...',
    '...OxxO...',
    '..OxxxxO..',
    '..OOOOOO..',
  ],
  controller: [
    '..........',
    '.OOOOOOOO.',
    'OAAAAAAAAO',
    'OAfAxxARAO',
    'OAffxxUGAO',
    'OAAAAAAAAO',
    'OxxOOOOxxO',
    'OxxO..OxxO',
    '.OO....OO.',
    '..........',
  ],
  globe: [
    '...OOOO...',
    '..OVLLVO..',
    '.OVLLLLVO.',
    '.OVViiLVO.',
    '..OiiLiO..',
    '...O22O...',
    '...O22O...',
    '..OO22OO..',
    '.ONNNNNNO.',
    '..OOOOOO..',
  ],
  coffee: [
    '..OOOOOO..',
    '.ORRRRRRO.',
    '.ObbbbbbO.',
    '..OffffO..',
    '..OWWWWO..',
    '..OmmmmO..',
    '..OffffO..',
    '..OeeeeO..',
    '...OOOO...',
    '..........',
  ],
  frame: [
    '.OOOOOOOO.',
    'OwwwwwwwwO',
    'OwOOOOOOwO',
    'OwOVVYYOwO',
    'OwOVVVVOwO',
    'OwOLLLLOwO',
    'OwOTTTTOwO',
    'OwOOOOOOwO',
    'OmmmmmmmmO',
    '.OOOOOOOO.',
  ],
  bonsai: [
    '..OOOOOO..',
    '.OjjLLLLjO',
    '.OLLLLTTTO',
    '..OOOOOnO.',
    '..OjjOnnO.',
    '..OTTOnO..',
    '..OOOOOO..',
    '.OUUUUUUO.',
    '.OJJJJJJO.',
    '..OOOOOO..',
  ],
  hourglass: [
    '.OOOOOOOO.',
    '.OYYYYYYO.',
    '..OvvvVO..',
    '..OvYYVO..',
    '...OYYO...',
    '..OvYYVO..',
    '..OYYYYO..',
    '.OYYYYYYO.',
    '.OOOOOOOO.',
    '..........',
  ],
  figure: [
    '....OO....',
    '..OOOOOO..',
    '.OSSSSSSO.',
    '.OSxVVxSO.',
    '..OOOOOO..',
    '.ORRRRRRO.',
    '.OROYYORO.',
    '..OaaaaO..',
    '..OxOOxO..',
    '..OO..OO..',
  ],
  fan: [
    '..OOOOOO..',
    '.OSSSSSSO.',
    'OSsUssUsSO',
    'OSssOOssSO',
    'OSsUssUsSO',
    '.OSSSSSSO.',
    '..OOssOO..',
    '...OaaO...',
    '..OSSSSO..',
    '..OOOOOO..',
  ],
  notebook: [
    '..........',
    '.OOOOOO.O.',
    'OAAAAAROAO',
    'OAAAAAROAO',
    'OAffAAROAO',
    'OAAAAAROAO',
    'OAAAAAROSO',
    'OhhhhhRO.O',
    '.OOOOOO...',
    '..........',
  ],
  lavaLamp: [
    '...OOOO...',
    '...OSSO...',
    '..OVRRVO..',
    '..OVRYYO..',
    '..OYYRVO..',
    '..OVRRVO..',
    '..OSSSSO..',
    '...OaaO...',
    '..OSSSSO..',
    '..OOOOOO..',
  ],
  teapot: [
    '....OO....',
    '..OOOOOO..',
    '.OGGGGGGO.',
    'OOOOggggOO',
    'OgggggggOO',
    '.OggggggO.',
    '.OttttttO.',
    '..OOOOOO..',
    '..........',
    '..........',
  ],
  camera: [
    '..........',
    '..OO..OO..',
    '.OSSSSSSO.',
    'OSSSSSSSSO',
    'OxxOOOOxxO',
    'OxOvvVVOxO',
    'OxOViiiOxO',
    'OxxOOOOxxO',
    '.OOOOOOOO.',
    '..........',
  ],
  clock: [
    '.OO....OO.',
    'OYYOOOOYYO',
    '.ORRRRRRO.',
    'ORffffffRO',
    'ORffxfffRO',
    'ORffxxffRO',
    'ORffffffRO',
    '.ORbbbbRO.',
    '.OO....OO.',
    '..........',
  ],
  rubik: [
    '..........',
    '..OOOOOO..',
    '.ORRYYUUO.',
    '.OOOOOOOO.',
    '.OYYGGRRO.',
    '.OOOOOOOO.',
    '.OUURRYYO.',
    '..OOOOOO..',
    '..........',
    '..........',
  ],
};

/** Desenha um enfeite `tag: 'desk-decor'` a partir de sua matriz 10x10 em pixel art. */
function Item({ item, x, y }: { item: DeskItem; x: number; y: number }) {
  const rows = ITEM_MATRICES[item] ?? ITEM_MATRICES.plant;
  const px = ITEM_PX;
  const rects: Array<{
    dx: number;
    dy: number;
    w: number;
    h: number;
    fill: string;
  }> = [];

  rows.forEach((row, ry) => {
    let rx = 0;
    while (rx < row.length) {
      const ch = row[rx]!;
      let end = rx + 1;
      while (end < row.length && row[end] === ch) end++;
      const fill = ITEM_PALETTE[ch];
      if (fill) {
        rects.push({
          dx: rx * px,
          dy: ry * px,
          w: (end - rx) * px,
          h: px,
          fill,
        });
      }
      rx = end;
    }
  });

  return (
    <g>
      {rects.map((r, idx) => (
        <rect
          key={idx}
          x={x + r.dx}
          y={y + r.dy}
          width={r.w}
          height={r.h}
          fill={r.fill}
        />
      ))}
    </g>
  );
}

const SCREEN = '#4fa3c7';
const SCREEN_MID = '#8cd8f5';
const SHINE = '#d9f5ff';
const KEYS = '#454c5c';
const METAL = '#c3ccd9';

/** Um monitor widescreen detalhado com código/UI na tela e suporte articulado. */
function Monitor({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <rect x={x + w / 2 - 2} y={y + 11} width={4} height={5} fill={INK} />
      <rect x={x + w / 2 - 5} y={y + 14} width={10} height={2} fill="#697387" />
      <rect x={x} y={y} width={w} height={12} fill={INK} />
      <rect x={x + 1} y={y + 1} width={w - 2} height={10} fill="#2d313b" />
      <rect x={x + 2} y={y + 2} width={w - 4} height={8} fill={SCREEN} />
      <rect
        x={x + 2}
        y={y + 2}
        width={(w - 4) * 0.55}
        height={4}
        fill={SCREEN_MID}
      />
      <rect x={x + 2} y={y + 2} width={4} height={2} fill={SHINE} />
      <rect
        x={x + 4}
        y={y + 7}
        width={Math.max(4, w - 10)}
        height={1.5}
        fill="#f5f7fa"
      />
      <rect
        x={x + 4}
        y={y + 9}
        width={Math.max(3, w - 14)}
        height={1}
        fill="#f7cf59"
      />
    </g>
  );
}

/** Um notebook aberto em suporte de alumínio: tela em cima, teclado e trackpad embaixo. */
function Laptop({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={11} fill={INK} />
      <rect x={x + 2} y={y + 2} width={w - 4} height={7} fill={SCREEN} />
      <rect x={x + 2} y={y + 2} width={6} height={2} fill={SHINE} />
      <rect x={x + 4} y={y + 6} width={w - 8} height={1.5} fill="#f5f7fa" />
      <rect x={x - 2} y={y + 11} width={w + 4} height={6} fill={INK} />
      <rect x={x - 1} y={y + 12} width={w + 2} height={4} fill={METAL} />
      <rect x={x + 1} y={y + 12.5} width={w - 2} height={2} fill={KEYS} />
    </g>
  );
}

/** Gabinete de PC compacto em cima da mesa (vidro lateral + LED sutil). */
function Tower({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={8} height={15} fill={INK} />
      <rect x={x + 1} y={y + 1} width={6} height={13} fill="#454c5c" />
      <rect x={x + 2} y={y + 2} width={4} height={8} fill="#2d313b" />
      <rect x={x + 2.5} y={y + 3} width={1.5} height={6} fill="#58a6b8" />
      <rect x={x + 4.5} y={y + 4} width={1.5} height={4} fill="#7ca36b" />
      <rect x={x + 2} y={y + 11.5} width={4} height={1.5} fill="#96a1b5" />
    </g>
  );
}

/** Monitores sempre centralizados em `cx`. */
function Monitors({
  monitor,
  cx,
  top,
}: {
  monitor: DeskMonitor;
  cx: number;
  top: number;
}) {
  switch (monitor) {
    case 'single':
      return <Monitor x={cx - 10} y={top - 2} w={20} />;
    case 'dual':
      return (
        <g>
          <Monitor x={cx - 17} y={top - 2} w={16} />
          <Monitor x={cx + 1} y={top - 2} w={16} />
        </g>
      );
    case 'ultrawide':
      return <Monitor x={cx - 16} y={top - 2} w={32} />;
    case 'triple':
      return (
        <g>
          <Monitor x={cx - 20} y={top - 1} w={13} />
          <Monitor x={cx - 6.5} y={top - 3} w={13} />
          <Monitor x={cx + 7} y={top - 1} w={13} />
        </g>
      );
    default:
      return null;
  }
}

/** O computador escolhido (desktop com gabinete ou notebook centralizado à frente dos monitores). */
function Computer({
  machine,
  monitor,
  cx,
  top,
  bottom,
}: {
  machine: DeskMachine;
  monitor: DeskMonitor;
  cx: number;
  top: number;
  bottom: number;
}) {
  const rgb = monitor === 'ultrawide';
  const keyboard = (
    <g>
      <rect x={cx - 9} y={bottom - 9} width={16} height={6} fill={INK} />
      <rect x={cx - 8} y={bottom - 8} width={14} height={4} fill="#f5f7fa" />
      <rect x={cx - 7} y={bottom - 7} width={12} height={2} fill={KEYS} />
      {rgb ? (
        <rect x={cx - 8} y={bottom - 4} width={14} height={1} fill="#58a6b8" />
      ) : null}
      <rect x={cx + 9} y={bottom - 8} width={4} height={5} fill={INK} />
      <rect x={cx + 10} y={bottom - 7} width={2} height={3} fill="#f5f7fa" />
    </g>
  );

  if (machine === 'desktop') {
    return (
      <g>
        <Monitors monitor={monitor} cx={cx} top={top} />
        {keyboard}
        <Tower x={cx + 18} y={top + 5} />
      </g>
    );
  }

  if (monitor === 'none') {
    return <Laptop x={cx - 9} y={top + 5} w={18} />;
  }

  return (
    <g>
      <Monitors monitor={monitor} cx={cx} top={top} />
      <Laptop x={cx - 7} y={top + 9} w={14} />
    </g>
  );
}

type Props = {
  desk: DeskDef;
  /** `null` para mesa livre. */
  config: DeskConfig | null;
  /** Nome na plaquinha acima da mesa (usado na prévia do editor). */
  showLabel?: boolean;
  /** Mesa livre: mostra o convite para adotar (usado fora do mapa). */
  freeHint?: boolean;
  /** Dono da mesa: o nome e o cargo aparecem acima dela quando `showLabel` está ligado. */
  owner?: { name: string; role: string } | null;
  onHoverChange?: (hovered: boolean) => void;
};

/**
 * Desenha uma estação de trabalho corporativa (`tag: 'desk-decor'`) com cantos chanfrados,
 * gaveteiros laterais com painéis rebaixados, poltrona executiva giratória com base estrela,
 * tapete ornamental e até 4 enfeites.
 */
export function DeskArt({
  desk,
  config,
  showLabel = true,
  freeHint = true,
  owner = null,
  onHoverChange,
}: Props) {
  const look = config ?? FREE_DESK_CONFIG;
  const setup = resolveDeskSetup(look);
  const { x, y, w, h } = desk;
  const top = DESK_COLORS[look.color] ?? DESK_COLORS[0];
  const chairColor = CHAIR_COLORS[look.chair ?? 0] ?? CHAIR_COLORS[0];
  const ownerLine = owner
    ? owner.role
      ? `${owner.name} · ${owner.role}`
      : owner.name
    : '';

  return (
    <g
      onMouseEnter={onHoverChange ? () => onHoverChange(true) : undefined}
      onMouseLeave={onHoverChange ? () => onHoverChange(false) : undefined}
    >
      {/* Área interativa invisível cobrindo tampo e lugares da mesa para hover suave */}
      {onHoverChange ? (
        <rect
          x={x}
          y={y}
          width={w}
          height={h + TILE}
          fill="transparent"
          style={{ cursor: 'pointer' }}
        />
      ) : null}

      {/* Tapete sob a mesa com moldura ornamental estilo `.Art` */}
      {look.rug !== null ? (
        <g>
          <rect x={x + 2} y={y + h} width={w - 4} height={TILE} fill={INK} />
          <rect
            x={x + 4}
            y={y + h + 2}
            width={w - 8}
            height={TILE - 4}
            fill={RUG_COLORS[look.rug] ?? RUG_COLORS[0]}
          />
          {look.rugPattern === 'striped' ? (
            <>
              <rect
                x={x + 12}
                y={y + h + 2}
                width={6}
                height={TILE - 4}
                fill="#ffffff"
                opacity={0.16}
              />
              <rect
                x={x + w / 2 - 3}
                y={y + h + 2}
                width={6}
                height={TILE - 4}
                fill="#ffffff"
                opacity={0.16}
              />
              <rect
                x={x + w - 18}
                y={y + h + 2}
                width={6}
                height={TILE - 4}
                fill="#ffffff"
                opacity={0.16}
              />
            </>
          ) : look.rugPattern !== 'solid' ? (
            <>
              <rect
                x={x + 7}
                y={y + h + 5}
                width={w - 14}
                height={TILE - 10}
                fill="none"
                stroke="#ffffff"
                strokeWidth={2}
                opacity={0.35}
              />
              <rect
                x={x + 11}
                y={y + h + 9}
                width={w - 22}
                height={TILE - 18}
                fill="none"
                stroke="#1e191d"
                strokeWidth={1.5}
                opacity={0.28}
              />
            </>
          ) : null}
        </g>
      ) : null}

      {/* Poltrona Executiva Giratória com Base Estrela de 5 Rodízios (Estilo Ref 4) */}
      <g>
        {/* Sombra e Base Estrela Metálica */}
        <ellipse
          cx={x + w / 2}
          cy={y + h + 25}
          rx={11}
          ry={3}
          fill="#141218"
          opacity={0.25}
        />
        <rect
          x={x + w / 2 - 2}
          y={y + h + 19}
          width={4}
          height={6}
          fill={INK}
        />
        <rect
          x={x + w / 2 - 8}
          y={y + h + 23}
          width={16}
          height={3}
          fill={INK}
        />
        <rect
          x={x + w / 2 - 6}
          y={y + h + 23}
          width={12}
          height={2}
          fill="#697387"
        />
        {/* Apoios de Braço */}
        <rect
          x={x + w / 2 - 12}
          y={y + h + 8}
          width={3}
          height={9}
          fill={INK}
        />
        <rect
          x={x + w / 2 - 11}
          y={y + h + 9}
          width={2}
          height={4}
          fill="#e1e6ef"
        />
        <rect x={x + w / 2 + 9} y={y + h + 8} width={3} height={9} fill={INK} />
        <rect
          x={x + w / 2 + 9}
          y={y + h + 9}
          width={2}
          height={4}
          fill="#e1e6ef"
        />
        {/* Encosto Estruturado Duplo */}
        <rect
          x={x + w / 2 - 9}
          y={y + h + 2}
          width={18}
          height={18}
          fill={INK}
        />
        <rect
          x={x + w / 2 - 7}
          y={y + h + 4}
          width={14}
          height={14}
          fill={chairColor}
        />
        <rect
          x={x + w / 2 - 7}
          y={y + h + 4}
          width={14}
          height={3}
          fill="#ffffff"
          opacity={0.26}
        />
        <rect
          x={x + w / 2 - 5}
          y={y + h + 8}
          width={10}
          height={7}
          fill="none"
          stroke={INK}
          strokeWidth={1.5}
          opacity={0.45}
        />
        <rect
          x={x + w / 2 - 7}
          y={y + h + 15}
          width={14}
          height={3}
          fill="#000000"
          opacity={0.24}
        />
      </g>

      {/* Bancada Corporativa com Cantos Chanfrados e Gaveteiros de Painel Rebaixado */}
      <g>
        {/* Sombra Projetada no Chão */}
        <rect
          x={x + 2}
          y={y + h + 1}
          width={w - 4}
          height={4}
          fill="#141218"
          opacity={0.24}
        />
        {/* Contorno Externo Chanfrado */}
        <rect x={x} y={y - 2} width={w} height={h + 2} fill={INK} />
        <rect x={x - 2} y={y} width={w + 4} height={h} fill={INK} />
        {/* Superfície Principal do Tampo (24px de profundidade útil para PC e 4 enfeites) */}
        <rect x={x} y={y} width={w} height={h - 8} fill={top} />
        <rect
          x={x}
          y={y}
          width={w}
          height={2.5}
          fill="#ffffff"
          opacity={0.28}
        />
        {/* Divisória sutil das duas alas laterais de apoio (sobre os gaveteiros) */}
        <rect
          x={x + 25}
          y={y + 2}
          width={1}
          height={h - 11}
          fill="#000000"
          opacity={0.14}
        />
        <rect
          x={x + w - 26}
          y={y + 2}
          width={1}
          height={h - 11}
          fill="#000000"
          opacity={0.14}
        />
        {/* Passa-cabos Duplo no Topo da Bancada */}
        <rect
          x={x + 27}
          y={y + 2}
          width={5}
          height={2.5}
          fill={INK}
          opacity={0.45}
        />
        <rect
          x={x + w - 32}
          y={y + 2}
          width={5}
          height={2.5}
          fill={INK}
          opacity={0.45}
        />
        {/* Borda Chanfrada Frontal do Tampo */}
        <rect
          x={x}
          y={y + h - 10}
          width={w}
          height={2}
          fill="#000000"
          opacity={0.2}
        />
        <rect x={x} y={y + h - 8} width={w} height={1.5} fill={INK} />
        {/* Frente com Dois Gaveteiros Laterais de Painel Rebaixado (Inset Panels) */}
        <rect x={x} y={y + h - 6.5} width={w} height={6.5} fill="#454c5c" />
        {/* Gaveteiro Esquerdo */}
        <rect x={x + 3} y={y + h - 6} width={22} height={5} fill={INK} />
        <rect x={x + 4} y={y + h - 5} width={20} height={3.5} fill="#96a1b5" />
        <rect x={x + 11} y={y + h - 4} width={6} height={1.5} fill="#f5f7fa" />
        {/* Vão Central Sombreado */}
        <rect
          x={x + 27}
          y={y + h - 6}
          width={w - 54}
          height={5}
          fill="#2d313b"
        />
        {/* Gaveteiro Direito */}
        <rect x={x + w - 25} y={y + h - 6} width={22} height={5} fill={INK} />
        <rect
          x={x + w - 24}
          y={y + h - 5}
          width={20}
          height={3.5}
          fill="#96a1b5"
        />
        <rect
          x={x + w - 17}
          y={y + h - 4}
          width={6}
          height={1.5}
          fill="#f5f7fa"
        />
      </g>

      {/* O computador da mesa, no meio (desktop com gabinete ou notebook + monitores) */}
      <Computer
        machine={setup.machine}
        monitor={setup.monitor}
        cx={x + w / 2}
        top={y}
        bottom={y + h - 7}
      />

      {look.items.map((item, index) => {
        const slot = slotOf(desk, index, setup);
        return <Item key={item} item={item} x={slot.x} y={slot.y} />;
      })}

      {showLabel && look.label ? (
        <g>
          <rect
            x={x + w / 2 - Math.max(24, look.label.length * 3.2 + 8)}
            y={y - (owner ? 36 : 24)}
            width={Math.max(48, look.label.length * 6.4 + 16)}
            height={14}
            rx={4}
            fill="#0b0e24"
            opacity={0.72}
          />
          <text
            x={x + w / 2}
            y={y - (owner ? 26 : 14)}
            fontSize={9}
            fill="#ffffff"
            textAnchor="middle"
          >
            {look.label}
          </text>
        </g>
      ) : null}
      {/* De quem é a mesa e o cargo, logo acima do tampo. */}
      {showLabel && ownerLine ? (
        <g>
          <rect
            x={x + w / 2 - ownerLine.length * 2.3 - 6}
            y={y - 17}
            width={ownerLine.length * 4.6 + 12}
            height={12}
            rx={3}
            fill="#0b0e24"
            opacity={0.6}
          />
          <text
            x={x + w / 2}
            y={y - 8}
            fontSize={8}
            fill="#e8ecff"
            textAnchor="middle"
          >
            {ownerLine}
          </text>
        </g>
      ) : null}
      {config === null && freeHint ? (
        <text
          x={x + w / 2}
          y={y - 8}
          fontSize={8}
          fill="#ffffff"
          opacity={0.7}
          textAnchor="middle"
        >
          mesa livre
        </text>
      ) : null}
    </g>
  );
}

type TooltipProps = {
  desk: DeskDef;
  config: DeskConfig | null;
  owner: { name: string; role: string } | null;
};

/**
 * Balão de informações da mesa: só aparece quando o usuário está nela
 * com o avatar ou passa o mouse por cima.
 */
export function DeskTooltip({ desk, config, owner }: TooltipProps) {
  const cx = desk.x + desk.w / 2;
  const locked = Boolean(owner && config?.locked);

  const title = owner ? config?.label || desk.name : `${desk.name} · Livre`;
  const ownerLine = owner
    ? owner.role
      ? `${owner.name} · ${owner.role}`
      : owner.name
    : 'Disponível para adotar';
  const statusLine = owner ? (locked ? 'Bloqueada pelo dono' : 'Aberta') : '';

  const longest = Math.max(
    title.length * 5.2,
    ownerLine.length * 4.4,
    statusLine.length * 4.4 + 10,
  );
  const boxW = Math.max(96, Math.ceil(longest + 18));
  const boxH = owner ? 40 : 28;
  const boxX = cx - boxW / 2;
  const boxY = Math.max(4, desk.y - boxH - 8);

  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect
        x={boxX}
        y={boxY}
        width={boxW}
        height={boxH}
        rx={5}
        fill="#0b0e24"
        fillOpacity={0.93}
        stroke={locked ? '#ff6b81' : '#3a4180'}
        strokeWidth={1.2}
      />
      <polygon
        points={`${cx - 4},${boxY + boxH} ${cx + 4},${boxY + boxH} ${cx},${boxY + boxH + 4}`}
        fill="#0b0e24"
        fillOpacity={0.93}
      />
      <text
        x={cx}
        y={boxY + 12}
        fontSize={8.5}
        fontWeight={700}
        fill="#ffffff"
        textAnchor="middle"
      >
        {title}
      </text>
      <text
        x={cx}
        y={boxY + 23}
        fontSize={7.5}
        fill={owner ? '#c9cff5' : '#9af5e6'}
        textAnchor="middle"
      >
        {ownerLine}
      </text>
      {owner ? (
        <text
          x={cx}
          y={boxY + 34}
          fontSize={7.2}
          fontWeight={600}
          fill={locked ? '#ff9aa8' : '#9af5e6'}
          textAnchor="middle"
        >
          {locked ? '🔒 Bloqueada pelo dono' : '🔓 Aberta'}
        </text>
      ) : null}
    </g>
  );
}
