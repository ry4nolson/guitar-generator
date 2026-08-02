import { useMemo } from 'react';
import { useDesignStore } from '../../state/store';
import { useNeckGeometry } from '../../hooks/useNeckGeometry';
import {
  computeBridgeStringPoints,
  computeNutStringPoints,
  computeStringSegments,
} from '../../geometry/strings';

const STRING_GAUGE = [0.9, 0.75, 0.6, 0.5, 0.4, 0.35];

/** Six strings from nut slots to bridge saddles. Gated by the "strings" layer. */
export function Strings() {
  const nutSettings = useDesignStore((s) => s.nutSettings);
  const saddles = useDesignStore((s) => s.hardware.saddles);
  const { neckParams, joinPoint } = useNeckGeometry();

  const segments = useMemo(() => {
    const nutPts = computeNutStringPoints(neckParams, nutSettings, { joinPoint });
    const bridgePts = computeBridgeStringPoints(saddles);
    return computeStringSegments(nutPts, bridgePts);
  }, [neckParams, nutSettings, joinPoint, saddles]);

  return (
    <g id="strings" style={{ pointerEvents: 'none' }}>
      {segments.map((s) => (
        <line
          key={s.index}
          x1={s.nut.x}
          y1={s.nut.y}
          x2={s.bridge.x}
          y2={s.bridge.y}
          stroke="#c8c8c8"
          strokeWidth={STRING_GAUGE[s.index] ?? 0.45}
          strokeLinecap="round"
          opacity={0.85}
        />
      ))}
    </g>
  );
}
