import type { Appearance } from '@/shared/domain';

import { buildSprite, SPRITE_W } from '../model/sprite';

/** Linhas do desenho do avatar que entram no retrato (cabeça e ombros). */
const FACE_ROWS = 15;

/** Retrato redondo do avatar: só a cabeça e os ombros, em pixel art. */
export function FaceAvatar({
  appearance,
  size = 36,
}: {
  appearance: Appearance;
  size?: number;
}) {
  const rects = buildSprite(appearance, 'down', 0);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${SPRITE_W} ${FACE_ROWS}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={{
        display: 'block',
        flexShrink: 0,
        borderRadius: '50%',
        backgroundColor: 'var(--bg-avatar-face)',
      }}
    >
      {rects
        .filter((r) => r.y < FACE_ROWS)
        .map((r, index) => (
          <rect
            key={index}
            x={r.x}
            y={r.y}
            width={r.w}
            height={Math.min(r.h, FACE_ROWS - r.y)}
            fill={r.fill}
          />
        ))}
    </svg>
  );
}
