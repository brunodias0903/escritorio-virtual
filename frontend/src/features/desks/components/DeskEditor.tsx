import { useEffect, useId, useState } from 'react';

import {
  DESK_COLORS,
  DESK_COMPUTERS,
  DESK_COMPUTER_LABELS,
  DESK_HEIGHT,
  DESK_ITEMS,
  DESK_ITEM_LABELS,
  DESK_ITEM_LIMIT,
  DESK_LABEL_MAX_LENGTH,
  DESK_WIDTH,
  RUG_COLORS,
  type DeskConfig,
  type DeskDef,
  type DeskItem,
} from '@/shared/domain';
import { Button } from '@/shared/ui/Button';

import { DeskArt } from './DeskArt';
import styles from './DeskEditor.module.css';

const PREVIEW_SCALE = 2;
const PREVIEW_PADDING = 28;

type Props = {
  initial: DeskConfig;
  onSave: (config: DeskConfig) => void;
  onClose: () => void;
};

function Swatches({
  label,
  colors,
  selected,
  allowNone,
  onSelect,
}: {
  label: string;
  colors: readonly string[];
  selected: number | null;
  allowNone?: boolean;
  onSelect: (index: number | null) => void;
}) {
  return (
    <div className={styles.group}>
      <span className={styles.label}>{label}</span>
      <div className={styles.row}>
        {allowNone ? (
          <button
            type="button"
            aria-label={`${label}: nenhum`}
            aria-pressed={selected === null}
            onClick={() => onSelect(null)}
            className={`${styles.swatch} ${styles.swatchNone} ${selected === null ? styles.active : ''}`}
          >
            ✕
          </button>
        ) : null}
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

/** Escolha da decoração da mesinha, com prévia em pixel art. */
export function DeskEditor({ initial, onSave, onClose }: Props) {
  const titleId = useId();
  const labelInputId = useId();
  const [draft, setDraft] = useState(initial);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // A prévia desenha a mesa na origem e recorta em volta dela.
  const desk: DeskDef = {
    id: 'previa',
    name: 'Prévia',
    x: 0,
    y: 0,
    w: DESK_WIDTH,
    h: DESK_HEIGHT,
  };
  const viewW = DESK_WIDTH + PREVIEW_PADDING * 2;
  const viewH = DESK_HEIGHT + 70;

  const toggleItem = (item: DeskItem) =>
    setDraft((current) => {
      const has = current.items.includes(item);
      if (has)
        return { ...current, items: current.items.filter((i) => i !== item) };
      if (current.items.length >= DESK_ITEM_LIMIT) return current;
      return { ...current, items: [...current.items, item] };
    });

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className={styles.scrollContent}>
        <div className={styles.card}>
          <h2 id={titleId} className={styles.title}>
            Sua mesa
          </h2>

          <svg
            width={viewW * PREVIEW_SCALE}
            height={viewH * PREVIEW_SCALE}
            viewBox={`${-PREVIEW_PADDING} -34 ${viewW} ${viewH}`}
            className={styles.preview}
            shapeRendering="crispEdges"
            aria-hidden="true"
          >
            <DeskArt desk={desk} config={draft} freeHint={false} />
          </svg>

          <div className={styles.group}>
            <label htmlFor={labelInputId} className={styles.label}>
              Plaquinha (aparece acima da mesa)
            </label>
            <input
              id={labelInputId}
              type="text"
              className={styles.input}
              value={draft.label}
              onChange={(event) =>
                setDraft({ ...draft, label: event.target.value })
              }
              maxLength={DESK_LABEL_MAX_LENGTH}
              placeholder="Ex.: Mesa do time de produto"
            />
          </div>

          <Swatches
            label="Cor da mesa"
            colors={DESK_COLORS}
            selected={draft.color}
            onSelect={(color) => setDraft({ ...draft, color: color ?? 0 })}
          />
          <Swatches
            label="Tapete"
            colors={RUG_COLORS}
            selected={draft.rug}
            allowNone
            onSelect={(rug) => setDraft({ ...draft, rug })}
          />

          <div className={styles.group}>
            <span className={styles.label}>Computador</span>
            <div className={styles.row}>
              {DESK_COMPUTERS.map((computer) => (
                <button
                  key={computer}
                  type="button"
                  aria-pressed={draft.computer === computer}
                  onClick={() => setDraft({ ...draft, computer })}
                  className={`${styles.chip} ${draft.computer === computer ? styles.active : ''}`}
                >
                  {DESK_COMPUTER_LABELS[computer]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.group}>
            <span className={styles.label}>
              Enfeites ({draft.items.length} de {DESK_ITEM_LIMIT})
            </span>
            <div className={styles.row}>
              {DESK_ITEMS.map((item) => {
                const on = draft.items.includes(item);
                const full = !on && draft.items.length >= DESK_ITEM_LIMIT;
                return (
                  <button
                    key={item}
                    type="button"
                    disabled={full}
                    aria-pressed={on}
                    onClick={() => toggleItem(item)}
                    className={`${styles.chip} ${on ? styles.active : ''}`}
                  >
                    {DESK_ITEM_LABELS[item]}
                  </button>
                );
              })}
            </div>
          </div>

          <Button title="Salvar" onClick={() => onSave(draft)} />
          <Button title="Cancelar" variant="link" onClick={onClose} />
        </div>
      </div>
    </div>
  );
}
