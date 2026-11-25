import { DeskArt } from '@/features/desks/components/DeskArt';
import {
  TILE,
  deskKey,
  resolveMap,
  type Area,
  type DeskInfo,
  type MapDef,
  type MapId,
  type Solid,
} from '@/shared/domain';

/**
 * Desenha o escritório em quadradinhos seguindo o padrão `.Art` (Detailed Modern RPG Office):
 * - Pisos corporativos sem excesso de madeira (Porcelanato Técnico Cinza-Gelo e Carpete Modular Azul-Ardósia)
 * - Paredes em blocos arquitetônicos cinza-claro / drywall off-white com rodapé metálico grafite
 * - Janelas em esquadria grafite com persianas, ar-condicionado split, calendário e quadros na parede superior
 * - Móveis com contorno `#1e191d`, cantos chanfrados e painéis rebaixados (copa com cafeteira coral,
 *   central de impressão, arquivos de aço, mesa de reunião em aço/vidro, sofás e luminárias).
 */
type Props = {
  mapId: MapId;
  /** Mesinhas com dono (por deskKey). As que faltam aqui estão livres. */
  desks: Record<string, DeskInfo>;
  myEmail?: string;
  /** Avisa qual mesa está com o mouse por cima (ou null ao sair). */
  onHoverDesk?: (deskId: string | null) => void;
};

const INK = '#1e191d';

export function MapLayer({ mapId, desks, myEmail, onHoverDesk }: Props) {
  const map = resolveMap(mapId, Object.values(desks));
  const walls = wallTiles(map);

  return (
    <g>
      <defs>
        {/* Carpete Corporativo Modular Cinza-Grafite Quente (Andar 1 / Recepção — humano e aconchegante, sem aspecto hospitalar) */}
        <pattern
          id="wood"
          width={TILE}
          height={TILE}
          patternUnits="userSpaceOnUse"
        >
          <rect width={TILE} height={TILE} fill="#4a505c" />
          <rect x={0} y={0} width={16} height={16} fill="#545b69" />
          <rect x={16} y={16} width={16} height={16} fill="#545b69" />
          <rect x={2} y={2} width={12} height={12} fill="#4e5562" />
          <rect x={18} y={18} width={12} height={12} fill="#4e5562" />
          <rect x={18} y={2} width={12} height={12} fill="#464c58" />
          <rect x={2} y={18} width={12} height={12} fill="#464c58" />
          <rect x={0} y={15} width={TILE} height={1} fill="#393e48" />
          <rect x={15} y={0} width={1} height={TILE} fill="#393e48" />
        </pattern>

        {/* Carpete Corporativo Modular Azul-Ardósia (Andar 2 — Placas alternadas) */}
        <pattern
          id="carpet"
          width={TILE}
          height={TILE}
          patternUnits="userSpaceOnUse"
        >
          <rect width={TILE} height={TILE} fill="#42526b" />
          <rect x={0} y={0} width={16} height={16} fill="#536582" />
          <rect x={16} y={16} width={16} height={16} fill="#536582" />
          <rect x={2} y={2} width={12} height={12} fill="#42526b" />
          <rect x={18} y={18} width={12} height={12} fill="#42526b" />
          <rect x={0} y={15} width={TILE} height={1} fill="#323f54" />
          <rect x={15} y={0} width={1} height={TILE} fill="#323f54" />
        </pattern>

        {/* Tapete Corporativo Verde-Sálvia para Salas de Reunião */}
        <pattern id="rug" width={16} height={16} patternUnits="userSpaceOnUse">
          <rect width={16} height={16} fill="#59804b" />
          <rect x={0} y={0} width={8} height={8} fill="#628a53" />
          <rect x={8} y={8} width={8} height={8} fill="#628a53" />
        </pattern>
      </defs>

      <rect
        width={map.width}
        height={map.height}
        fill={map.floor === 'wood' ? 'url(#wood)' : 'url(#carpet)'}
      />

      {map.rugs.map((rug) => (
        <g key={`${rug.x}-${rug.y}`}>
          <rect
            x={rug.x}
            y={rug.y}
            width={rug.w}
            height={rug.h}
            fill={INK}
            opacity={0.45}
          />
          <rect
            x={rug.x + 2}
            y={rug.y + 2}
            width={rug.w - 4}
            height={rug.h - 4}
            fill={rug.color}
            opacity={0.82}
          />
          <rect
            x={rug.x + 5}
            y={rug.y + 5}
            width={rug.w - 10}
            height={rug.h - 10}
            fill="none"
            stroke="#f7e8d0"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            opacity={0.55}
          />
        </g>
      ))}

      {map.areas.map((area) => {
        const info = area.desk ? desks[deskKey(mapId, area.id)] : undefined;
        const ownerKind: 'free' | 'mine' | 'other' = !info?.owner
          ? 'free'
          : myEmail && info.owner.email === myEmail
            ? 'mine'
            : 'other';
        return (
          <AreaFloor
            key={area.id}
            area={area}
            locked={info?.config.locked ?? false}
            ownerKind={ownerKind}
          />
        );
      })}

      {map.doors.map((door) => (
        <DoorMat
          key={door.label}
          door={door}
          leftSide={door.x < map.width / 2}
        />
      ))}

      {walls.list.map(({ tx, ty }) => (
        <WallTile key={`${tx}-${ty}`} tx={tx} ty={ty} walls={walls} />
      ))}

      {/* Decoração arquitetônica da parede superior (Janelas com persiana, Ar-condicionado Split, Calendário e Quadros) */}
      <TopWallDecor mapId={mapId} />

      {map.desks.map((desk, index) => (
        <DeskArt
          key={desk.id}
          desk={desk}
          variantIndex={index}
          config={desks[deskKey(mapId, desk.id)]?.config ?? null}
          owner={desks[deskKey(mapId, desk.id)]?.owner ?? null}
          showLabel={false}
          freeHint={false}
          onHoverChange={
            onHoverDesk
              ? (hovered) => onHoverDesk(hovered ? desk.id : null)
              : undefined
          }
        />
      ))}

      {map.solids
        .filter((s) => s.kind !== 'wall' && s.kind !== 'desk')
        .map((solid) => (
          <SolidObject
            key={`${solid.kind}-${solid.x}-${solid.y}`}
            solid={solid}
          />
        ))}
    </g>
  );
}

