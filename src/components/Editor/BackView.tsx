import { useMemo } from 'react';
import { useDesignStore } from '../../state/store';
import { saddleClusterCenter } from '../../geometry/strings';
import { fitControlCavity } from '../../geometry/controlCavity';
import { BodyOutline } from './BodyOutline';
import { NeckOutline } from './NeckAndFrets';
import { NeckBolts, ControlsGhost } from './Hardware';
import { LayerGroup } from './LayerGroup';
import { ReferenceOverlayHitTargets } from './ReferenceImageOverlay';

/**
 * Back view reuses the same body + neck paths as the top view (no separate
 * silhouette). The stage applies scale(-1,1) so bass↔treble flip like turning
 * the guitar over. Fills are translucent so the heel/pocket read through;
 * neck bolts/ferrules stay opaque and draggable on top. Front controls render
 * as ghosts so the oriented control cavity can be lined up with them.
 */
export function BackView({ stageRef }: { stageRef: React.RefObject<SVGGElement | null> }) {
  const saddles = useDesignStore((s) => s.hardware.saddles);
  const controls = useDesignStore((s) => s.hardware.controls);
  const selector = useDesignStore((s) => s.hardware.selector);
  const controlSettings = useDesignStore((s) => s.controlSettings);

  const bridgeCenter = useMemo(() => saddleClusterCenter(saddles), [saddles]);

  const cavity = useMemo(() => {
    const pts = controls.filter((c) => c.visible).map((c) => ({ x: c.x, y: c.y }));
    // Blade switches share the treble-side cavity; LP toggles live elsewhere.
    const blade =
      controlSettings.selector === 'blade-3' || controlSettings.selector === 'blade-5';
    if (blade && selector.visible) {
      pts.push({ x: selector.x, y: selector.y });
    }
    return fitControlCavity(pts, {
      pad: controlSettings.cavityPad ?? 14,
      rotationOffset: controlSettings.cavityRotationOffset ?? 0,
      hintAngleDeg: selector.rotation,
    });
  }, [controls, selector, controlSettings]);

  return (
    <g id="back-view">
      <LayerGroup id="body">
        <BodyOutline variant="back" />
      </LayerGroup>
      <LayerGroup id="neck">
        <NeckOutline variant="back" />
      </LayerGroup>
      <LayerGroup id="routes">
        <g id="routes">
          {cavity && (
            <rect
              x={-cavity.along / 2}
              y={-cavity.across / 2}
              width={cavity.along}
              height={cavity.across}
              rx={Math.min(10, cavity.across / 3)}
              fill="none"
              stroke="var(--outline-stroke)"
              strokeDasharray="4 3"
              strokeWidth={0.8}
              transform={`translate(${cavity.cx}, ${cavity.cy}) rotate(${cavity.rotation})`}
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
      <ReferenceOverlayHitTargets />
      {/* Ghost front controls — non-interactive, for cavity alignment. */}
      <LayerGroup id="hardware">
        <ControlsGhost />
        <NeckBolts stageRef={stageRef} />
      </LayerGroup>
    </g>
  );
}
