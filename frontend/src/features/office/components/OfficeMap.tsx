import { useEffect, useRef, useState, type MouseEvent } from 'react';

import { DeskBalloon } from '@/features/desks/components/DeskBalloon';
import { deskCardState } from '@/features/desks/model/deskCard';
import { useDeskStore } from '@/features/desks/model/deskStore';
import {
  DESK_HEIGHT,
  DESK_WIDTH,
  TILE,
  callZoneId,
  canPlaceDesk,
  deskKey,
  getMap,
  resolveMap,
} from '@/shared/domain';

import { computeViewBox, type Size } from '../model/camera';
import type { WorldSnapshot } from '../model/officeWorld';
import { MapLayer } from './MapLayer';
import { PixelAvatar } from './PixelAvatar';

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
  onAdoptDesk: (deskId: string) => void;
  onMoveDesk: (deskId: string) => void;
  onToggleDeskLock: (deskId: string) => void;
  onEditDesk: (deskId: string) => void;
  onReleaseDesk: (deskId: string) => void;
};

const HOVER_LEAVE_GRACE_MS = 180;
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
  onAdoptDesk,
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
    setHoveredDeskId((current) => (current === deskId ? null : current));
  };

  const leaveDesk = (deskId: string) => {
    if (leaveTimerRef.current !== null) {
      window.clearTimeout(leaveTimerRef.current);
    }
    leaveTimerRef.current = window.setTimeout(() => {
      leaveTimerRef.current = null;
      setHoveredDeskId((current) => {
        if (current !== deskId) return current;
        if (deskId !== activeDeskId) {
          setClosingDeskId(deskId);
          if (closeTimerRef.current !== null) {
            window.clearTimeout(closeTimerRef.current);
          }
          closeTimerRef.current = window.setTimeout(() => {
            closeTimerRef.current = null;
            setClosingDeskId((c) => (c === deskId ? null : c));
          }, CLOSE_ANIMATION_MS);
        }
        return null;
      });
    }, HOVER_LEAVE_GRACE_MS);
  };

  const handleMapHoverDesk = (deskId: string | null) => {
    if (deskId) {
      enterDesk(deskId);
    } else if (hoveredDeskId) {
      leaveDesk(hoveredDeskId);
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
          desk.id === activeDeskId ||
          desk.id === hoveredDeskId ||
          desk.id === closingDeskId,
      );
  const view = computeViewBox(
    map,
    viewport,
    zoom,
    me ?? { x: map.width / 2, y: map.height / 2 },
  );

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
    if (!movingDeskId || !onPlaceDesk) return;
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
          onHoverDesk={movingDeskId ? undefined : handleMapHoverDesk}
        />
        {[...snapshot.players]
          .sort((a, b) => a.y - b.y)
          .map((player) => (
            <PixelAvatar
              key={player.id}
              player={player}
              isMe={player.id === snapshot.meId}
              speaking={speakingSet.has(player.id)}
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
        const isClosing = desk.id === closingDeskId && !isStanding;
        const expanded = desk.id === hoveredDeskId || isClosing;
        const screenX =
          ((desk.x + desk.w / 2 - view.x) / view.w) * viewport.width;
        const screenY = ((desk.y - view.y) / view.h) * viewport.height;

        return (
          <DeskBalloon
            key={desk.id}
            x={screenX}
            y={screenY}
            desk={desk}
            info={info}
            state={state}
            isStanding={isStanding}
            expanded={expanded}
            closing={isClosing}
            onMouseEnter={() => enterDesk(desk.id)}
            onMouseLeave={() => leaveDesk(desk.id)}
            onExpand={() => enterDesk(desk.id)}
            onCollapse={() => collapseDesk(desk.id)}
            onAdopt={() => onAdoptDesk(desk.id)}
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
