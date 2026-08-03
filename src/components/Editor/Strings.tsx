import { useMemo } from 'react';
import { useDesignStore } from '../../state/store';
import { useNeckGeometry } from '../../hooks/useNeckGeometry';
import {
  computeBridgeStringPoints,
  computeNutStringPoints,
  computeStringSegments,
  STRING_STROKE_COLOR,
  stringStrokeWidths,
} from '../../geometry/strings';

/** Strings from nut slots to bridge saddles. Gated by the "strings" layer. */
export function Strings() {
  const nutSettings = useDesignStore((s) => s.nutSettings);
  const stringCount = useDesignStore((s) => s.bridgeSettings.stringCount ?? 6);
  const saddles = useDesignStore((s) => s.hardware.saddles);
  const { neckParams, joinPoint } = useNeckGeometry();

  const segments = useMemo(() => {
    const nutPts = computeNutStringPoints(neckParams, nutSettings, { joinPoint }, stringCount);
    const bridgePts = computeBridgeStringPoints(saddles);
    return computeStringSegments(nutPts, bridgePts);
  }, [neckParams, nutSettings, joinPoint, saddles, stringCount]);

  const gauges = useMemo(() => stringStrokeWidths(stringCount), [stringCount]);

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
          strokeWidth={gauges[s.index] ?? 1}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}
