import { useEffect, useRef, useState, type MouseEvent } from 'react';

import { DeskBalloon } from '@/features/desks/components/DeskBalloon';
import { deskCardState } from '@/features/desks/model/deskCard';
import { useDeskStore } from '@/features/desks/model/deskStore';
import {
  CHAIR_COLORS,
  DESK_HEIGHT,
  DESK_WIDTH,
  TILE,
  areaAt,
  callZoneId,
  canPlaceDesk,
  deskKey,
  getMap,
  resolveMap,
  type DeskInfo,
  type MapDef,
} from '@/shared/domain';

import { computeViewBox, type Size } from '../model/camera';
import type { RenderPlayer, WorldSnapshot } from '../model/officeWorld';
import { MapLayer } from './MapLayer';
import { PixelAvatar, type SeatedPose } from './PixelAvatar';

/**
 * Detecta se o jogador está exatamente na cadeira de uma mesa de trabalho ou em
 * uma poltrona das mesas de reunião (1:1, 4 lugares ou sala de reunião), para
 * renderizá-lo sentado trabalhando / reunido.
 */
function resolveSeatedPose(
  map: MapDef,
  desks: Record<string, DeskInfo>,
  player: RenderPlayer,
): SeatedPose | null {
  if (player.moving) return null;

  // 1. Cadeira central de uma estação de trabalho (`desk`): fica no meio da zona logo abaixo do tampo
  for (const desk of map.desks) {
    const chairX = desk.x + desk.w / 2;
    const chairY = desk.y + desk.h + TILE / 2;
    if (player.x === chairX && player.y === chairY) {
      const info = desks[deskKey(map.id, desk.id)];
      const chairIdx = info?.config.chair ?? 0;
      const chairColor = CHAIR_COLORS[chairIdx] ?? CHAIR_COLORS[0];
      return {
        facing: 'up',
        chairColor,
        offsetY: -5,
      };
    }
  }

  // 2. Mesas de reunião rápida nas paredes/cantos (`booth2` = 2 lugares e `booth4` = 4 lugares)
  const area = areaAt(map, player);
  if (area && !area.desk && !area.private && area.capacity !== undefined) {
    const midX = area.x + area.w / 2;
    if (player.x < midX) {
      return { facing: 'right', offsetX: 6, offsetY: -2 };
    }
    if (player.x > midX) {
      return { facing: 'left', offsetX: -6, offsetY: -2 };
    }
  }

  // 3. Poltronas ao redor das grandes mesas de reunião (`table` 5x3)
  for (const s of map.solids) {
    if (s.kind !== 'table') continue;
    // Fileira de cima da mesa (olhando para baixo)
    if (player.y === s.y - TILE / 2 && player.x > s.x && player.x < s.x + s.w) {
      return { facing: 'down', offsetY: 6 };
    }
    // Fileira de baixo da mesa (olhando para cima, com encosto combinando com a cor da poltrona)
    if (
      player.y === s.y + s.h + TILE / 2 &&
      player.x > s.x &&
      player.x < s.x + s.w
    ) {
      const col = Math.floor((player.x - s.x) / TILE);
      const chairColor = col % 2 === 0 ? '#397f94' : '#59804b';
      return {
        facing: 'up',
        chairColor,
        offsetY: -5,
      };
    }
    // Cabeceira esquerda (somente na fileira central onde está a poltrona)
    if (player.x === s.x - TILE / 2 && player.y === s.y + s.h / 2) {
      return { facing: 'right', offsetX: 6, offsetY: -2 };
    }
    // Cabeceira direita (somente na fileira central onde está a poltrona)
    if (player.x === s.x + s.w + TILE / 2 && player.y === s.y + s.h / 2) {
      return { facing: 'left', offsetX: -6, offsetY: -2 };
    }
  }

  // 4. Em frente à bancada da copa/cafeteria com status "coffee" ou "lunch": vira para a bancada
  if (player.status === 'coffee' || player.status === 'lunch') {
    for (const s of map.solids) {
      if (s.kind !== 'pantry' && s.kind !== 'fridge') continue;
      if (player.x >= s.x && player.x <= s.x + s.w) {
        if (player.y === s.y - TILE / 2) {
          return { facing: 'down' };
        }
        if (player.y === s.y + s.h + TILE / 2) {
          return { facing: 'up' };
        }
      }
    }
  }

  return null;
}

