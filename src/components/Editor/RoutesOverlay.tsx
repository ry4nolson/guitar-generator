import { useDesignStore } from '../../state/store';
import { useNeckGeometry } from '../../hooks/useNeckGeometry';
import { fanTrebleX } from '../../geometry/frets';
import { neckToBodySpace } from '../../geometry/neckPlacement';
import { PICKUP_DIMENSIONS, PICKUP_SLOTS } from '../../geometry/pickups';
import type { PickupType } from '../../geometry/pickups';

const ROUTE_MARGIN_MM = 3;

/**
 * Neck pocket + pickup routes + control (pot/selector) routes (layer:
 * "routes"). Route rectangles derive from the real pickup footprints plus a
 * routing margin.
 */
export function RoutesOverlay() {
  const hardware = useDesignStore((s) => s.hardware);
  const pickupSettings = useDesignStore((s) => s.pickupSettings);
  const controlSettings = useDesignStore((s) => s.controlSettings);
  const { neckParams, joinPoint } = useNeckGeometry();

  // Pocket edges follow the fret fan so they stay parallel to the (angled)
  // heel end of the fretboard on multiscale necks. The pocket runs from the
  // body's front edge (pocket mouth = heel − neckInset) to just past the heel.
  const pocketDepth = Math.max(30, neckParams.neckInset ?? 0);
  const pocketPts = [
    { x: neckParams.neckLength - pocketDepth, y: neckParams.heelWidth / 2 + 3 },
    { x: neckParams.neckLength + 6, y: neckParams.heelWidth / 2 + 3 },
    { x: fanTrebleX(neckParams, neckParams.neckLength + 6), y: -neckParams.heelWidth / 2 - 3 },
    { x: fanTrebleX(neckParams, neckParams.neckLength - pocketDepth), y: -neckParams.heelWidth / 2 - 3 },
  ].map((p) => neckToBodySpace(p, neckParams, { joinPoint }));
  const pocketD = `M ${pocketPts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ')} Z`;

  return (
    <g id="routes" stroke="#ffb400" strokeWidth={0.8} strokeDasharray="3 2" fill="none">
      <path d={pocketD} />
      {hardware.pickups.map((p, i) => {
        const type = pickupSettings[PICKUP_SLOTS[i]];
        if (type === 'none' || !p.visible) return null;
        const dims = PICKUP_DIMENSIONS[type as PickupType];
        const w = dims.along + ROUTE_MARGIN_MM * 2;
        const h = dims.across + ROUTE_MARGIN_MM * 2;
        return (
          <rect
            key={i}
            x={p.x - w / 2}
            y={p.y - h / 2}
            width={w}
            height={h}
            rx={dims.radius + 2}
            transform={p.rotation ? `rotate(${p.rotation}, ${p.x}, ${p.y})` : undefined}
          />
        );
      })}
      {hardware.controls.map(
        (c, i) => c.visible && <circle key={`c${i}`} cx={c.x} cy={c.y} r={13} />,
      )}
      {controlSettings.selector !== 'none' && hardware.selector.visible && (
        <rect
          x={hardware.selector.x - 9}
          y={hardware.selector.y - 28}
          width={18}
          height={56}
          rx={6}
          transform={`rotate(${hardware.selector.rotation}, ${hardware.selector.x}, ${hardware.selector.y})`}
        />
      )}
    </g>
  );
}
