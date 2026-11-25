import { useEffect, useId, useState } from 'react';

import {
  CHAIR_COLORS,
  DESK_COLORS,
  DESK_DECOR_TAG,
  DESK_HEIGHT,
  DESK_ITEMS,
  DESK_ITEM_LABELS,
  DESK_ITEM_LIMIT,
  DESK_ITEM_TAGS,
  DESK_LABEL_MAX_LENGTH,
  DESK_MACHINES,
  DESK_MACHINE_LABELS,
  DESK_MONITORS,
  DESK_MONITOR_LABELS,
  DESK_WIDTH,
  RUG_COLORS,
  RUG_PATTERNS,
  RUG_PATTERN_LABELS,
  resolveDeskSetup,
  type DeskComputer,
  type DeskConfig,
  type DeskDef,
  type DeskItem,
  type DeskMachine,
  type DeskMonitor,
} from '@/shared/domain';
import { Button } from '@/shared/ui/Button';

import { DeskArt } from './DeskArt';
import styles from './DeskEditor.module.css';

const PREVIEW_SCALE = 2;
const PREVIEW_PADDING = 24;

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

/** Mapeia máquina + monitor para o campo legado `computer` (mantém compatibilidade). */
const toLegacyComputer = (
  machine: DeskMachine,
  monitor: DeskMonitor,
): DeskComputer => {
  if (machine === 'laptop') {
    return monitor === 'none' ? 'laptop' : 'laptopMonitor';
  }
  if (monitor === 'dual') return 'dualMonitor';
  if (monitor === 'ultrawide') return 'ultrawide';
  if (monitor === 'triple') return 'tripleMonitor';
  return 'desktop';
};

