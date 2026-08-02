import { useDesignStore } from '../../state/store';
import { BodyOutline } from './BodyOutline';
import { NeckBolts } from './Hardware';
import { LayerGroup } from './LayerGroup';

/**
 * Back view reuses the exact same body outline path as the top view (no
 * separate silhouette is ever generated) and overlays back-specific hardware:
 * neck bolts/ferrules, an optional control cavity, and optional bridge access
 * — no string-through holes anywhere.
 */
export function BackView({ stageRef }: { stageRef: React.RefObject<SVGGElement | null> }) {
  const bridge = useDesignStore((s) => s.hardware.bridgeHumbucker);
  const volume = useDesignStore((s) => s.hardware.volumeKnob);

  return (
    <g id="back-view">
      <LayerGroup id="body">
        <BodyOutline variant="back" />
      </LayerGroup>
      <LayerGroup id="routes">
        <g id="routes">
          <rect
            x={volume.x - 22}
            y={volume.y - 22}
            width={44}
            height={44}
            rx={8}
            fill="none"
            stroke="var(--outline-stroke)"
            strokeDasharray="4 3"
            strokeWidth={0.8}
          />
          <ellipse
            cx={bridge.x}
            cy={bridge.y}
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
