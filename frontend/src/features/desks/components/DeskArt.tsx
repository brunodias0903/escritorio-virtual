import {
  DESK_COLORS,
  FREE_DESK_CONFIG,
  RUG_COLORS,
  TILE,
  type DeskComputer,
  type DeskConfig,
  type DeskDef,
  type DeskItem,
} from '@/shared/domain';

const INK = '#202030';

/** Tamanho (em pixels do mapa) da área de cada enfeite sobre a mesa. */
const CELL = 12;

/** Lugares dos enfeites no tampo: esquerda, direita e frente. */
const slotOf = (desk: DeskDef, index: number) => {
  const slots = [
    { x: desk.x + 4, y: desk.y + 3 },
    { x: desk.x + desk.w - CELL - 4, y: desk.y + 3 },
    { x: desk.x + desk.w - CELL - 4, y: desk.y + desk.h - CELL - 3 },
  ];
  return slots[index] ?? slots[0]!;
};

/** Desenha um enfeite em pixel art dentro de uma célula de 12 x 12. */
function Item({ item, x, y }: { item: DeskItem; x: number; y: number }) {
  const r = (dx: number, dy: number, w: number, h: number, fill: string) => (
    <rect
      key={`${dx}-${dy}-${fill}`}
      x={x + dx}
      y={y + dy}
      width={w}
      height={h}
      fill={fill}
    />
  );

  switch (item) {
    case 'plant':
      return (
        <g>
          {r(3, 7, 6, 5, '#b5651d')}
          {r(5, 2, 2, 6, '#2e8b57')}
          {r(2, 3, 4, 3, '#3cb371')}
          {r(6, 1, 4, 3, '#3cb371')}
        </g>
      );
    case 'lamp':
      return (
        <g>
          {r(4, 10, 4, 2, '#3a3d5c')}
          {r(5, 4, 2, 6, '#7b83bd')}
          {r(2, 0, 8, 5, '#f6d365')}
          {r(3, 1, 6, 2, '#fff3b0')}
        </g>
      );
    case 'mug':
      return (
        <g>
          {r(3, 5, 6, 6, '#f2f2f7')}
          {r(9, 6, 2, 3, '#f2f2f7')}
          {r(4, 5, 4, 2, '#6f4e37')}
        </g>
      );
    case 'books':
      return (
        <g>
          {r(1, 8, 10, 3, '#c0392b')}
          {r(2, 5, 8, 3, '#2980b9')}
          {r(1, 2, 9, 3, '#27ae60')}
        </g>
      );
    case 'cactus':
      return (
        <g>
          {r(3, 8, 6, 4, '#a0522d')}
          {r(5, 1, 3, 8, '#4caf50')}
          {r(2, 3, 3, 2, '#4caf50')}
          {r(2, 3, 2, 4, '#4caf50')}
          {r(8, 4, 3, 2, '#4caf50')}
          {r(9, 2, 2, 4, '#4caf50')}
        </g>
      );
    case 'duck':
      return (
        <g>
          {r(2, 6, 7, 5, '#ffd93d')}
          {r(6, 2, 4, 5, '#ffd93d')}
          {r(10, 4, 2, 2, '#ff9f1c')}
          {r(8, 3, 1, 1, '#1b1b24')}
        </g>
      );
    case 'headphones':
      return (
        <g>
          {r(2, 1, 8, 2, '#2d2f4a')}
          {r(1, 3, 3, 6, '#5b6cff')}
          {r(8, 3, 3, 6, '#5b6cff')}
        </g>
      );
    case 'trophy':
      return (
        <g>
          {r(3, 1, 6, 5, '#f1c40f')}
          {r(1, 2, 2, 3, '#f1c40f')}
          {r(9, 2, 2, 3, '#f1c40f')}
          {r(5, 6, 2, 3, '#d4a60a')}
          {r(3, 9, 6, 2, '#8d6e0a')}
        </g>
      );
  }
}

const SCREEN = '#88c0f8';
const SHINE = '#c8e4ff';
const KEYS = '#58587c';
const METAL = '#a8acc4';

