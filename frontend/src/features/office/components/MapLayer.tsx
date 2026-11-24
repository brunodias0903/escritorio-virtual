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
 * Desenha o escritório em quadradinhos, em pixel art retrô:
 * chão em azulejos, paredes com rodapé, móveis com contorno escuro.
 * Cada "pixel de arte" vale 2 pixels do mapa (um quadradinho tem 16 x 16).
 */
type Props = {
  mapId: MapId;
  /** Mesinhas com dono (por deskKey). As que faltam aqui estão livres. */
  desks: Record<string, DeskInfo>;
  myEmail?: string;
  /** Avisa qual mesa está com o mouse por cima (ou null ao sair). */
  onHoverDesk?: (deskId: string | null) => void;
};

const INK = '#202030';

export function MapLayer({ mapId, desks, myEmail, onHoverDesk }: Props) {
  const map = resolveMap(mapId, Object.values(desks));
  const walls = wallTiles(map);

  return (
    <g>
      <defs>
        <pattern
          id="wood"
          width={TILE * 2}
          height={TILE * 2}
          patternUnits="userSpaceOnUse"
        >
          <rect width={64} height={64} fill="#e0b878" />
          {[0, 16, 32, 48].map((y, row) => (
            <g key={y}>
              <rect y={y} width={64} height={2} fill="#f0d098" />
              <rect y={y + 14} width={64} height={2} fill="#b98a52" />
              <rect
                x={row % 2 === 0 ? 20 : 52}
                y={y + 2}
                width={2}
                height={12}
                fill="#c89858"
              />
            </g>
          ))}
        </pattern>
        <pattern
          id="carpet"
          width={16}
          height={16}
          patternUnits="userSpaceOnUse"
        >
          <rect width={16} height={16} fill="#5878a8" />
          <rect x={2} y={2} width={4} height={4} fill="#6c8cc0" />
          <rect x={10} y={10} width={4} height={4} fill="#6c8cc0" />
          <rect x={10} y={2} width={2} height={2} fill="#486898" />
          <rect x={2} y={10} width={2} height={2} fill="#486898" />
        </pattern>
        <pattern id="rug" width={8} height={8} patternUnits="userSpaceOnUse">
          <rect width={8} height={8} fill="#b84c54" />
          <rect x={0} y={0} width={4} height={4} fill="#c85c64" />
          <rect x={4} y={4} width={4} height={4} fill="#c85c64" />
        </pattern>
      </defs>

      <rect
        width={map.width}
        height={map.height}
        fill={map.floor === 'wood' ? 'url(#wood)' : 'url(#carpet)'}
      />

      {map.rugs.map((rug) => (
        <rect
          key={`${rug.x}-${rug.y}`}
          x={rug.x}
          y={rug.y}
          width={rug.w}
          height={rug.h}
          fill={rug.color}
        />
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

      {map.desks.map((desk) => (
        <DeskArt
          key={desk.id}
          desk={desk}
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

// --- Paredes ---------------------------------------------------------------

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
    // Borda do prédio: bloco escuro com uma linha de luz na beira de dentro.
    const side = tx === 0 || tx === walls.cols - 1;
    const lightX = tx === 0 ? x + TILE - 4 : x;
    return (
      <g>
        <rect x={x} y={y} width={TILE} height={TILE} fill="#403838" />
        <rect
          x={side ? lightX : x}
          y={y}
          width={side ? 4 : TILE}
          height={side ? TILE : 4}
          fill="#605454"
        />
      </g>
    );
  }

  const cap = !walls.has(tx, ty - 1);
  const base = !walls.has(tx, ty + 1);
  return (
    <g>
      <rect x={x} y={y} width={TILE} height={TILE} fill="#ece0bc" />
      <rect x={x + 6} y={y} width={4} height={TILE} fill="#dccea4" />
      <rect x={x + 22} y={y} width={4} height={TILE} fill="#dccea4" />
      {cap ? (
        <g>
          <rect x={x} y={y} width={TILE} height={6} fill="#483c3c" />
          <rect x={x} y={y + 6} width={TILE} height={2} fill="#786868" />
        </g>
      ) : null}
      {base ? (
        <g>
          <rect x={x} y={y + 20} width={TILE} height={2} fill="#684020" />
          <rect x={x} y={y + 22} width={TILE} height={10} fill="#b07840" />
          <rect x={x} y={y + 22} width={TILE} height={2} fill="#c89050" />
          <rect
            x={x}
            y={y + TILE}
            width={TILE}
            height={6}
            fill="#000000"
            opacity={0.16}
          />
        </g>
      ) : null}
    </g>
  );
}

// --- Zonas, portas ---------------------------------------------------------

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
            : '#48d0a8';
    // Marca a área da mesinha: borda com a cor principal do tema para a própria mesa, distinta para outros.
    return (
      <rect
        x={area.x + 1}
        y={area.y + 1}
        width={area.w - 2}
        height={area.h - 2}
        fill={color}
        fillOpacity={ownerKind === 'mine' ? 0.18 : locked ? 0.16 : 0.12}
        stroke={color}
        strokeWidth={ownerKind === 'mine' ? 2.5 : 2}
        strokeOpacity={ownerKind === 'mine' ? 0.95 : locked ? 0.85 : 0.72}
      />
    );
  }

  // Sala fechada: tapete vermelho com barra dourada, como nos ginásios.
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
        stroke="#e8c868"
        strokeWidth={4}
      />
      <text
        x={area.x + area.w - 10}
        y={area.y + area.h - 10}
        fontSize={11}
        fill="#fff6d8"
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
        fill="#c04848"
      />
      <rect
        x={door.x + 2}
        y={door.y + 2}
        width={door.w - 4}
        height={door.h - 4}
        fill="none"
        stroke="#f0d060"
        strokeWidth={2}
      />
      <text
        x={leftSide ? door.x + door.w + 6 : door.x - 6}
        y={door.y + door.h / 2 + 4}
        fontSize={11}
        fill="#ffffff"
        textAnchor={leftSide ? 'start' : 'end'}
      >
        {door.label}
      </text>
    </g>
  );
}

// --- Móveis ----------------------------------------------------------------

const BOOKS = ['#d85050', '#4888d8', '#e8c040', '#58b868', '#a870d0'];

function SolidObject({ solid }: { solid: Solid }) {
  const { x, y, w, h } = solid;

  switch (solid.kind) {
    case 'table':
      return (
        <g>
          <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} fill={INK} />
          <rect x={x} y={y} width={w} height={h} fill="#c88848" />
          <rect x={x} y={y} width={w} height={4} fill="#e0a868" />
          <rect x={x} y={y + h - 10} width={w} height={10} fill="#8c5c2c" />
          {/* Notebooks e papéis */}
          {[0.2, 0.5, 0.8].map((f) => (
            <g key={f}>
              <rect
                x={x + w * f - 10}
                y={y + 14}
                width={20}
                height={14}
                fill="#38384c"
              />
              <rect
                x={x + w * f - 8}
                y={y + 16}
                width={16}
                height={9}
                fill="#88c0f8"
              />
            </g>
          ))}
          <rect
            x={x + w / 2 - 6}
            y={y + h - 26}
            width={12}
            height={8}
            fill="#f8f8f0"
          />
        </g>
      );

    case 'plant':
      return (
        <g>
          <rect x={x + 7} y={y + 17} width={18} height={14} fill={INK} />
          <rect x={x + 9} y={y + 19} width={14} height={10} fill="#c8683c" />
          <rect x={x + 9} y={y + 19} width={14} height={3} fill="#e08850" />
          <rect x={x + 5} y={y + 5} width={22} height={13} fill={INK} />
          <rect x={x + 7} y={y + 7} width={18} height={9} fill="#38a050" />
          <rect x={x + 9} y={y + 7} width={6} height={4} fill="#60c870" />
          <rect x={x + 12} y={y + 1} width={8} height={8} fill={INK} />
          <rect x={x + 14} y={y + 3} width={4} height={6} fill="#38a050" />
        </g>
      );

    case 'sofa':
      return (
        <g>
          <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} fill={INK} />
          <rect x={x} y={y} width={w} height={h} fill="#3860a8" />
          <rect x={x} y={y} width={w} height={6} fill="#5078c0" />
          <rect x={x} y={y + 6} width={10} height={h - 6} fill="#2c4c90" />
          <rect
            x={x + w - 10}
            y={y + 6}
            width={10}
            height={h - 6}
            fill="#2c4c90"
          />
          <rect
            x={x + 10}
            y={y + 22}
            width={w - 20}
            height={h - 22}
            fill="#5890e0"
          />
          <rect
            x={x + 10}
            y={y + 22}
            width={w - 20}
            height={2}
            fill="#78a8f0"
          />
          <rect
            x={x + w / 2 - 1}
            y={y + 22}
            width={2}
            height={h - 22}
            fill="#3860a8"
          />
        </g>
      );

    case 'shelf':
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} fill={INK} />
          <rect
            x={x + 2}
            y={y + 2}
            width={w - 4}
            height={h - 4}
            fill="#7a4a20"
          />
          <rect
            x={x + 4}
            y={y + 4}
            width={w - 8}
            height={h - 8}
            fill="#3a2410"
          />
          {Array.from({ length: Math.floor((w - 8) / 6) }, (_, i) => (
            <rect
              key={i}
              x={x + 4 + i * 6}
              y={y + 6 + (i % 3)}
              width={5}
              height={h - 12 - (i % 3)}
              fill={BOOKS[(i * 2) % BOOKS.length]!}
            />
          ))}
          <rect
            x={x + 4}
            y={y + h - 6}
            width={w - 8}
            height={2}
            fill="#a8703c"
          />
        </g>
      );

    default:
      return <rect x={x} y={y} width={w} height={h} fill="#8b5a2b" />;
  }
}
