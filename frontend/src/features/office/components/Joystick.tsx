import { useRef, useState, type PointerEvent } from 'react';

import type { Direction } from '@/shared/domain';

import styles from './Joystick.module.css';

const SIZE = 120;
const RADIUS = SIZE / 2;

type Props = { onChange: (direction: Direction) => void };

/** Controle de toque: arraste o botão para andar. */
export function Joystick({ onChange }: Props) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const origin = useRef<{ x: number; y: number; pointerId: number } | null>(
    null,
  );

  const reset = () => {
    origin.current = null;
    setKnob({ x: 0, y: 0 });
    onChange({ dx: 0, dy: 0 });
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    origin.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!origin.current || origin.current.pointerId !== event.pointerId) return;
    const dx = event.clientX - origin.current.x;
    const dy = event.clientY - origin.current.y;
    const length = Math.hypot(dx, dy);
    const scale = length > RADIUS ? RADIUS / length : 1;
    const x = dx * scale;
    const y = dy * scale;
    setKnob({ x, y });
    onChange({ dx: x / RADIUS, dy: y / RADIUS });
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (origin.current?.pointerId === event.pointerId) reset();
  };

  return (
    <div
      className={styles.base}
      role="application"
      aria-label="Controle direcional"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <div
        className={styles.knob}
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  );
}
