import { useMemo } from 'react';
import { useDesignStore } from '../../state/store';
import { useNeckGeometry } from '../../hooks/useNeckGeometry';
import { computeHeadstockOutlineBody, computeTunerPositions } from '../../geometry/headstock';

/** Headstock silhouette past the nut (hidden when style is headless). */
export function HeadstockOutline() {
  const headstock = useDesignStore((s) => s.headstockSettings);
  const { neckParams, joinPoint } = useNeckGeometry();

  const points = useMemo(
    () => computeHeadstockOutlineBody(neckParams, headstock, { joinPoint }),
    [neckParams, headstock, joinPoint],
  );

  if (points.length < 3) return null;
  const d = `M ${points.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ')} Z`;
  return (
    <g id="headstock">
      <path d={d} fill="var(--neck-fill)" stroke="var(--outline-stroke)" strokeWidth={1} />
    </g>
  );
}

/** Tuner posts on the headstock (or bridge-end for headless). */
export function Tuners() {
  const headstock = useDesignStore((s) => s.headstockSettings);
  const saddles = useDesignStore((s) => s.hardware.saddles);
  const { neckParams, joinPoint } = useNeckGeometry();

  const tuners = useMemo(
    () => computeTunerPositions(neckParams, headstock, { joinPoint }, saddles),
    [neckParams, headstock, joinPoint, saddles],
  );

  if (tuners.length === 0) return null;

  return (
    <g id="tuners" style={{ pointerEvents: 'none' }}>
      {tuners.map((t) => (
        <g key={t.index} transform={`translate(${t.position.x}, ${t.position.y})`}>
          <circle r={t.radius} fill="#c8c8c8" stroke="#222" strokeWidth={0.6} />
          <circle r={t.radius * 0.35} fill="#333" />
          {headstock.tunerLayout !== 'headless' && (
            <rect
              x={t.radius * 0.9}
              y={-1.2}
              width={t.radius * 1.6}
              height={2.4}
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
