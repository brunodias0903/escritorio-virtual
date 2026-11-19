import { useEffect, useState } from 'react';

export type ElementSize = { width: number; height: number };

/** Mede largura e altura reais de um elemento do DOM com ResizeObserver. */
export function useElementSize(
  element: HTMLElement | null,
  fallback: ElementSize,
): ElementSize {
  const [size, setSize] = useState<ElementSize>(fallback);

  useEffect(() => {
    if (!element) return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize((current) =>
          current.width === rect.width && current.height === rect.height
            ? current
            : { width: rect.width, height: rect.height },
        );
      }
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return size;
}