// --- Paredes e Decoração de Parede Superior --------------------------------

type Walls = {
  list: { tx: number; ty: number }[];
  has: (tx: number, ty: number) => boolean;
  cols: number;
  rows: number;
};

/** Todos os quadradinhos de parede do mapa. */
function wallTiles(map: MapDef): Walls {
  const set = new Set<string>();
  const list: { tx: number; ty: number }[] = [];
  for (const s of map.solids) {
    if (s.kind !== 'wall') continue;
    for (let ty = s.y / TILE; ty < (s.y + s.h) / TILE; ty++) {
      for (let tx = s.x / TILE; tx < (s.x + s.w) / TILE; tx++) {
        set.add(`${tx},${ty}`);
        list.push({ tx, ty });
      }
    }
  }
  return {
    list,
    has: (tx, ty) => set.has(`${tx},${ty}`),
    cols: map.width / TILE,
    rows: map.height / TILE,
  };
}

function WallTile({ tx, ty, walls }: { tx: number; ty: number; walls: Walls }) {
  const x = tx * TILE;
  const y = ty * TILE;
  const outer =
    ty >= 2 && (tx === 0 || tx === walls.cols - 1 || ty === walls.rows - 1);

  if (outer) {
    // Borda externa do prédio: viga estrutural em aço grafite escuro com friso metálico interno.
    const side = tx === 0 || tx === walls.cols - 1;
    const lightX = tx === 0 ? x + TILE - 4 : x;
    return (
      <g>
        <rect x={x} y={y} width={TILE} height={TILE} fill="#2d313b" />
        <rect
          x={side ? lightX : x}
          y={y}
          width={side ? 4 : TILE}
          height={side ? TILE : 4}
          fill="#697387"
        />
      </g>
    );
  }

  // Divisória interna da sala de reunião (ty >= 2): Divisória de Vidro Temperado com Esquadria Grafite
  if (ty >= 2) {
    const base = !walls.has(tx, ty + 1);
    return (
      <g>
        <rect x={x} y={y} width={TILE} height={TILE} fill={INK} />
        <rect
          x={x + 2}
          y={y + 2}
          width={TILE - 4}
          height={TILE - 4}
          fill="#454c5c"
        />
        <rect
          x={x + 4}
          y={y + 4}
          width={TILE - 8}
          height={TILE - 12}
          fill="#8cd8f5"
        />
        <rect x={x + 6} y={y + 4} width={6} height={TILE - 12} fill="#d9f5ff" />
        <rect
          x={x + 4}
          y={y + 12}
          width={TILE - 8}
          height={4}
          fill="#f5f7fa"
          opacity={0.75}
        />
        {base ? (
          <rect
            x={x}
            y={y + TILE}
            width={TILE}
            height={5}
            fill="#141218"
            opacity={0.22}
          />
        ) : null}
      </g>
    );
  }

  // Parede Superior Principal (ty = 0 e ty = 1): Blocos Arquitetônicos Cinza-Claro + Rodapé Metálico Grafite
  const cap = !walls.has(tx, ty - 1);
  const base = !walls.has(tx, ty + 1);
  return (
    <g>
      <rect x={x} y={y} width={TILE} height={TILE} fill="#d9d4cc" />
      {/* Juntas de bloco arquitetônico estilo estúdio (Ref 3) */}
      <rect x={x} y={y + 14} width={TILE} height={2} fill="#bab3a8" />
      <rect x={x} y={y + 28} width={TILE} height={2} fill="#bab3a8" />
      <rect
        x={x + (ty % 2 === 0 ? 14 : 22)}
        y={y}
        width={2}
        height={14}
        fill="#bab3a8"
      />
      <rect
        x={x + (ty % 2 === 0 ? 24 : 10)}
        y={y + 16}
        width={2}
        height={12}
        fill="#bab3a8"
      />
      {cap ? (
        <g>
          <rect x={x} y={y} width={TILE} height={6} fill={INK} />
          <rect x={x} y={y + 6} width={TILE} height={3} fill="#c3ccd9" />
          <rect x={x} y={y + 9} width={TILE} height={2} fill="#697387" />
        </g>
      ) : null}
      {base ? (
        <g>
          <rect x={x} y={y + 18} width={TILE} height={2} fill={INK} />
          <rect x={x} y={y + 20} width={TILE} height={3} fill="#c3ccd9" />
          <rect x={x} y={y + 23} width={TILE} height={7} fill="#454c5c" />
          <rect x={x} y={y + 30} width={TILE} height={2} fill={INK} />
          <rect
            x={x}
            y={y + TILE}
            width={TILE}
            height={6}
            fill="#141218"
            opacity={0.22}
          />
        </g>
      ) : null}
    </g>
  );
}

