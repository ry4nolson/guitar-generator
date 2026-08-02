// Grid snapping utility used by drag interactions in the editor.
import type { Point } from './types';

export function snapToGrid(p: Point, gridSize: number, enabled: boolean): Point {
  if (!enabled || gridSize <= 0) return p;
  return {
    x: Math.round(p.x / gridSize) * gridSize,
    y: Math.round(p.y / gridSize) * gridSize,
  };
}
