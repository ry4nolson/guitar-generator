import { useMemo } from 'react';
import { useDesignStore } from '../../state/store';
import { useNeckGeometry } from '../../hooks/useNeckGeometry';
import {
  computeBridgeStringPoints,
  computeNutStringPoints,
  computeStringSegments,
  STRING_STROKE_COLOR,
  STRING_STROKE_MM,
} from '../../geometry/strings';

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
          stroke={STRING_STROKE_COLOR}
          strokeWidth={STRING_STROKE_MM[s.index] ?? 1}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}
