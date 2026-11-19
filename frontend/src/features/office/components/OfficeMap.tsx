import { useRef, useState, type MouseEvent } from 'react';

import { DeskTooltip } from '@/features/desks/components/DeskArt';
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
};

export function OfficeMap({
  snapshot,
  time,
  zoom,
  viewport,
  movingDeskId = null,
  onPlaceDesk,
  speakingIds = [],
}: Props) {
  const speakingSet = new Set(speakingIds);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const desks = useDeskStore((state) => state.desks);
  const deskList = Object.values(desks);
  const [hoveredDeskId, setHoveredDeskId] = useState<string | null>(null);
  const [ghostTile, setGhostTile] = useState<{
    col: number;
    row: number;
  } | null>(null);

  const baseMap = getMap(snapshot.map);
  const map = resolveMap(snapshot.map, deskList);
  const me = snapshot.players.find((p) => p.id === snapshot.meId);
  const activeDeskId = me ? callZoneId(map, me) : null;
  const visibleTooltips = movingDeskId
    ? []
    : map.desks.filter(
        (desk) => desk.id === activeDeskId || desk.id === hoveredDeskId,
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
        onHoverDesk={movingDeskId ? undefined : setHoveredDeskId}
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
      {visibleTooltips.map((desk) => {
        const info = desks[deskKey(snapshot.map, desk.id)];
        return (
          <DeskTooltip
            key={desk.id}
            desk={desk}
            config={info?.config ?? null}
            owner={info?.owner ?? null}
          />
        );
      })}
    </svg>
  );
}