/** Janelas Corporativas com Persiana, Ar-Condicionado Split, Calendário e Quadros na parede superior (y = 0..64). */
function TopWallDecor({ mapId }: { mapId: MapId }) {
  const windowCols = mapId === 'lobby' ? [3, 8, 25] : [7, 17, 26];
  const acCol = mapId === 'lobby' ? 12 : 4;
  const calCol = mapId === 'lobby' ? 18 : 11;
  const postersCol = mapId === 'lobby' ? 23 : 20;

  return (
    <g style={{ pointerEvents: 'none' }}>
      {windowCols.map((col) => {
        const wx = col * TILE;
        const wy = 10;
        return (
          <g key={`win-${col}`}>
            <rect x={wx} y={wy} width={64} height={44} fill={INK} />
            <rect x={wx + 2} y={wy + 2} width={60} height={40} fill="#454c5c" />
            {/* Vidro esquerdo e direito */}
            <rect x={wx + 4} y={wy + 4} width={27} height={34} fill="#4fa3c7" />
            <rect
              x={wx + 33}
              y={wy + 4}
              width={27}
              height={34}
              fill="#4fa3c7"
            />
            {/* Céu celeste e reflexos diagonais */}
            <rect
              x={wx + 6}
              y={wy + 14}
              width={23}
              height={22}
              fill="#8cd8f5"
            />
            <rect
              x={wx + 35}
              y={wy + 14}
              width={23}
              height={22}
              fill="#8cd8f5"
            />
            <rect
              x={wx + 10}
              y={wy + 16}
              width={6}
              height={18}
              fill="#d9f5ff"
            />
            <rect
              x={wx + 40}
              y={wy + 16}
              width={6}
              height={18}
              fill="#d9f5ff"
            />
            {/* Persianas horizontais no topo */}
            <rect x={wx + 4} y={wy + 4} width={27} height={3} fill="#c3ccd9" />
            <rect x={wx + 4} y={wy + 9} width={27} height={3} fill="#c3ccd9" />
            <rect x={wx + 33} y={wy + 4} width={27} height={3} fill="#c3ccd9" />
            <rect x={wx + 33} y={wy + 9} width={27} height={3} fill="#c3ccd9" />
            {/* Peitoril metálico */}
            <rect x={wx - 2} y={wy + 40} width={68} height={4} fill="#c3ccd9" />
          </g>
        );
      })}

      {/* Ar-Condicionado Split Inverter (Estilo Ref 2) */}
      <g transform={`translate(${acCol * TILE}, 12)`}>
        <rect x={0} y={0} width={44} height={18} rx={2} fill={INK} />
        <rect x={2} y={2} width={40} height={14} fill="#f5f7fa" />
        <rect x={4} y={8} width={30} height={2} fill="#c5cddb" />
        <rect x={35} y={7} width={4} height={3} fill="#7ca36b" />
        <rect x={4} y={12} width={36} height={3} fill="#454c5c" />
      </g>

      {/* Calendário / Planner Mensal em Grade (Estilo Ref 3) */}
      <g transform={`translate(${calCol * TILE}, 14)`}>
        <rect x={0} y={0} width={28} height={24} fill={INK} />
        <rect x={2} y={2} width={24} height={4} fill="#2d313b" />
        <rect x={2} y={6} width={24} height={16} fill="#f5f7fa" />
        {[8, 12, 16, 20].map((cy) =>
          [4, 9, 14, 19].map((cx) => (
            <rect
              key={`${cx}-${cy}`}
              x={cx}
              y={cy}
              width={3}
              height={2}
              fill={
                cx === 14 && cy === 12
                  ? '#e05a52'
                  : cx === 9 && cy === 16
                    ? '#58a6b8'
                    : '#96a1b5'
              }
            />
          )),
        )}
      </g>

      {/* Dupla de Quadros Corporativos Emoldurados (Estilo Ref 3) */}
      <g transform={`translate(${postersCol * TILE}, 14)`}>
        <rect x={0} y={0} width={22} height={24} fill={INK} />
        <rect x={2} y={2} width={18} height={20} fill="#f5f7fa" />
        <rect x={5} y={5} width={12} height={14} fill="#397f94" />
        <rect x={7} y={7} width={8} height={5} fill="#8cd8f5" />

        <rect x={26} y={0} width={22} height={24} fill={INK} />
        <rect x={28} y={2} width={18} height={20} fill="#f5f7fa" />
        <rect x={31} y={5} width={12} height={14} fill="#e05a52" />
        <rect x={33} y={7} width={8} height={6} fill="#f7cf59" />
      </g>
    </g>
  );
}

