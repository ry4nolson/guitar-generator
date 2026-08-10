import { memo } from 'react';
import { useNeckGeometry } from '../../hooks/useNeckGeometry';
import { useDesignStore, DEFAULT_NECK_OPACITY } from '../../state/store';

/** Headless or headed neck outline (layer: "neck"). */
export const NeckOutline = memo(function NeckOutline({ variant = 'top' }: { variant?: 'top' | 'back' }) {
  const { outlinePoints } = useNeckGeometry();
  const neckOpacity = useDesignStore((s) => s.settings.neckOpacity ?? DEFAULT_NECK_OPACITY);
  const d = `M ${outlinePoints.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ')} Z`;
  // Back view: translucent heel so the body pocket edge reads through while
  // aligning movable neck bolts.
  let fillOpacity = neckOpacity;
  if (variant === 'back') fillOpacity = Math.min(0.42, fillOpacity);
  return (
    <g id="neck">
      <path
        d={d}
        fill="var(--neck-fill)"
        fillOpacity={fillOpacity}
        stroke="var(--outline-stroke)"
        strokeWidth={1}
      />
    </g>
  );
});

/** True fanned frets + dot inlays (layer: "frets"), placed into body-local space via neckAngle/join point. */
export const FretLines = memo(function FretLines() {
  const { placedFrets, placedInlays, neckParams } = useNeckGeometry();
  return (
    <g id="frets">
      {placedInlays.map((d, i) => (
        <circle
          key={`inlay-${d.fret}-${i}`}
          cx={d.center.x}
          cy={d.center.y}
          r={d.radius}
          fill="#e8e0ca"
          stroke="#00000033"
          strokeWidth={0.4}
        />
      ))}
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
