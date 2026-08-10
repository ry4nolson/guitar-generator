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
import { mapStringIndexToTunerIndex } from '../../geometry/headstock';

/** Strings from bridge saddles through nut slots to tuner pegs (when headed). */
export function Strings() {
  const nutSettings = useDesignStore((s) => s.nutSettings);
  const stringCount = useDesignStore((s) => s.bridgeSettings.stringCount ?? 6);
  const saddles = useDesignStore((s) => s.hardware.saddles);
  const headstock = useDesignStore((s) => s.headstockSettings);
  const { neckParams, joinPoint, tunerPoints } = useNeckGeometry();

  const segments = useMemo(() => {
    const nutPts = computeNutStringPoints(neckParams, nutSettings, { joinPoint }, stringCount);
    const bridgePts = computeBridgeStringPoints(saddles);
    const headed =
      headstock.type !== 'headless' &&
      headstock.showTuners &&
      headstock.tunerLayout !== 'none' &&
      headstock.tunerLayout !== 'headless' &&
      tunerPoints.length > 0;
    const tunerPts = headed
      ? Array.from({ length: stringCount }, (_, i) => {
          const ti = mapStringIndexToTunerIndex(i, stringCount, headstock.tunerLayout);
          return tunerPoints[ti] ?? null;
        })
      : null;
    return computeStringSegments(nutPts, bridgePts, tunerPts);
  }, [neckParams, nutSettings, joinPoint, saddles, stringCount, headstock, tunerPoints]);

  const gauges = useMemo(() => stringStrokeWidths(stringCount), [stringCount]);

  return (
    <g id="strings" style={{ pointerEvents: 'none' }}>
      {segments.map((s) => {
        const w = gauges[s.index] ?? 1;
        return (
          <g key={s.index}>
            <line
              x1={s.bridge.x}
              y1={s.bridge.y}
              x2={s.nut.x}
              y2={s.nut.y}
              stroke={STRING_STROKE_COLOR}
              strokeWidth={w}
              strokeLinecap="round"
            />
            {s.tuner && (
              <line
                x1={s.nut.x}
                y1={s.nut.y}
                x2={s.tuner.x}
                y2={s.tuner.y}
                stroke={STRING_STROKE_COLOR}
                strokeWidth={w}
                strokeLinecap="round"
              />
            )}
          </g>
        );
      })}
    </g>
  );
}