// --- Zonas e Portas --------------------------------------------------------

function AreaFloor({
  area,
  locked,
  ownerKind = 'free',
}: {
  area: Area;
  locked: boolean;
  ownerKind?: 'free' | 'mine' | 'other';
}) {
  if (area.desk) {
    const color =
      ownerKind === 'mine'
        ? 'var(--accent)'
        : locked
          ? '#ff6b81'
          : ownerKind === 'other'
            ? 'var(--status-away)'
            : '#58a6b8';
    return (
      <rect
        x={area.x + 1}
        y={area.y + 1}
        width={area.w - 2}
        height={area.h - 2}
        fill={color}
        fillOpacity={ownerKind === 'mine' ? 0.18 : locked ? 0.16 : 0.11}
        stroke={color}
        strokeWidth={ownerKind === 'mine' ? 2.5 : 2}
        strokeOpacity={ownerKind === 'mine' ? 0.95 : locked ? 0.85 : 0.65}
      />
    );
  }

  // Sala de Reunião: Tapete Verde-Sálvia com Moldura Ornamental Dupla (Estilo Refs 1 e 3)
  return (
    <g>
      <rect
        x={area.x}
        y={area.y}
        width={area.w}
        height={area.h}
        fill="url(#rug)"
      />
      <rect
        x={area.x + 2}
        y={area.y + 2}
        width={area.w - 4}
        height={area.h - 4}
        fill="none"
        stroke="#3d5c33"
        strokeWidth={3}
      />
      <rect
        x={area.x + 6}
        y={area.y + 6}
        width={area.w - 12}
        height={area.h - 12}
        fill="none"
        stroke="#8cd668"
        strokeWidth={1.5}
        strokeDasharray="6 3"
      />
      <text
        x={area.x + area.w - 12}
        y={area.y + area.h - 12}
        fontSize={11}
        fontWeight={700}
        fill="#f5f7fa"
        textAnchor="end"
      >
        {area.name}
      </text>
    </g>
  );
}

function DoorMat({
  door,
  leftSide,
}: {
  door: MapDef['doors'][number];
  leftSide: boolean;
}) {
  return (
    <g>
      <rect
        x={door.x}
        y={door.y}
        width={door.w}
        height={door.h}
        fill="#2d313b"
      />
      <rect
        x={door.x + 2}
        y={door.y + 2}
        width={door.w - 4}
        height={door.h - 4}
        fill="#397f94"
      />
      <rect
        x={door.x + 4}
        y={door.y + 4}
        width={door.w - 8}
        height={door.h - 8}
        fill="none"
        stroke="#8cd8f5"
        strokeWidth={1.5}
      />
      <text
        x={leftSide ? door.x + door.w + 8 : door.x - 8}
        y={door.y + door.h / 2 + 4}
        fontSize={11}
        fontWeight={700}
        fill="#f5f7fa"
        textAnchor={leftSide ? 'start' : 'end'}
      >
        {door.label}
      </text>
    </g>
  );
}

// --- Mobiliário Corporativo Detalhado (`.Art`) -----------------------------

const BOOKS = ['#e05a52', '#58a6b8', '#f7cf59', '#7ca36b', '#8478a6'];