/** Escolha da decoração da mesinha, em layout horizontal com prévia em pixel art. */
export function DeskEditor({ initial, onSave, onClose }: Props) {
  const titleId = useId();
  const labelInputId = useId();
  const initialSetup = resolveDeskSetup(initial);
  const [draft, setDraft] = useState<DeskConfig>({
    ...initial,
    chair: initial.chair ?? 0,
    rugPattern: initial.rugPattern ?? 'bordered',
    machine: initialSetup.machine,
    monitor: initialSetup.monitor,
  });

  const [itemFilter, setItemFilter] = useState<string>(DESK_DECOR_TAG);
  const setup = resolveDeskSetup(draft);

  const ITEM_FILTER_TABS: Array<{ tag: string; label: string }> = [
    { tag: DESK_DECOR_TAG, label: 'Todos (24)' },
    { tag: 'core-14', label: 'Clássicos' },
    { tag: 'extra', label: 'Novos (+10)' },
    { tag: 'geek', label: 'Geek' },
    { tag: 'nature', label: 'Plantas' },
    { tag: 'food-drink', label: 'Café & Chá' },
  ];

  const visibleItems = DESK_ITEMS.filter((item) =>
    DESK_ITEM_TAGS[item]?.includes(itemFilter),
  );

  const selectMachine = (machine: DeskMachine) => {
    const nextMonitor: DeskMonitor =
      machine === 'desktop' && setup.monitor === 'none'
        ? 'single'
        : setup.monitor;
    setDraft((current) => ({
      ...current,
      machine,
      monitor: nextMonitor,
      computer: toLegacyComputer(machine, nextMonitor),
    }));
  };

  const selectMonitor = (monitor: DeskMonitor) => {
    setDraft((current) => ({
      ...current,
      machine: setup.machine,
      monitor,
      computer: toLegacyComputer(setup.machine, monitor),
    }));
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

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

  const randomize = () => {
    const pick = <T,>(list: readonly T[]): T =>
      list[Math.floor(Math.random() * list.length)]!;
    const shuffled = [...DESK_ITEMS].sort(() => Math.random() - 0.5);
    const count = 2 + Math.floor(Math.random() * (DESK_ITEM_LIMIT - 1));
    const machine = pick(DESK_MACHINES);
    const monitorChoices =
      machine === 'desktop'
        ? DESK_MONITORS.filter((m) => m !== 'none')
        : DESK_MONITORS;
    const monitor = pick(monitorChoices);
    setDraft((current) => ({
      ...current,
      color: Math.floor(Math.random() * DESK_COLORS.length),
      chair: Math.floor(Math.random() * CHAIR_COLORS.length),
      rug:
        Math.random() < 0.15
          ? null
          : Math.floor(Math.random() * RUG_COLORS.length),
      rugPattern: pick(RUG_PATTERNS),
      machine,
      monitor,
      computer: toLegacyComputer(machine, monitor),
      items: shuffled.slice(0, count),
    }));
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-scroll-lock="true"
    >
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            Personalizar sua mesa
          </h2>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.randomBtn}
              onClick={randomize}
            >
              🎲 Aleatório
            </button>
            <button
              type="button"
              aria-label="Fechar"
              className={styles.closeBtn}
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.previewCol}>
            <div className={styles.previewBox}>
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
            </div>

            <div className={styles.group}>
              <label htmlFor={labelInputId} className={styles.label}>
                Plaquinha (aparece no balão da mesa)
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
          </div>

          <div className={styles.optionsCol}>
            <Swatches
              label="Cor da mesa"
              colors={DESK_COLORS}
              selected={draft.color}
              onSelect={(color) => setDraft({ ...draft, color: color ?? 0 })}
            />
            <Swatches
              label="Cor da cadeira"
              colors={CHAIR_COLORS}
              selected={draft.chair ?? 0}
              onSelect={(chair) => setDraft({ ...draft, chair: chair ?? 0 })}
            />
            <Swatches
              label="Tapete"
              colors={RUG_COLORS}
              selected={draft.rug}
              allowNone
              onSelect={(rug) => setDraft({ ...draft, rug })}
            />

            {draft.rug !== null ? (
              <div className={styles.group}>
                <span className={styles.label}>Estilo do tapete</span>
                <div className={styles.row}>
                  {RUG_PATTERNS.map((pattern) => (
                    <button
                      key={pattern}
                      type="button"
                      aria-pressed={draft.rugPattern === pattern}
                      onClick={() =>
                        setDraft({ ...draft, rugPattern: pattern })
                      }
                      className={`${styles.chip} ${draft.rugPattern === pattern ? styles.active : ''}`}
                    >
                      {RUG_PATTERN_LABELS[pattern]}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className={styles.group}>
              <span className={styles.label}>Computador</span>
              <div className={styles.row}>
                {DESK_MACHINES.map((machine) => (
                  <button
                    key={machine}
                    type="button"
                    aria-pressed={setup.machine === machine}
                    onClick={() => selectMachine(machine)}
                    className={`${styles.chip} ${setup.machine === machine ? styles.active : ''}`}
                  >
                    {DESK_MACHINE_LABELS[machine]}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.group}>
              <span className={styles.label}>Monitor(es)</span>
              <div className={styles.row}>
                {DESK_MONITORS.filter(
                  (m) => setup.machine === 'laptop' || m !== 'none',
                ).map((monitor) => (
                  <button
                    key={monitor}
                    type="button"
                    aria-pressed={setup.monitor === monitor}
                    onClick={() => selectMonitor(monitor)}
                    className={`${styles.chip} ${setup.monitor === monitor ? styles.active : ''}`}
                  >
                    {DESK_MONITOR_LABELS[monitor]}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.group}>
              <span className={styles.label}>
                Enfeites ({draft.items.length} de {DESK_ITEM_LIMIT})
              </span>
              <div className={styles.row} style={{ marginBottom: 6 }}>
                {ITEM_FILTER_TABS.map((tab) => (
                  <button
                    key={tab.tag}
                    type="button"
                    aria-pressed={itemFilter === tab.tag}
                    onClick={() => setItemFilter(tab.tag)}
                    className={`${styles.chip} ${itemFilter === tab.tag ? styles.active : ''}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className={styles.row}>
                {visibleItems.map((item) => {
                  const on = draft.items.includes(item);
                  const full = !on && draft.items.length >= DESK_ITEM_LIMIT;
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={full}
                      aria-pressed={on}
                      data-tag={DESK_DECOR_TAG}
                      onClick={() => toggleItem(item)}
                      className={`${styles.chip} ${on ? styles.active : ''}`}
                    >
                      {DESK_ITEM_LABELS[item]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancelar
          </button>
          <Button title="Salvar" onClick={() => onSave(draft)} />
        </div>
      </div>
    </div>
  );
}
