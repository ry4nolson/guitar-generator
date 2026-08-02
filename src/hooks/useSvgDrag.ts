// Converts pointer drag gestures on an SVG element into body-local mm
// coordinates, using the element's screen CTM so it works regardless of
// zoom/pan/viewBox scaling.
import { useCallback, useRef } from 'react';
import type { Point } from '../geometry/types';

export function clientToLocalPoint(evt: PointerEvent | React.PointerEvent, referenceEl: SVGGraphicsElement): Point {
  const ctm = referenceEl.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const inverse = ctm.inverse();
  const svg = referenceEl.ownerSVGElement!;
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  const local = pt.matrixTransform(inverse);
  return { x: local.x, y: local.y };
}

/**
 * Returns a pointerDown handler that tracks a drag gesture and reports live
 * mm-space points via onMove, ending with onEnd. `groupRef` must point to the
 * SVG group whose local coordinate system matches body-local mm space.
 */
export function useSvgDrag(
  groupRef: React.RefObject<SVGGElement | null>,
  onMove: (p: Point) => void,
  onEnd?: () => void,
) {
  const dragging = useRef(false);

  const onPointerDown = useCallback(
    (evt: React.PointerEvent) => {
      const group = groupRef.current;
      if (!group) return;
      evt.stopPropagation();
      dragging.current = true;
      (evt.target as Element).setPointerCapture?.(evt.pointerId);

      const handleMove = (e: PointerEvent) => {
        if (!dragging.current) return;
        onMove(clientToLocalPoint(e, group));
      };
      const handleUp = () => {
        dragging.current = false;
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        onEnd?.();
      };
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [groupRef, onMove, onEnd],
  );

  return onPointerDown;
}
