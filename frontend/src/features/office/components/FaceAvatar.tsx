import type { Appearance } from '@/shared/domain';

import { buildSprite, SPRITE_W } from '../model/sprite';
import styles from './FaceAvatar.module.css';

/** Linhas do desenho do avatar que entram no retrato (cabeça e ombros). */
const FACE_ROWS = 15;

function PixelFace({
  appearance,
  size,
}: {
  appearance: Appearance;
  size: number;
}) {
  const rects = buildSprite(appearance, 'down', 0);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${SPRITE_W} ${FACE_ROWS}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={styles.svg}
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

/**
 * Retrato redondo do avatar:
 * - Quando o usuário tem foto personalizada, exibe a foto e gira em 3D no hover
 *   para revelar também o personagem em pixel art.
 * - Sem foto, exibe diretamente o retrato em pixel art.
 */
export function FaceAvatar({
  appearance,
  size = 36,
}: {
  appearance: Appearance;
  size?: number;
}) {
  const photo = appearance.photo ?? null;

  if (!photo) {
    return <PixelFace appearance={appearance} size={size} />;
  }

  return (
    <div
      className={styles.flipWrap}
      style={{ width: size, height: size }}
      title="Passe o mouse para ver o personagem"
    >
      <div className={styles.flipper}>
        <div className={styles.face}>
          <img src={photo} alt="" className={styles.photo} />
        </div>
        <div className={`${styles.face} ${styles.back}`}>
          <PixelFace appearance={appearance} size={size} />
        </div>
      </div>
    </div>
  );
}
