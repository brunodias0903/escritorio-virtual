import { useEffect, useRef, type RefObject } from 'react';

import type { Direction } from '@/shared/domain';

const AXIS: Record<string, { dx?: -1 | 1; dy?: -1 | 1 }> = {
  arrowleft: { dx: -1 },
  a: { dx: -1 },
  arrowright: { dx: 1 },
  d: { dx: 1 },
  arrowup: { dy: -1 },
  w: { dy: -1 },
  arrowdown: { dy: 1 },
  s: { dy: 1 },
};

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable);

/** Direção pedida pelo teclado (setas ou WASD). */
export function useKeyboardDirection(): RefObject<Direction> {
  const direction = useRef<Direction>({ dx: 0, dy: 0 });

  useEffect(() => {
    // Vale a última seta apertada, mesmo com outra ainda segura.
    let pressed: string[] = [];

    const update = () => {
      const last = pressed[pressed.length - 1];
      const axis = last ? AXIS[last] : undefined;
      direction.current = { dx: axis?.dx ?? 0, dy: axis?.dy ?? 0 };
    };
    const clear = () => {
      pressed = [];
      update();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      const key = event.key.toLowerCase();
      if (!(key in AXIS)) return;
      event.preventDefault();
      if (!pressed.includes(key)) pressed.push(key);
      update();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      pressed = pressed.filter((key) => key !== event.key.toLowerCase());
      update();
    };
    // Ao focar um campo de texto (chat) ou sair da aba, o avatar para de andar.
    const onFocusIn = (event: FocusEvent) => {
      if (!isTyping(event.target)) return;
      clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('focusin', onFocusIn);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('blur', clear);
    };
  }, []);

  return direction;
}