type Props = {
  snapshot: WorldSnapshot;
  /** Relógio do jogo, em ms (anima as pernas). */
  time: number;
  /** Nível de zoom: menor mostra mais do escritório. */
  zoom: number;
  /** Dimensões da área visível do mapa, em pixels. */
  viewport: Size;
  /** Quando definido, ativa o modo de posicionar essa mesa clicando no mapa. */
  movingDeskId?: string | null;
  onPlaceDesk?: (col: number, row: number) => void;
  /** Ids dos jogadores falando agora na chamada (mostra alto-falante na cabeça). */
  speakingIds?: readonly string[];
  /** Chamado ao clicar no popup centralizado de uma sala em chamada (ex.: Sala de reunião). */
  onGoToArea?: (areaId: string) => void;
  myEmail: string;
  iHaveDesk: boolean;
  isAdmin: boolean;
  /** True quando o usuário está em chamada (posiciona balões para baixo longe das câmeras). */
  inCall?: boolean;
  /** Mesa para focar suavemente com a câmera (ex.: hover no botão "Ir até a mesa"). */
  previewDeskId?: string | null;
  pendingDeskAction?: {
    deskId: string;
    action: 'adopt' | 'release' | 'lock';
  } | null;
  onAdoptDesk: (deskId: string) => void;
  onSitDesk?: (deskId: string) => void;
  onMoveDesk: (deskId: string) => void;
  onToggleDeskLock: (deskId: string) => void;
  onEditDesk: (deskId: string) => void;
  onReleaseDesk: (deskId: string) => void;
};

const HOVER_LEAVE_GRACE_MS = 260;
const CLOSE_ANIMATION_MS = 200;

