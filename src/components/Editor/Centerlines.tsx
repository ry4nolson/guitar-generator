import { useDesignStore } from '../../state/store';
import { useNeckGeometry } from '../../hooks/useNeckGeometry';
import { neckToBodySpace } from '../../geometry/neckPlacement';

/** Body + neck centerlines only (layer: "centerlines"). */
export function Centerlines() {
  const bodyLength = useDesignStore((s) => s.bodyParams.bodyLength);
  const { neckParams, joinPoint } = useNeckGeometry();
  const nutCenter = neckToBodySpace({ x: 0, y: 0 }, neckParams, { joinPoint });

  return (
    <g id="centerlines" stroke="#39a0ff" strokeWidth={0.6} fill="none">
      <line x1={0} y1={0} x2={bodyLength} y2={0} strokeDasharray="6 3" />
      <line x1={joinPoint.x} y1={joinPoint.y} x2={nutCenter.x} y2={nutCenter.y} stroke="#7d5cff" strokeDasharray="5 3" />
    </g>
  );
}
