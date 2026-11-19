import { useEffect } from 'react';

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable);

/** As teclas + e − mudam o zoom. */
export function useZoomKeys(onZoomIn: () => void, onZoomOut: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target) || event.ctrlKey || event.metaKey) return;
      if (event.key === '+' || event.key === '=') onZoomIn();
      if (event.key === '-' || event.key === '_') onZoomOut();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onZoomIn, onZoomOut]);
}
