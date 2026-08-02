import { useDesignStore } from '../../state/store';
import { useNeckGeometry } from '../../hooks/useNeckGeometry';
import { neckToBodySpace } from '../../geometry/neckPlacement';

/** Nut / bridge / neutral-fret / scale-length reference lines (layer: "construction"). */
export function ReferenceLines() {
  const bridge = useDesignStore((s) => s.hardware.bridgeHumbucker);
  const { neckParams, joinPoint, placedFrets, bridgeX } = useNeckGeometry();

  const neutral = placedFrets.find((f) => f.fretNumber === neckParams.neutralFret)!;
  const nutB = neckToBodySpace({ x: 0, y: neckParams.nutWidth / 2 }, neckParams, { joinPoint });
  const nutT = neckToBodySpace({ x: 0, y: -neckParams.nutWidth / 2 }, neckParams, { joinPoint });
  const bassScaleEnd = neckToBodySpace({ x: bridgeX.bassBridgeX, y: neckParams.nutWidth / 2 }, neckParams, {
    joinPoint,
  });
  const trebleScaleEnd = neckToBodySpace({ x: bridgeX.trebleBridgeX, y: -neckParams.nutWidth / 2 }, neckParams, {
    joinPoint,
  });

  return (
    <g id="construction" stroke="#39a0ff" strokeWidth={0.6} fill="none">
      <line x1={nutB.x} y1={nutB.y} x2={nutT.x} y2={nutT.y} stroke="#2ecc71" strokeWidth={1} />
      <line
        x1={neutral.bass.x}
        y1={neutral.bass.y}
        x2={neutral.treble.x}
        y2={neutral.treble.y}
        stroke="#ff8844"
        strokeWidth={1}
      />
      <line x1={nutB.x} y1={nutB.y} x2={bassScaleEnd.x} y2={bassScaleEnd.y} stroke="#2ecc71" strokeWidth={0.4} />
      <line x1={nutT.x} y1={nutT.y} x2={trebleScaleEnd.x} y2={trebleScaleEnd.y} stroke="#2ecc71" strokeWidth={0.4} />
      <line x1={bridge.x} y1={bridge.y - 20} x2={bridge.x} y2={bridge.y + 20} stroke="#e74c3c" strokeWidth={1} />
    </g>
  );
}
