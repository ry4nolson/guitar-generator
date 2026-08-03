import { useMemo } from 'react';
import { useDesignStore } from '../../state/store';
import { useNeckGeometry } from '../../hooks/useNeckGeometry';
import {
  computeTunerPositions,
  headstockAnchorsToBody,
  headstockAnchorsToPathD,
} from '../../geometry/headstock';

/** Headstock silhouette past the nut (hidden when style is headless). */
export function HeadstockOutline() {
  const headstock = useDesignStore((s) => s.headstockSettings);
  const anchors = useDesignStore((s) => s.headstockAnchors);
  const { neckParams, joinPoint } = useNeckGeometry();

  const bodyAnchors = useMemo(
    () => headstockAnchorsToBody(anchors, neckParams, { joinPoint }),
    [anchors, neckParams, joinPoint],
  );

  if (headstock.type === 'headless' || bodyAnchors.length < 3) return null;
  const d = headstockAnchorsToPathD(bodyAnchors);
  return (
    <g id="headstock">
      <path d={d} fill="var(--neck-fill)" stroke="var(--outline-stroke)" strokeWidth={1} />
    </g>
  );
}

/** Tuner posts on the headstock (or bridge-end for headless). */
export function Tuners() {
  const headstock = useDesignStore((s) => s.headstockSettings);
  const anchors = useDesignStore((s) => s.headstockAnchors);
  const saddles = useDesignStore((s) => s.hardware.saddles);
  const stringCount = useDesignStore((s) => s.bridgeSettings.stringCount ?? 6);
  const { neckParams, joinPoint } = useNeckGeometry();

  const tuners = useMemo(
    () => computeTunerPositions(neckParams, headstock, { joinPoint }, saddles, stringCount, anchors),
    [neckParams, headstock, joinPoint, saddles, stringCount, anchors],
  );

  if (tuners.length === 0) return null;

  return (
    <g id="tuners" style={{ pointerEvents: 'none' }}>
      {tuners.map((t) => (
        <g key={t.index} transform={`translate(${t.position.x}, ${t.position.y}) rotate(${t.pegAngleDeg})`}>
          <circle r={t.radius} fill="#c8c8c8" stroke="#222" strokeWidth={0.6} />
          <circle r={t.radius * 0.35} fill="#333" />
          {headstock.tunerLayout !== 'headless' && (
            <rect
              x={t.radius * 0.85}
              y={-1.15}
              width={t.radius * 1.7}
              height={2.3}
              rx={0.6}
              fill="#b0b0b0"
              stroke="#222"
              strokeWidth={0.4}
            />
          )}
        </g>
      ))}
    </g>
  );
}