function SolidObject({ solid }: { solid: Solid }) {
  const { x, y, w, h } = solid;

  switch (solid.kind) {
    case 'table':
      // Mesa de Reunião Executiva com 10 Poltronas ao Redor (4 em cima, 4 embaixo, 1 na esquerda e 1 na direita)
      return (
        <g>
          {/* 4 Poltronas Superiores (Encaixe sob a borda norte da mesa) */}
          {[0.16, 0.38, 0.62, 0.84].map((f, idx) => {
            const cx = x + w * f;
            const cy = y - 11;
            const seatColor = idx % 2 === 0 ? '#397f94' : '#59804b';
            return (
              <g key={`chair-top-${f}`}>
                <ellipse
                  cx={cx}
                  cy={cy + 9}
                  rx={9}
                  ry={2.5}
                  fill="#141218"
                  opacity={0.25}
                />
                <rect x={cx - 10} y={cy + 3} width={3} height={7} fill={INK} />
                <rect x={cx + 7} y={cy + 3} width={3} height={7} fill={INK} />
                <rect x={cx - 8} y={cy} width={16} height={11} fill={INK} />
                <rect
                  x={cx - 6}
                  y={cy + 2}
                  width={12}
                  height={8}
                  fill={seatColor}
                />
                <rect
                  x={cx - 6}
                  y={cy + 2}
                  width={12}
                  height={2.5}
                  fill="#ffffff"
                  opacity={0.28}
                />
              </g>
            );
          })}

          {/* Poltrona da Cabeceira Esquerda */}
          <g>
            <ellipse
              cx={x - 9}
              cy={y + h / 2 + 8}
              rx={7}
              ry={3}
              fill="#141218"
              opacity={0.25}
            />
            <rect
              x={x - 14}
              y={y + h / 2 - 11}
              width={13}
              height={22}
              fill={INK}
            />
            <rect
              x={x - 12}
              y={y + h / 2 - 9}
              width={10}
              height={18}
              fill="#397f94"
            />
            <rect
              x={x - 12}
              y={y + h / 2 - 9}
              width={3}
              height={18}
              fill="#8cd8f5"
              opacity={0.5}
            />
            <rect
              x={x - 10}
              y={y + h / 2 - 13}
              width={8}
              height={3}
              fill={INK}
            />
            <rect
              x={x - 10}
              y={y + h / 2 + 10}
              width={8}
              height={3}
              fill={INK}
            />
          </g>

          {/* Poltrona da Cabeceira Direita */}
          <g>
            <ellipse
              cx={x + w + 9}
              cy={y + h / 2 + 8}
              rx={7}
              ry={3}
              fill="#141218"
              opacity={0.25}
            />
            <rect
              x={x + w + 1}
              y={y + h / 2 - 11}
              width={13}
              height={22}
              fill={INK}
            />
            <rect
              x={x + w + 2}
              y={y + h / 2 - 9}
              width={10}
              height={18}
              fill="#397f94"
            />
            <rect
              x={x + w + 9}
              y={y + h / 2 - 9}
              width={3}
              height={18}
              fill="#8cd8f5"
              opacity={0.5}
            />
            <rect
              x={x + w + 2}
              y={y + h / 2 - 13}
              width={8}
              height={3}
              fill={INK}
            />
            <rect
              x={x + w + 2}
              y={y + h / 2 + 10}
              width={8}
              height={3}
              fill={INK}
            />
          </g>

          {/* Sombra e Corpo da Mesa de Reunião (Nogueira & Aço Grafite com Painel Central) */}
          <rect
            x={x + 2}
            y={y + h}
            width={w - 4}
            height={5}
            fill="#141218"
            opacity={0.26}
          />
          <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} fill={INK} />
          <rect x={x} y={y} width={w} height={h} fill="#9c653e" />
          <rect
            x={x + 3}
            y={y + 3}
            width={w - 6}
            height={h - 14}
            fill="#cfa06e"
          />
          <rect x={x + 3} y={y + 3} width={w - 6} height={3} fill="#e8be8e" />
          <rect
            x={x + 8}
            y={y + 8}
            width={w - 16}
            height={h - 24}
            fill="#e1e6ef"
          />
          <rect x={x + 8} y={y + 8} width={w - 16} height={2} fill="#f5f7fa" />
          {/* Calha central de conectividade / tomadas */}
          <rect
            x={x + 24}
            y={y + (h - 12) / 2 - 5}
            width={w - 48}
            height={10}
            fill={INK}
          />
          <rect
            x={x + 26}
            y={y + (h - 12) / 2 - 3}
            width={w - 52}
            height={6}
            fill="#454c5c"
          />
          <rect
            x={x + 32}
            y={y + (h - 12) / 2 - 1}
            width={6}
            height={2}
            fill="#58a6b8"
          />
          <rect
            x={x + w - 38}
            y={y + (h - 12) / 2 - 1}
            width={6}
            height={2}
            fill="#7ca36b"
          />
          {/* Saia frontal em aço grafite e nogueira */}
          <rect x={x} y={y + h - 10} width={w} height={10} fill="#454c5c" />
          <rect x={x} y={y + h - 10} width={w} height={2} fill={INK} />
          {/* Notebooks, blocos de notas e xícaras de café sobre a mesa */}
          {[0.22, 0.5, 0.78].map((f, i) => (
            <g key={f}>
              <rect
                x={x + w * f - 11}
                y={y + 10}
                width={22}
                height={15}
                fill={INK}
              />
              <rect
                x={x + w * f - 9}
                y={y + 12}
                width={18}
                height={10}
                fill="#4fa3c7"
              />
              <rect
                x={x + w * f - 9}
                y={y + 12}
                width={7}
                height={3}
                fill="#d9f5ff"
              />
              {/* Caneca de café e bloquinho nos lugares */}
              <rect
                x={x + w * f + 13}
                y={y + 14}
                width={5}
                height={5}
                fill={i === 1 ? '#e05a52' : '#f7cf59'}
              />
              <rect
                x={x + w * f - 9}
                y={y + h - 28}
                width={16}
                height={11}
                fill={INK}
              />
              <rect
                x={x + w * f - 8}
                y={y + h - 27}
                width={14}
                height={9}
                fill="#f7e8d0"
              />
            </g>
          ))}

          {/* 4 Poltronas Inferiores (Vistas de costas na frente da mesa, com base estrela) */}
          {[0.16, 0.38, 0.62, 0.84].map((f, idx) => {
            const cx = x + w * f;
            const cy = y + h - 1;
            const seatColor = idx % 2 === 0 ? '#397f94' : '#59804b';
            return (
              <g key={`chair-bottom-${f}`}>
                <ellipse
                  cx={cx}
                  cy={cy + 16}
                  rx={9}
                  ry={2.5}
                  fill="#141218"
                  opacity={0.25}
                />
                <rect x={cx - 2} y={cy + 11} width={4} height={5} fill={INK} />
                <rect
                  x={cx - 7}
                  y={cy + 14}
                  width={14}
                  height={2.5}
                  fill="#697387"
                />
                <rect x={cx - 10} y={cy + 2} width={3} height={8} fill={INK} />
                <rect x={cx + 7} y={cy + 2} width={3} height={8} fill={INK} />
                <rect x={cx - 8} y={cy} width={16} height={13} fill={INK} />
                <rect
                  x={cx - 6}
                  y={cy + 2}
                  width={12}
                  height={9}
                  fill={seatColor}
                />
                <rect
                  x={cx - 6}
                  y={cy + 2}
                  width={12}
                  height={2.5}
                  fill="#ffffff"
                  opacity={0.26}
                />
              </g>
            );
          })}
        </g>
      );

    case 'plant':
      // Planta Escultural Ficus / Estante com Vaso Cerâmico e Tripé
      return (
        <g>
          <ellipse
            cx={x + 16}
            cy={y + 29}
            rx={9}
            ry={2.5}
            fill="#141218"
            opacity={0.25}
          />
          <rect x={x + 7} y={y + 17} width={18} height={13} fill={INK} />
          <rect x={x + 9} y={y + 19} width={14} height={9} fill="#c3ccd9" />
          <rect x={x + 9} y={y + 19} width={14} height={3} fill="#f5f7fa" />
          <rect x={x + 9} y={y + 25} width={14} height={3} fill="#96a1b5" />
          <rect x={x + 4} y={y + 4} width={24} height={14} fill={INK} />
          <rect x={x + 6} y={y + 6} width={20} height={10} fill="#52ab3a" />
          <rect x={x + 8} y={y + 6} width={12} height={4} fill="#8cd668" />
          <rect x={x + 6} y={y + 13} width={20} height={3} fill="#2d6e22" />
          <rect x={x + 11} y={y + 1} width={10} height={6} fill={INK} />
          <rect x={x + 13} y={y + 3} width={6} height={4} fill="#8cd668" />
        </g>
      );

    case 'sofa':
      // Sofá Lounge Corporativo Off-White & Azul-Petróleo com Costuras Rebaixadas
      return (
        <g>
          <rect
            x={x + 2}
            y={y + h}
            width={w - 4}
            height={4}
            fill="#141218"
            opacity={0.24}
          />
          <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} fill={INK} />
          <rect x={x} y={y} width={w} height={h} fill="#397f94" />
          <rect x={x} y={y} width={w} height={6} fill="#58a6b8" />
          {/* Braços laterais */}
          <rect x={x} y={y + 6} width={10} height={h - 6} fill="#245566" />
          <rect
            x={x + w - 10}
            y={y + 6}
            width={10}
            height={h - 6}
            fill="#245566"
          />
          {/* Assento acolchoado com divisória e almofadas */}
          <rect
            x={x + 10}
            y={y + 10}
            width={w - 20}
            height={h - 14}
            fill="#58a6b8"
          />
          <rect
            x={x + 10}
            y={y + 10}
            width={w - 20}
            height={3}
            fill="#8cd8f5"
          />
          <rect
            x={x + w / 2 - 1}
            y={y + 8}
            width={2}
            height={h - 12}
            fill={INK}
          />
          {/* Almofada decorativa âmbar */}
          <rect x={x + 14} y={y + 11} width={10} height={8} fill={INK} />
          <rect x={x + 15} y={y + 12} width={8} height={6} fill="#f7cf59" />
        </g>
      );

    case 'shelf':
      // Estante Corporativa em Aço Grafite & Nogueira com Fichários A-Z Coloridos
      return (
        <g>
          <rect
            x={x + 2}
            y={y + h}
            width={w - 4}
            height={4}
            fill="#141218"
            opacity={0.24}
          />
          <rect x={x} y={y} width={w} height={h} fill={INK} />
          <rect
            x={x + 2}
            y={y + 2}
            width={w - 4}
            height={h - 4}
            fill="#454c5c"
          />
          <rect x={x + 2} y={y + 2} width={w - 4} height={3} fill="#c3ccd9" />
          <rect
            x={x + 4}
            y={y + 6}
            width={w - 8}
            height={h - 10}
            fill="#2d313b"
          />
          {Array.from({ length: Math.floor((w - 10) / 7) }, (_, i) => (
            <rect
              key={i}
              x={x + 6 + i * 7}
              y={y + 8 + (i % 2)}
              width={5}
              height={h - 14 - (i % 2)}
              fill={BOOKS[i % BOOKS.length]!}
            />
          ))}
          <rect
            x={x + 4}
            y={y + h - 5}
            width={w - 8}
            height={2}
            fill="#96a1b5"
          />
        </g>
      );

    case 'pantry':
      // Copa Corporativa em Quartzo Branco, Verde-Sálvia & Cafeteira Espresso Coral (3x1)
      return (
        <g>
          <rect
            x={x + 2}
            y={y + h}
            width={w - 4}
            height={4}
            fill="#141218"
            opacity={0.25}
          />
          <rect x={x - 1} y={y - 1} width={w + 2} height={h + 2} fill={INK} />
          {/* Bancada de Quartzo Branco */}
          <rect x={x} y={y} width={w} height={16} fill="#f5f7fa" />
          <rect x={x} y={y + 14} width={w} height={2} fill="#c5cddb" />
          {/* Cuba de Pia em Aço + Torneira Preta */}
          <rect x={x + 8} y={y + 3} width={22} height={10} fill={INK} />
          <rect x={x + 9} y={y + 4} width={20} height={8} fill="#96a1b5" />
          <rect x={x + 11} y={y + 6} width={16} height={5} fill="#8cd8f5" />
          <rect x={x + 17} y={y - 2} width={4} height={6} fill="#2d313b" />
          {/* Máquina de Café Espresso Coral Vibrante + Canecas */}
          <rect x={x + 40} y={y - 4} width={20} height={16} fill={INK} />
          <rect x={x + 41} y={y - 3} width={18} height={14} fill="#e05a52" />
          <rect x={x + 42} y={y - 2} width={16} height={3} fill="#c3ccd9" />
          <rect x={x + 44} y={y + 4} width={4} height={5} fill="#f5f7fa" />
          <rect x={x + 51} y={y + 4} width={4} height={5} fill="#f5f7fa" />
          {/* Bandeja de Xícaras e Pote de Cookies */}
          <rect x={x + 68} y={y + 2} width={18} height={10} fill={INK} />
          <rect x={x + 69} y={y + 3} width={16} height={8} fill="#f7e8d0" />
          <rect x={x + 72} y={y + 4} width={4} height={5} fill="#58a6b8" />
          <rect x={x + 79} y={y + 4} width={4} height={5} fill="#f7cf59" />
          {/* Armários Inferiores em Verde-Sálvia com Painéis Rebaixados */}
          <rect x={x} y={y + 16} width={w} height={2} fill={INK} />
          <rect x={x} y={y + 18} width={w} height={14} fill="#59804b" />
          {[4, 34, 64].map((dx) => (
            <g key={dx}>
              <rect x={x + dx} y={y + 20} width={26} height={10} fill={INK} />
              <rect
                x={x + dx + 1}
                y={y + 21}
                width={24}
                height={8}
                fill="#7ca36b"
              />
              <rect
                x={x + dx + 10}
                y={y + 23}
                width={6}
                height={2}
                fill="#f7cf59"
              />
            </g>
          ))}
        </g>
      );

    case 'fridge':
      // Geladeira Corporativa Off-White / Inox com Dispenser (1x1)
      return (
        <g>
          <rect
            x={x + 2}
            y={y + h}
            width={w - 4}
            height={4}
            fill="#141218"
            opacity={0.25}
          />
          <rect x={x + 2} y={y - 6} width={w - 4} height={h + 6} fill={INK} />
          <rect x={x + 4} y={y - 4} width={w - 8} height={18} fill="#f5f7fa" />
          <rect x={x + 4} y={y + 14} width={w - 8} height={2} fill={INK} />
          <rect x={x + 4} y={y + 16} width={w - 8} height={14} fill="#e1e6ef" />
          {/* Dispenser de água e puxadores cromados */}
          <rect x={x + 7} y={y + 4} width={7} height={7} fill="#2d313b" />
          <rect x={x + 9} y={y + 6} width={3} height={3} fill="#8cd8f5" />
          <rect x={x + w - 9} y={y + 3} width={2} height={9} fill="#96a1b5" />
          <rect x={x + w - 9} y={y + 19} width={2} height={8} fill="#96a1b5" />
        </g>
      );

    case 'printer':
      // Central de Impressão & Copiadora Multifuncional Laser (2x1)
      return (
        <g>
          <rect
            x={x + 2}
            y={y + h}
            width={w - 4}
            height={4}
            fill="#141218"
            opacity={0.25}
          />
          <rect x={x} y={y - 2} width={w} height={h + 2} fill={INK} />
          {/* Corpo da Multifuncional à esquerda */}
          <rect x={x + 2} y={y} width={36} height={16} fill="#e1e6ef" />
          <rect x={x + 4} y={y + 2} width={22} height={8} fill="#2d313b" />
          <rect x={x + 6} y={y + 4} width={8} height={4} fill="#8cd8f5" />
          <rect x={x + 16} y={y + 4} width={4} height={4} fill="#7ca36b" />
          {/* Bandeja de saída com folha A4 */}
          <rect x={x + 28} y={y + 4} width={9} height={8} fill="#f5f7fa" />
          {/* Bancada lateral com Resmas de Papel A4 */}
          <rect x={x + 38} y={y + 4} width={24} height={12} fill="#96a1b5" />
          <rect x={x + 42} y={y - 1} width={16} height={9} fill={INK} />
          <rect x={x + 43} y={y} width={14} height={7} fill="#f5f7fa" />
          {/* Gavetas inferiores de papel */}
          <rect x={x + 2} y={y + 16} width={w - 4} height={2} fill={INK} />
          <rect x={x + 2} y={y + 18} width={w - 4} height={12} fill="#96a1b5" />
          <rect x={x + 5} y={y + 20} width={26} height={8} fill={INK} />
          <rect x={x + 6} y={y + 21} width={24} height={6} fill="#c3ccd9" />
          <rect x={x + 35} y={y + 20} width={22} height={8} fill={INK} />
          <rect x={x + 36} y={y + 21} width={20} height={6} fill="#454c5c" />
        </g>
      );

    case 'cabinet':
      // Arquivo Vertical e Armário Técnico em Aço Escovado (2x1)
      return (
        <g>
          <rect
            x={x + 2}
            y={y + h}
            width={w - 4}
            height={4}
            fill="#141218"
            opacity={0.24}
          />
          <rect x={x} y={y} width={w} height={h} fill={INK} />
          <rect x={x + 2} y={y + 2} width={w - 4} height={10} fill="#c3ccd9" />
          {/* Pastas e Bandeja de Documentos no Topo */}
          <rect x={x + 6} y={y - 3} width={14} height={8} fill={INK} />
          <rect x={x + 7} y={y - 2} width={12} height={6} fill="#e05a52" />
          <rect x={x + 38} y={y - 3} width={18} height={8} fill={INK} />
          <rect x={x + 39} y={y - 2} width={16} height={6} fill="#f5f7fa" />
          {/* Portas Metálicas com Painéis Rebaixados */}
          <rect x={x + 2} y={y + 12} width={w - 4} height={18} fill="#96a1b5" />
          <rect x={x + 5} y={y + 14} width={24} height={14} fill={INK} />
          <rect x={x + 6} y={y + 15} width={22} height={12} fill="#c3ccd9" />
          <rect x={x + 14} y={y + 19} width={6} height={2} fill="#454c5c" />
          <rect x={x + 35} y={y + 14} width={24} height={14} fill={INK} />
          <rect x={x + 36} y={y + 15} width={22} height={12} fill="#c3ccd9" />
          <rect x={x + 44} y={y + 19} width={6} height={2} fill="#454c5c" />
        </g>
      );

    case 'lamp':
      // Luminária de Piso Cúpula Âmbar & Haste Metálica (1x1)
      return (
        <g>
          <ellipse
            cx={x + 16}
            cy={y + 28}
            rx={7}
            ry={2.5}
            fill="#141218"
            opacity={0.22}
          />
          <rect x={x + 9} y={y + 24} width={14} height={5} fill={INK} />
          <rect x={x + 11} y={y + 25} width={10} height={3} fill="#c3ccd9" />
          <rect x={x + 14} y={y + 11} width={4} height={14} fill={INK} />
          <rect x={x + 15} y={y + 11} width={2} height={14} fill="#c3ccd9" />
          <rect x={x + 6} y={y + 1} width={20} height={11} fill={INK} />
          <rect x={x + 8} y={y + 3} width={16} height={7} fill="#f7cf59" />
          <rect x={x + 11} y={y + 4} width={10} height={3} fill="#f5f7fa" />
          <rect x={x + 8} y={y + 8} width={16} height={2} fill="#cc962b" />
        </g>
      );

    default:
      return <rect x={x} y={y} width={w} height={h} fill="#96a1b5" />;
  }
}
