import { useEffect, useState, type TouchEvent } from 'react';

import { pinchZoom, touchDistance, wheelZoom } from '../model/camera';

const distanceOf = (touches: TouchEvent['touches']): number =>
  touchDistance(
    { x: touches[0]!.pageX, y: touches[0]!.pageY },
    { x: touches[1]!.pageX, y: touches[1]!.pageY },
  );

/**
 * Zoom com a roda do mouse e com o gesto de pinça.
 * Anexe `element` à área do mapa e espalhe `touch` nele; `onZoom` recebe o novo zoom.
 */
export function useZoomGestures(
  element: HTMLElement | null,
  zoom: number,
  onZoom: (zoom: number) => void,
): {
  onTouchStart: (event: TouchEvent<HTMLElement>) => void;
  onTouchMove: (event: TouchEvent<HTMLElement>) => void;
  onTouchEnd: () => void;
  onTouchCancel: () => void;
} {
  const [pinch, setPinch] = useState<{
    zoom: number;
    distance: number;
  } | null>(null);

  useEffect(() => {
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      onZoom(wheelZoom(zoom, event.deltaY));
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [element, zoom, onZoom]);

  const onTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (event.touches.length === 2) {
      setPinch({ zoom, distance: distanceOf(event.touches) });
    }
  };

  const onTouchMove = (event: TouchEvent<HTMLElement>) => {
    if (event.touches.length !== 2) return;
    if (!pinch) {
      setPinch({ zoom, distance: distanceOf(event.touches) });
      return;
    }
    onZoom(pinchZoom(pinch.zoom, pinch.distance, distanceOf(event.touches)));
  };

  const end = () => setPinch(null);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd: end,
    onTouchCancel: end,
  };
}
