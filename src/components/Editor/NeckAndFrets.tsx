import { memo } from 'react';
import { useNeckGeometry } from '../../hooks/useNeckGeometry';

/** Headless or headed neck outline (layer: "neck"). */
export const NeckOutline = memo(function NeckOutline() {
  const { outlinePoints } = useNeckGeometry();
  const d = `M ${outlinePoints.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ')} Z`;
  return (
    <g id="neck">
      <path d={d} fill="var(--neck-fill)" stroke="var(--outline-stroke)" strokeWidth={1} />
    </g>
  );
});

/** True fanned frets only (layer: "frets"), placed into body-local space via neckAngle/join point. */
export const FretLines = memo(function FretLines() {
  const { placedFrets, neckParams } = useNeckGeometry();
  return (
    <g id="frets">
      {placedFrets.map((f) => {
        const isNut = f.fretNumber === 0;
        const isNeutral = f.fretNumber === neckParams.neutralFret;
        return (
          <line
            key={f.fretNumber}
            x1={f.bass.x}
            y1={f.bass.y}
            x2={f.treble.x}
            y2={f.treble.y}
            stroke={isNut ? 'var(--outline-stroke)' : isNeutral ? '#ff8844' : '#888'}
            strokeWidth={isNut ? 1.4 : 0.5}
          />
        );
      })}
    </g>
  );
});