/** Um monitor com pé, a partir do canto de cima à esquerda. */
function Monitor({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <rect x={x + w / 2 - 2} y={y + 11} width={4} height={4} fill={INK} />
      <rect x={x} y={y} width={w} height={12} fill={INK} />
      <rect x={x + 2} y={y + 2} width={w - 4} height={7} fill={SCREEN} />
      <rect x={x + 2} y={y + 2} width={w - 4} height={2} fill={SHINE} />
    </g>
  );
}

/** Um notebook aberto: tela em cima, teclado embaixo. */
function Laptop({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={11} fill={INK} />
      <rect x={x + 2} y={y + 2} width={w - 4} height={7} fill={SCREEN} />
      <rect x={x + 2} y={y + 2} width={w - 4} height={2} fill={SHINE} />
      <rect x={x - 2} y={y + 11} width={w + 4} height={6} fill={INK} />
      <rect x={x} y={y + 12} width={w} height={4} fill={METAL} />
      <rect x={x + 2} y={y + 13} width={w - 4} height={2} fill={KEYS} />
    </g>
  );
}

/** O computador escolhido, centrado em `cx` no tampo da mesa. */
function Computer({
  kind,
  cx,
  top,
  bottom,
}: {
  kind: DeskComputer;
  cx: number;
  top: number;
  bottom: number;
}) {
  const keyboard = (
    <g>
      <rect x={cx - 9} y={bottom - 11} width={18} height={5} fill={INK} />
      <rect x={cx - 8} y={bottom - 10} width={16} height={3} fill={KEYS} />
      <rect x={cx + 11} y={bottom - 11} width={3} height={4} fill={INK} />
    </g>
  );
  switch (kind) {
    case 'dualMonitor':
      return (
        <g>
          <Monitor x={cx - 18} y={top + 3} w={17} />
          <Monitor x={cx + 1} y={top + 3} w={17} />
          {keyboard}
        </g>
      );
    case 'laptop':
      return <Laptop x={cx - 10} y={top + 8} w={20} />;
    case 'laptopMonitor':
      return (
        <g>
          <Monitor x={cx - 19} y={top + 3} w={18} />
          <Laptop x={cx + 3} y={top + 10} w={14} />
        </g>
      );
    default:
      return (
        <g>
          <Monitor x={cx - 10} y={top + 3} w={20} />
          {keyboard}
        </g>
      );
  }
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

/** Desenha uma mesinha de computador, com tapete, enfeites e plaquinha, em pixel art. */
export function DeskArt({
  desk,
  config,
  showLabel = true,
  freeHint = true,
  owner = null,
  onHoverChange,
}: Props) {
  const look = config ?? FREE_DESK_CONFIG;
  const { x, y, w, h } = desk;
  const top = DESK_COLORS[look.color];
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
      {/* O tapete cobre a área da mesinha (os 3 lugares à frente dela) */}
      {look.rug !== null ? (
        <g>
          <rect
            x={x}
            y={y + h}
            width={w}
            height={TILE}
            fill={RUG_COLORS[look.rug]}
          />
          <rect
            x={x + 2}
            y={y + h + 2}
            width={w - 4}
            height={TILE - 4}
            fill="none"
            stroke="#ffffff"
            strokeWidth={2}
            opacity={0.4}
          />
        </g>
      ) : null}

      {/* Uma cadeira só, no lugar do meio */}
      <rect x={x + w / 2 - 9} y={y + h + 4} width={18} height={18} fill={INK} />
      <rect
        x={x + w / 2 - 7}
        y={y + h + 6}
        width={14}
        height={14}
        fill="#4a4e80"
      />
      <rect
        x={x + w / 2 - 7}
        y={y + h + 6}
        width={14}
        height={4}
        fill="#6a6ea8"
      />
      {/* Tampo, com contorno escuro */}
      <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} fill={INK} />
      <rect x={x} y={y} width={w} height={h} fill={top} />
      <rect x={x} y={y} width={w} height={4} fill="#ffffff" opacity={0.25} />
      <rect
        x={x}
        y={y + h - 6}
        width={w}
        height={6}
        fill="#000000"
        opacity={0.22}
      />

      {/* O computador da mesa, no meio (a mesa é individual) */}
      <Computer kind={look.computer} cx={x + w / 2} top={y} bottom={y + h} />

      {look.items.map((item, index) => {
        const slot = slotOf(desk, index);
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