export function OfficeMap({
  snapshot,
  time,
  zoom,
  viewport,
  movingDeskId = null,
  onPlaceDesk,
  speakingIds = [],
  onGoToArea,
  myEmail,
  iHaveDesk,
  isAdmin,
  inCall = false,
  previewDeskId = null,
  pendingDeskAction = null,
  onAdoptDesk,
  onSitDesk,
  onMoveDesk,
  onToggleDeskLock,
  onEditDesk,
  onReleaseDesk,
}: Props) {
  const speakingSet = new Set(speakingIds);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const desks = useDeskStore((state) => state.desks);
  const deskList = Object.values(desks);
  const [hoveredDeskId, setHoveredDeskId] = useState<string | null>(null);
  const [closingDeskId, setClosingDeskId] = useState<string | null>(null);
  const mapHoverDeskRef = useRef<string | null>(null);
  const balloonHoverDeskRef = useRef<string | null>(null);
  const leaveTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [ghostTile, setGhostTile] = useState<{
    col: number;
    row: number;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current !== null) {
        window.clearTimeout(leaveTimerRef.current);
      }
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const baseMap = getMap(snapshot.map);
  const map = resolveMap(snapshot.map, deskList);
  const me = snapshot.players.find((p) => p.id === snapshot.meId);
  const activeDeskId = me ? callZoneId(map, me) : null;

  const previewTarget = previewDeskId
    ? map.desks.find((d) => d.id === previewDeskId)
    : undefined;
  const targetCenter = previewTarget
    ? {
        x: previewTarget.x + previewTarget.w / 2,
        y: previewTarget.y + previewTarget.h / 2,
      }
    : (me ?? { x: map.width / 2, y: map.height / 2 });

  const [camCenter, setCamCenter] = useState(targetCenter);
  const camCenterRef = useRef(targetCenter);

  useEffect(() => {
    const tgt = { x: targetCenter.x, y: targetCenter.y };
    let raf = 0;
    const step = () => {
      const cur = camCenterRef.current;
      const dx = tgt.x - cur.x;
      const dy = tgt.y - cur.y;
      if (Math.hypot(dx, dy) < 0.8) {
        if (cur.x !== tgt.x || cur.y !== tgt.y) {
          camCenterRef.current = tgt;
          setCamCenter(tgt);
        }
        return;
      }
      const next = { x: cur.x + dx * 0.2, y: cur.y + dy * 0.2 };
      camCenterRef.current = next;
      setCamCenter(next);
      raf = window.requestAnimationFrame(step);
    };
    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, [targetCenter.x, targetCenter.y]);

  const enterDesk = (deskId: string) => {
    if (leaveTimerRef.current !== null) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setClosingDeskId(null);
    setHoveredDeskId(deskId);
  };

  const collapseDesk = (deskId: string) => {
    if (leaveTimerRef.current !== null) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    if (mapHoverDeskRef.current === deskId) mapHoverDeskRef.current = null;
    if (balloonHoverDeskRef.current === deskId) {
      balloonHoverDeskRef.current = null;
    }
    setHoveredDeskId((current) => (current === deskId ? null : current));
  };

  const leaveDesk = (deskId: string) => {
    if (
      mapHoverDeskRef.current === deskId ||
      balloonHoverDeskRef.current === deskId
    ) {
      return;
    }
    if (leaveTimerRef.current !== null) {
      window.clearTimeout(leaveTimerRef.current);
    }
    leaveTimerRef.current = window.setTimeout(() => {
      leaveTimerRef.current = null;
      if (
        mapHoverDeskRef.current === deskId ||
        balloonHoverDeskRef.current === deskId
      ) {
        return;
      }
      setHoveredDeskId((current) => {
        if (current !== deskId) return current;
        setClosingDeskId(deskId);
        if (closeTimerRef.current !== null) {
          window.clearTimeout(closeTimerRef.current);
        }
        closeTimerRef.current = window.setTimeout(() => {
          closeTimerRef.current = null;
          setClosingDeskId((c) => (c === deskId ? null : c));
        }, CLOSE_ANIMATION_MS);
        return null;
      });
    }, HOVER_LEAVE_GRACE_MS);
  };

  const handleMapHoverDesk = (deskId: string | null) => {
    if (deskId) {
      mapHoverDeskRef.current = deskId;
      enterDesk(deskId);
    } else {
      const prev = mapHoverDeskRef.current ?? hoveredDeskId;
      mapHoverDeskRef.current = null;
      if (prev) leaveDesk(prev);
    }
  };

  const handleMapTapDesk = (deskId: string) => {
    if (hoveredDeskId === deskId) {
      collapseDesk(deskId);
    } else {
      enterDesk(deskId);
    }
  };

  const activeRooms = movingDeskId
    ? []
    : map.areas
        .filter((area) => !area.desk && area.id !== activeDeskId)
        .map((area) => ({
          area,
          count: snapshot.players.filter((p) => callZoneId(map, p) === area.id)
            .length,
        }))
        .filter((entry) => entry.count > 0);
  const visibleBalloons = movingDeskId
    ? []
    : map.desks.filter(
        (desk) =>
          desk.id === hoveredDeskId ||
          desk.id === closingDeskId ||
          pendingDeskAction?.deskId === desk.id,
      );
  const view = computeViewBox(map, viewport, zoom, camCenter);

  const tileFromPointer = (
    event: MouseEvent<SVGSVGElement>,
  ): { col: number; row: number } | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const mapped = point.matrixTransform(ctm.inverse());
    return {
      col: Math.floor(mapped.x / TILE) - 1,
      row: Math.floor(mapped.y / TILE),
    };
  };

  const isPlacementValid = (col: number, row: number): boolean => {
    if (!movingDeskId) return false;
    if (!canPlaceDesk(baseMap, movingDeskId, col, row, deskList)) return false;
    const topX = col * TILE;
    const topY = row * TILE;
    return !snapshot.players.some(
      (p) =>
        p.tx >= topX &&
        p.tx < topX + DESK_WIDTH &&
        p.ty >= topY &&
        p.ty < topY + DESK_HEIGHT,
    );
  };

  const ghost = movingDeskId ? ghostTile : null;
  const ghostValid = ghost ? isPlacementValid(ghost.col, ghost.row) : false;

  const handleMouseMove = (event: MouseEvent<SVGSVGElement>) => {
    if (!movingDeskId) return;
    const next = tileFromPointer(event);
    if (next && (ghostTile?.col !== next.col || ghostTile?.row !== next.row)) {
      setGhostTile(next);
    }
  };

  const handleClick = (event: MouseEvent<SVGSVGElement>) => {
    if (!movingDeskId) {
      if (hoveredDeskId) collapseDesk(hoveredDeskId);
      return;
    }
    if (!onPlaceDesk) return;
    const target = tileFromPointer(event);
    if (!target || !isPlacementValid(target.col, target.row)) return;
    onPlaceDesk(target.col, target.row);
    setGhostTile(null);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label={`Mapa do escritório: ${map.name}`}
        style={{
          display: 'block',
          userSelect: 'none',
          cursor: movingDeskId
            ? ghostValid
              ? 'pointer'
              : 'not-allowed'
            : undefined,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={movingDeskId ? () => setGhostTile(null) : undefined}
        onClick={handleClick}
      >
        <MapLayer
          mapId={snapshot.map}
          desks={desks}
          myEmail={myEmail}
          onHoverDesk={movingDeskId ? undefined : handleMapHoverDesk}
          onTapDesk={movingDeskId ? undefined : handleMapTapDesk}
        />
        {[...snapshot.players]
          .sort((a, b) => a.y - b.y)
          .map((player) => (
            <PixelAvatar
              key={player.id}
              player={player}
              isMe={player.id === snapshot.meId}
              speaking={speakingSet.has(player.id)}
              seated={resolveSeatedPose(map, desks, player)}
              time={time}
            />
          ))}
        {ghost ? (
          <g style={{ pointerEvents: 'none' }}>
            {/* Prévia do tampo da mesa (3x1) */}
            <rect
              x={ghost.col * TILE}
              y={ghost.row * TILE}
              width={DESK_WIDTH}
              height={DESK_HEIGHT}
              fill={ghostValid ? '#31e0c1' : '#ff6b81'}
              fillOpacity={0.32}
              stroke={ghostValid ? '#31e0c1' : '#ff6b81'}
              strokeWidth={2}
            />
            {/* Prévia da área de cadeiras/lugares (3x1 logo abaixo) */}
            <rect
              x={ghost.col * TILE}
              y={(ghost.row + 1) * TILE}
              width={DESK_WIDTH}
              height={TILE}
              fill={ghostValid ? '#31e0c1' : '#ff6b81'}
              fillOpacity={0.14}
              stroke={ghostValid ? '#31e0c1' : '#ff6b81'}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          </g>
        ) : null}
        {activeRooms.map(({ area, count }) => {
          const cx = area.x + area.w / 2;
          const cy = area.y + area.h / 2;
          const w = 136;
          const h = 50;
          const peopleLabel = count === 1 ? '1 pessoa' : `${count} pessoas`;
          return (
            <g
              key={`room-call-${area.id}`}
              transform={`translate(${cx - w / 2}, ${cy - h / 2})`}
              role="button"
              tabIndex={0}
              aria-label={`Ir para ${area.name} (${peopleLabel} na chamada)`}
              style={{ cursor: 'pointer' }}
              onClick={(event) => {
                event.stopPropagation();
                onGoToArea?.(area.id);
              }}
            >
              <rect
                width={w}
                height={h}
                rx={8}
                fill="var(--bg-tooltip)"
                fillOpacity={0.94}
                stroke="var(--status-available)"
                strokeWidth={1.4}
              />
              <circle cx={13} cy={13} r={3.5} fill="var(--status-available)" />
              <text
                x={21}
                y={16}
                fontSize={8.5}
                fontWeight={700}
                fill="#ffffff"
              >
                {area.name} · {peopleLabel}
              </text>
              <rect
                x={16}
                y={24}
                width={w - 32}
                height={18}
                rx={9}
                fill="var(--presence-strong)"
              />
              <text
                x={w / 2}
                y={36}
                fontSize={8.5}
                fontWeight={700}
                fill="#ffffff"
                textAnchor="middle"
              >
                Entrar na chamada
              </text>
            </g>
          );
        })}
      </svg>

      {visibleBalloons.map((desk) => {
        const info = desks[deskKey(snapshot.map, desk.id)];
        const people = snapshot.players.filter(
          (p) => callZoneId(map, p) === desk.id,
        ).length;
        const state = deskCardState({
          name: desk.name,
          people,
          info,
          myEmail,
          iHaveDesk,
          isAdmin,
        });
        const isStanding = desk.id === activeDeskId;
        const isSeated = Boolean(
          me &&
          !me.moving &&
          me.x === desk.x + desk.w / 2 &&
          me.y === desk.y + desk.h + TILE / 2,
        );
        const isClosing =
          desk.id === closingDeskId && desk.id !== hoveredDeskId;
        const expanded =
          desk.id === hoveredDeskId ||
          isClosing ||
          pendingDeskAction?.deskId === desk.id;
        const screenX =
          ((desk.x + desk.w / 2 - view.x) / view.w) * viewport.width;
        const screenY = ((desk.y - view.y) / view.h) * viewport.height;
        const bottomY = ((desk.y + desk.h - view.y) / view.h) * viewport.height;
        const placeBelow = inCall || screenY < 220;

        return (
          <DeskBalloon
            key={desk.id}
            x={screenX}
            y={placeBelow ? bottomY : screenY}
            placeBelow={placeBelow}
            desk={desk}
            info={info}
            state={state}
            isStanding={isStanding}
            isSeated={isSeated}
            expanded={expanded}
            closing={isClosing}
            pendingAction={
              pendingDeskAction?.deskId === desk.id
                ? pendingDeskAction.action
                : null
            }
            onMouseEnter={() => {
              balloonHoverDeskRef.current = desk.id;
              enterDesk(desk.id);
            }}
            onMouseLeave={() => {
              if (balloonHoverDeskRef.current === desk.id) {
                balloonHoverDeskRef.current = null;
              }
              leaveDesk(desk.id);
            }}
            onExpand={() => enterDesk(desk.id)}
            onCollapse={() => collapseDesk(desk.id)}
            onAdopt={() => onAdoptDesk(desk.id)}
            onSit={onSitDesk ? () => onSitDesk(desk.id) : undefined}
            onMove={() => onMoveDesk(desk.id)}
            onToggleLock={() => onToggleDeskLock(desk.id)}
            onEdit={() => onEditDesk(desk.id)}
            onRelease={() => onReleaseDesk(desk.id)}
          />
        );
      })}
    </div>
  );
}
