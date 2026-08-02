import { useMemo } from 'react';
import { useDesignStore } from '../../state/store';
import { saddleClusterCenter } from '../../geometry/strings';
import { BodyOutline } from './BodyOutline';
import { NeckBolts } from './Hardware';
import { LayerGroup } from './LayerGroup';

/**
 * Back view reuses the exact same body outline path as the top view (no
 * separate silhouette is ever generated) and overlays back-specific hardware:
 * neck bolts/ferrules, a control cavity sized to the knob/selector cluster,
 * and bridge access — no string-through holes anywhere.
 */
export function BackView({ stageRef }: { stageRef: React.RefObject<SVGGElement | null> }) {
  const saddles = useDesignStore((s) => s.hardware.saddles);
  const controls = useDesignStore((s) => s.hardware.controls);
  const selector = useDesignStore((s) => s.hardware.selector);
  const selectorType = useDesignStore((s) => s.controlSettings.selector);

  const bridgeCenter = useMemo(() => saddleClusterCenter(saddles), [saddles]);

  // Control cavity: bounding box of the visible knobs (+ blade selector, which
  // shares the treble-side cavity on most builds), padded for pot bodies.
  const cavity = useMemo(() => {
    const pts = controls.filter((c) => c.visible).map((c) => ({ x: c.x, y: c.y }));
    if (selectorType !== 'none' && selectorType !== 'toggle' && selector.visible) {
      pts.push({ x: selector.x, y: selector.y });
    }
    if (pts.length === 0) return null;
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const pad = 20;
    return {
      x: Math.min(...xs) - pad,
      y: Math.min(...ys) - pad,
      width: Math.max(...xs) - Math.min(...xs) + pad * 2,
      height: Math.max(...ys) - Math.min(...ys) + pad * 2,
    };
  }, [controls, selector, selectorType]);

  return (
    <g id="back-view">
      <LayerGroup id="body">
        <BodyOutline variant="back" />
      </LayerGroup>
      <LayerGroup id="routes">
        <g id="routes">
          {cavity && (
            <rect
              {...cavity}
              rx={10}
              fill="none"
              stroke="var(--outline-stroke)"
              strokeDasharray="4 3"
              strokeWidth={0.8}
            />
          )}
          <ellipse
            cx={bridgeCenter.x}
            cy={bridgeCenter.y}
            rx={20}
            ry={12}
            fill="none"
            stroke="var(--outline-stroke)"
            strokeDasharray="4 3"
            strokeWidth={0.8}
          />
        </g>
      </LayerGroup>
      <LayerGroup id="hardware">
        <NeckBolts stageRef={stageRef} />
      </LayerGroup>
    </g>
  );
}
