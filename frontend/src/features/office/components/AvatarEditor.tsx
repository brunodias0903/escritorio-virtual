import { useEffect, useId, useState } from 'react';

import {
  HAIR_COLORS,
  HAIR_STYLE_COUNT,
  SHIRT_COLORS,
  SKIN_TONES,
  type Appearance,
} from '@/shared/domain';
import { Button } from '@/shared/ui/Button';

import { buildSprite, SPRITE_H, SPRITE_W } from '../model/sprite';
import styles from './AvatarEditor.module.css';

const STYLE_NAMES = ['Curto', 'Longo', 'Topete', 'Careca'];
const PREVIEW_SCALE = 6;

type Props = {
  initial: Appearance;
  onSave: (appearance: Appearance) => void;
  onClose: () => void;
};

function Swatches({
  label,
  colors,
  selected,
  onSelect,
}: {
  label: string;
  colors: readonly string[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className={styles.group}>
      <span className={styles.label}>{label}</span>
      <div className={styles.row}>
        {colors.map((color, index) => (
          <button
            key={color}
            type="button"
            aria-label={`${label} ${index + 1}`}
            aria-pressed={index === selected}
            onClick={() => onSelect(index)}
            className={`${styles.swatch} ${index === selected ? styles.active : ''}`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}

/** Escolha de aparência com prévia em pixel art. */
export function AvatarEditor({ initial, onSave, onClose }: Props) {
  const titleId = useId();
  const [draft, setDraft] = useState(initial);
  const rects = buildSprite(draft, 'down', 0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className={styles.card}>
        <h2 id={titleId} className={styles.title}>
          Seu avatar
        </h2>

        <svg
          width={SPRITE_W * PREVIEW_SCALE}
          height={(SPRITE_H + 1) * PREVIEW_SCALE}
          shapeRendering="crispEdges"
          aria-hidden="true"
          style={{ display: 'block' }}
        >
          {rects.map((r, index) => (
            <rect
              key={index}
              x={r.x * PREVIEW_SCALE}
              y={(r.y + 1) * PREVIEW_SCALE}
              width={r.w * PREVIEW_SCALE}
              height={r.h * PREVIEW_SCALE}
              fill={r.fill}
            />
          ))}
        </svg>

        <Swatches
          label="Pele"
          colors={SKIN_TONES}
          selected={draft.skin}
          onSelect={(skin) => setDraft({ ...draft, skin })}
        />
        <Swatches
          label="Cabelo"
          colors={HAIR_COLORS}
          selected={draft.hair}
          onSelect={(hair) => setDraft({ ...draft, hair })}
        />
        <Swatches
          label="Camisa"
          colors={SHIRT_COLORS}
          selected={draft.shirt}
          onSelect={(shirt) => setDraft({ ...draft, shirt })}
        />

        <div className={styles.group}>
          <span className={styles.label}>Estilo do cabelo</span>
          <div className={styles.row}>
            {Array.from({ length: HAIR_STYLE_COUNT }, (_, style) => (
              <button
                key={style}
                type="button"
                aria-pressed={style === draft.style}
                onClick={() => setDraft({ ...draft, style })}
                className={`${styles.styleButton} ${style === draft.style ? styles.active : ''}`}
              >
                {STYLE_NAMES[style]}
              </button>
            ))}
          </div>
        </div>

        <Button title="Salvar" onClick={() => onSave(draft)} />
        <Button title="Cancelar" variant="link" onClick={onClose} />
      </div>
    </div>
  );
}
