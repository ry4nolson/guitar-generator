import { useDesignStore } from '../../state/store';
import type { LayerId } from '../../state/layers';

/**
 * Gates a group of SVG content by its layer's visibility/lock state. Locked
 * layers render (dimmed) but ignore pointer events, so their contents can't
 * be dragged — this is the single place that enforces layer lock across
 * every view, rather than each interactive component re-checking it.
 */
export function LayerGroup({ id, children }: { id: LayerId; children: React.ReactNode }) {
  const layer = useDesignStore((s) => s.layers[id]);
  if (!layer?.visible) return null;
  return (
    <g style={{ pointerEvents: layer.locked ? 'none' : 'auto', opacity: layer.locked ? 0.55 : 1 }}>{children}</g>
  );
}
