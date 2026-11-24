import { useRef, useState, type PointerEvent } from 'react';

import type { Direction } from '@/shared/domain';

import styles from './Joystick.module.css';

const DEADZONE = 0.14;
/** Curso máximo da bolinha interna em fração do raio da base. */
const KNOB_TRAVEL_RATIO = 0.56;

type Props = { onChange: (direction: Direction) => void };

/** Controle analógico circular translúcido (arraste o polegar em 360° para andar). */
export function Joystick({ onChange }: Props) {
  const [dir, setDir] = useState<Direction>({ dx: 0, dy: 0 });
  const [engaged, setEngaged] = useState(false);
  const [baseRadius, setBaseRadius] = useState(56);
  const activePointer = useRef<number | null>(null);

  const updateFromEvent = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const radius = rect.width / 2;
    if (radius > 0 && radius !== baseRadius) setBaseRadius(radius);
    const cx = rect.left + radius;
    const cy = rect.top + radius;
    const rawX = (event.clientX - cx) / radius;
    const rawY = (event.clientY - cy) / radius;
    const len = Math.hypot(rawX, rawY);

    if (len < DEADZONE) {
      setDir({ dx: 0, dy: 0 });
      onChange({ dx: 0, dy: 0 });
      return;
    }

    const scale = len > 1 ? 1 / len : 1;
    const next = { dx: rawX * scale, dy: rawY * scale };
    setDir(next);
    onChange(next);
  };

  const reset = () => {
    activePointer.current = null;
    setEngaged(false);
    setDir({ dx: 0, dy: 0 });
    onChange({ dx: 0, dy: 0 });
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    setEngaged(true);
    updateFromEvent(event);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return;
    updateFromEvent(event);
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointer.current === event.pointerId) reset();
  };

  const maxOffset = baseRadius * KNOB_TRAVEL_RATIO;
  const knobX = dir.dx * maxOffset;
  const knobY = dir.dy * maxOffset;

  return (
    <div
      className={`${styles.base} ${engaged ? styles.baseActive : ''}`}
      role="application"
      aria-label="Controle direcional"
      data-scroll-lock="true"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className={styles.innerRing} aria-hidden="true" />
      <div
        className={`${styles.knob} ${engaged ? styles.knobActive : ''}`}
        style={{
          transform: `translate3d(${knobX}px, ${knobY}px, 0)`,
        }}
        aria-hidden="true"
      />
    </div>
  );
}
