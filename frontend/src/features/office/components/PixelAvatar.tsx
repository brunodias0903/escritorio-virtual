import { STATUS_LABELS, type Status } from '@/shared/domain';

import type { RenderPlayer } from '../model/officeWorld';
import {
  buildSprite,
  SPRITE_H,
  SPRITE_W,
  type WalkFrame,
} from '../model/sprite';

/** Cada pixel do desenho vira SCALE pixels do mapa. */
const SPRITE_SCALE = 2;

const STATUS_COLORS: Record<Status, string> = {
  available: '#31e0c1',
  busy: '#ff6b81',
  away: '#f1c40f',
};

/** Duração de cada pose do passo, em ms: parado, pé esquerdo, parado, pé direito. */
const WALK_POSE_MS = 100;
const WALK_CYCLE: WalkFrame[] = [1, 0, 2, 0];
/** Espaço entre o alto da cabeça e o balão do nome. */
const LABEL_GAP = 10;

type Props = {
  player: RenderPlayer;
  isMe: boolean;
  /** Está falando agora na chamada (mostra indicador de alto-falante na cabeça). */
  speaking?: boolean;
  /** Relógio do jogo, em ms. Faz as pernas alternarem enquanto anda. */
  time: number;
};

/** Ícone pequeno de alto-falante (ondas de som) sobre a cabeça do avatar. */
function SpeakerGlyph({
  x,
  y,
  pulse,
}: {
  x: number;
  y: number;
  pulse: boolean;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <path
        d="M-4 -2.2 L-1.8 -2.2 L0.8 -4.4 L0.8 4.4 L-1.8 2.2 L-4 2.2 Z"
        fill="#31e0c1"
      />
      <path
        d="M2.6 -2.4 A 3.4 3.4 0 0 1 2.6 2.4"
        fill="none"
        stroke="#31e0c1"
        strokeWidth={1.3}
        strokeLinecap="round"
      />
      <path
        d="M4.6 -4.1 A 5.6 5.6 0 0 1 4.6 4.1"
        fill="none"
        stroke="#31e0c1"
        strokeWidth={1.2}
        strokeLinecap="round"
        opacity={pulse ? 1 : 0.35}
      />
    </g>
  );
}

export function PixelAvatar({ player, isMe, speaking = false, time }: Props) {
  const frame: WalkFrame = player.moving
    ? WALK_CYCLE[Math.floor(time / WALK_POSE_MS) % WALK_CYCLE.length]!
    : 0;
  const rects = buildSprite(player.appearance, player.facing, frame);
  const width = SPRITE_W * SPRITE_SCALE;
  // Os pés ficam na base do quadradinho (16 px abaixo do centro); a cabeça passa do quadradinho.
  const top = 16 - SPRITE_H * SPRITE_SCALE;
  const pulse = Math.floor(time / 240) % 2 === 0;

  const extraSpeakerW = speaking ? 14 : 0;
  const labelWidth = Math.max(
    44,
    player.name.length * 5.6 + 24 + extraSpeakerW,
  );
  const labelHeight = 17;
  const labelY = -labelHeight + 3;

  return (
    <g transform={`translate(${player.x}, ${player.y})`}>
      <ellipse cx={0} cy={14} rx={9} ry={3} fill="#000000" opacity={0.25} />
      {isMe ? (
        <ellipse
          cx={0}
          cy={14}
          rx={13}
          ry={5}
          fill="none"
          stroke={speaking ? '#31e0c1' : '#ffffff'}
          strokeWidth={speaking ? 1.5 : 1}
          opacity={speaking ? 0.95 : 0.7}
        />
      ) : speaking ? (
        <ellipse
          cx={0}
          cy={14}
          rx={12}
          ry={4.5}
          fill="none"
          stroke="#31e0c1"
          strokeWidth={1.4}
          opacity={0.85}
        />
      ) : null}

      <g transform={`translate(${-width / 2}, ${top})`}>
        {rects.map((r, index) => (
          <rect
            key={index}
            x={r.x * SPRITE_SCALE}
            y={r.y * SPRITE_SCALE}
            width={r.w * SPRITE_SCALE}
            height={r.h * SPRITE_SCALE}
            fill={r.fill}
          />
        ))}
      </g>

      {/* Para o próprio avatar: mostra um selo compacto de alto-falante quando está falando. */}
      {isMe && speaking ? (
        <g transform={`translate(0, ${top - LABEL_GAP})`}>
          <rect
            x={-13}
            y={-14}
            width={26}
            height={16}
            rx={8}
            fill="#0f1430"
            fillOpacity={0.92}
            stroke="#31e0c1"
            strokeWidth={1.2}
          />
          <polygon points="-3,2 3,2 0,5.5" fill="#0f1430" fillOpacity={0.92} />
          <SpeakerGlyph x={-1} y={-6} pulse={pulse} />
        </g>
      ) : null}

      {/* Balãozinho moderno com o nome, status e indicador de alto-falante sobre os outros avatares. */}
      {!isMe ? (
        <g transform={`translate(0, ${top - LABEL_GAP})`}>
          <rect
            x={-labelWidth / 2}
            y={labelY}
            width={labelWidth}
            height={labelHeight}
            rx={8.5}
            fill="#0f1430"
            fillOpacity={0.9}
            stroke={speaking ? '#31e0c1' : 'rgba(170, 178, 230, 0.35)'}
            strokeWidth={speaking ? 1.3 : 1}
          />
          <polygon
            points="-3.5,3 3.5,3 0,6.5"
            fill="#0f1430"
            fillOpacity={0.9}
          />
          <circle
            cx={-labelWidth / 2 + 9}
            cy={labelY + labelHeight / 2}
            r={3.2}
            fill={STATUS_COLORS[player.status]}
            stroke="#0f1430"
            strokeWidth={1}
          />
          <text
            x={speaking ? -2 : 4}
            y={labelY + labelHeight / 2 + 3.2}
            fontSize={9}
            fontWeight={600}
            fill="#ffffff"
            textAnchor="middle"
            aria-label={`${player.name}: ${STATUS_LABELS[player.status]}`}
          >
            {player.name}
          </text>
          {speaking ? (
            <SpeakerGlyph
              x={labelWidth / 2 - 11}
              y={labelY + labelHeight / 2}
              pulse={pulse}
            />
          ) : null}
        </g>
      ) : null}

      {player.emote ? (
        <g
          transform={`translate(0, ${top - (isMe ? (speaking ? LABEL_GAP + 22 : LABEL_GAP) : LABEL_GAP + 24)})`}
        >
          <rect x={-14} y={-16} width={28} height={24} rx={8} fill="#ffffff" />
          <text x={0} y={2} fontSize={16} textAnchor="middle">
            {player.emote}
          </text>
        </g>
      ) : null}
    </g>
  );
}
