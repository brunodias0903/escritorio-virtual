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
  coffee: '#e07a4b',
  lunch: '#f39c12',
  away: '#f1c40f',
};

/** Duração de cada pose do passo, em ms: parado, pé esquerdo, parado, pé direito. */
const WALK_POSE_MS = 100;
const WALK_CYCLE: WalkFrame[] = [1, 0, 2, 0];
/** Espaço entre o alto da cabeça e o balão do nome. */
const LABEL_GAP = 10;

const INK = '#1e191d';

export type SeatedPose = {
  facing: RenderPlayer['facing'];
  /** Cor do encosto da cadeira (desenhado nas costas do avatar quando sentado de costas/perfil). */
  chairColor?: string;
  /** Deslocamento horizontal leve em direção à mesa (para mesas de 1:1 / 4 lugares). */
  offsetX?: number;
  /** Deslocamento vertical para encaixar o avatar na cadeira em frente à bancada. */
  offsetY?: number;
};

type Props = {
  player: RenderPlayer;
  isMe: boolean;
  /** Está falando agora na chamada (mostra indicador de alto-falante na cabeça). */
  speaking?: boolean;
  /** Quando o avatar está parado em cima de uma cadeira de mesa, senta trabalhando. */
  seated?: SeatedPose | null;
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

export function PixelAvatar({
  player,
  isMe,
  speaking = false,
  seated = null,
  time,
}: Props) {
  const isSitting = Boolean(
    seated &&
    !player.moving &&
    (seated.chairColor !== undefined ||
      seated.offsetX !== undefined ||
      seated.offsetY !== undefined),
  );
  const effectiveFacing =
    seated && !player.moving ? seated.facing : player.facing;
  const frame: WalkFrame = player.moving
    ? WALK_CYCLE[Math.floor(time / WALK_POSE_MS) % WALK_CYCLE.length]!
    : 0;
  // Quando sentado na cadeira, esconde os pixels inferiores das pernas/sapatos (y >= 19) que ficam sob o assento/mesa
  const allRects = buildSprite(player.appearance, effectiveFacing, frame);
  const rects = isSitting
    ? allRects
        .filter((r) => r.y < 19)
        .map((r) => (r.y + r.h > 19 ? { ...r, h: Math.max(1, 19 - r.y) } : r))
    : allRects;
  const width = SPRITE_W * SPRITE_SCALE;
  const sitDx = isSitting && seated?.offsetX ? seated.offsetX : 0;
  const sitDy = isSitting && seated?.offsetY ? seated.offsetY : 0;
  // Os pés ficam na base do quadradinho (16 px abaixo do centro); quando sentado, encaixa no assento da cadeira.
  const top = 16 - SPRITE_H * SPRITE_SCALE + sitDy;
  const pulse = Math.floor(time / 240) % 2 === 0;

  const extraSpeakerW = speaking ? 14 : 0;
  const labelWidth = Math.max(
    44,
    player.name.length * 5.6 + 24 + extraSpeakerW,
  );
  const labelHeight = 17;
  const labelY = -labelHeight + 3;

  return (
    <g
      transform={`translate(${player.x + sitDx}, ${player.y})`}
      style={{ pointerEvents: 'none' }}
    >
      <ellipse
        cx={0}
        cy={14 + (isSitting ? -4 : 0)}
        rx={9}
        ry={3}
        fill="#000000"
        opacity={0.25}
      />
      {isMe ? (
        <ellipse
          cx={0}
          cy={14 + (isSitting ? -4 : 0)}
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
          cy={14 + (isSitting ? -4 : 0)}
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

      {/* Quando sentado na poltrona executiva da mesa (virado para o monitor), desenha o encosto da cadeira abraçando as costas */}
      {isSitting && seated?.chairColor && effectiveFacing === 'up' ? (
        <g>
          {/* Base estrela sob a cadeira */}
          <rect x={-2} y={7} width={4} height={5} fill={INK} />
          <rect x={-7} y={10} width={14} height={2.5} fill={INK} />
          <rect x={-5} y={10} width={10} height={1.5} fill="#697387" />
          {/* Apoios de braço laterais */}
          <rect x={-12} y={-4} width={3} height={7} fill={INK} />
          <rect x={-11} y={-3} width={2} height={3} fill="#e1e6ef" />
          <rect x={9} y={-4} width={3} height={7} fill={INK} />
          <rect x={9} y={-3} width={2} height={3} fill="#e1e6ef" />
          {/* Encosto da poltrona na frente das costas inferiores do avatar */}
          <rect x={-9} y={-6} width={18} height={14} fill={INK} />
          <rect x={-7} y={-4} width={14} height={10} fill={seated.chairColor} />
          <rect
            x={-7}
            y={-4}
            width={14}
            height={2.5}
            fill="#ffffff"
            opacity={0.26}
          />
          <rect
            x={-5}
            y={-1}
            width={10}
            height={5}
            fill="none"
            stroke={INK}
            strokeWidth={1.2}
            opacity={0.45}
          />
        </g>
      ) : null}

      {/* Quando em status "Tomando um café" ou "Almoçando" (parado), anima o personagem tomando café ou almoçando */}
      {!player.moving &&
      (player.status === 'coffee' || player.status === 'lunch') ? (
        <g>
          {player.status === 'coffee' ? (
            // Caneca de café fumegante que sobe e desce suavemente até a boca
            <g
              transform={`translate(5, ${top + 20 - (Math.floor(time / 480) % 2) * 3})`}
            >
              {/* Vapor do café */}
              <rect
                x={2}
                y={-5 - (Math.floor(time / 320) % 2) * 2}
                width={2}
                height={3}
                fill="#ffffff"
                opacity={0.75}
              />
              <rect
                x={6}
                y={-6 - ((Math.floor(time / 320) + 1) % 2) * 2}
                width={2}
                height={3}
                fill="#ffffff"
                opacity={0.65}
              />
              {/* Corpo da caneca em pixel art */}
              <rect x={0} y={0} width={9} height={9} fill={INK} />
              <rect x={1} y={1} width={7} height={7} fill="#f5f7fa" />
              <rect x={2} y={3} width={5} height={4} fill="#e05a52" />
              <rect x={9} y={2} width={2.5} height={5} fill={INK} />
            </g>
          ) : (
            // Prato de almoço / lanche animado com garfo subindo até a boca
            <g
              transform={`translate(4, ${top + 21 - (Math.floor(time / 520) % 2) * 3})`}
            >
              <rect x={-2} y={3} width={14} height={5} fill={INK} />
              <rect x={-1} y={4} width={12} height={3} fill="#f5f7fa" />
              <rect x={1} y={0} width={8} height={4} fill={INK} />
              <rect x={2} y={1} width={6} height={3} fill="#f7cf59" />
              <rect x={3} y={0} width={4} height={2} fill="#e05a52" />
              <rect x={6} y={1} width={3} height={2} fill="#52ab3a" />
            </g>
          )}
          {/* Ícone vetorial flutuante de status (café ou almoço) ao lado da cabeça */}
          <g
            transform={`translate(14, ${top + 4 - (Math.floor(time / 600) % 2) * 2})`}
          >
            <rect
              x={-8}
              y={-8}
              width={16}
              height={16}
              rx={8}
              fill="#0f1430"
              fillOpacity={0.9}
              stroke={player.status === 'coffee' ? '#e07a4b' : '#f39c12'}
              strokeWidth={1.2}
            />
            {player.status === 'coffee' ? (
              <g
                stroke="#f5c6aa"
                strokeWidth={1.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              >
                <path d="M-3.5 -1.5h6v3.5a2.5 2.5 0 0 1-2.5 2.5h-1a2.5 2.5 0 0 1-2.5-2.5z" />
                <path d="M2.5 -0.8h1.2a1.3 1.3 0 0 1 0 2.6H2.5" />
                <path d="M-1.8 -3.6v1M0.5 -3.6v1" />
              </g>
            ) : (
              <g
                stroke="#fde08a"
                strokeWidth={1.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              >
                <path d="M-2.4 -4v3.2M-3.6 -4v1.8a1.2 1.2 0 0 0 2.4 0V-4M-2.4 -0.8v4.8" />
                <path d="M2.6 -4v8M2.6 -4c1.3 0.7 1.3 2.7 0 3.4" />
              </g>
            )}
          </g>
        </g>
      ) : null}

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
