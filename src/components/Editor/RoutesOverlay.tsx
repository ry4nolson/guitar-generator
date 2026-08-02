import { useDesignStore } from '../../state/store';
import { useNeckGeometry } from '../../hooks/useNeckGeometry';
import { neckToBodySpace } from '../../geometry/neckPlacement';

/**
 * Neck pocket + pickup route + control (volume pot) route (layer: "routes").
 * These are placeholder rectangles/ellipses sized off the neck/hardware
 * params — see README "Known limitations" for the plan to derive them from
 * real hardware footprints instead.
 */
export function RoutesOverlay() {
  const bridge = useDesignStore((s) => s.hardware.bridgeHumbucker);
  const volume = useDesignStore((s) => s.hardware.volumeKnob);
  const { neckParams, joinPoint } = useNeckGeometry();

  const pocketPts = [
    { x: neckParams.neckLength - 30, y: neckParams.heelWidth / 2 + 3 },
    { x: neckParams.neckLength + 6, y: neckParams.heelWidth / 2 + 3 },
    { x: neckParams.neckLength + 6, y: -neckParams.heelWidth / 2 - 3 },
    { x: neckParams.neckLength - 30, y: -neckParams.heelWidth / 2 - 3 },
  ].map((p) => neckToBodySpace(p, neckParams, { joinPoint }));
  const pocketD = `M ${pocketPts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ')} Z`;

  return (
    <g id="routes" stroke="#ffb400" strokeWidth={0.8} strokeDasharray="3 2" fill="none">
      <path d={pocketD} />
      <rect x={bridge.x - 22} y={bridge.y - 15} width={44} height={30} rx={5} />
      <circle cx={volume.x} cy={volume.y} r={13} />
    </g>
  );
}
