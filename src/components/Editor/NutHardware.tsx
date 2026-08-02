import { useMemo } from 'react';
import { useDesignStore } from '../../state/store';
import { useNeckGeometry } from '../../hooks/useNeckGeometry';
import { neckToBodySpace } from '../../geometry/neckPlacement';
import { stringSlotOffsets } from '../../geometry/bridgeTypes';
import { fanLineX, trebleFanOffset } from '../../geometry/frets';

/** Nut block at the end of the fretboard — appearance depends on nutSettings.type. */
export function NutHardware() {
  const nutSettings = useDesignStore((s) => s.nutSettings);
  const { neckParams, joinPoint } = useNeckGeometry();

  const geometry = useMemo(() => {
    const halfW = neckParams.nutWidth / 2;
    const t = nutSettings.thickness;
    // The nut is a parallelogram sheared to the fret-0 (fan) angle: the
    // treble side sits trebleFanOffset further along than the bass side.
    const off = trebleFanOffset(neckParams);
    const corners = [
      { x: -t * 0.15, y: halfW },
      { x: t, y: halfW },
      { x: off + t, y: -halfW },
      { x: off - t * 0.15, y: -halfW },
    ].map((p) => neckToBodySpace(p, neckParams, { joinPoint }));
    const slots = stringSlotOffsets(nutSettings.stringSpacing, 6).map((y) =>
      neckToBodySpace({ x: fanLineX(neckParams, t * 0.45, y, halfW), y }, neckParams, { joinPoint }),
    );
    return { corners, slots };
  }, [neckParams, joinPoint, nutSettings]);

  const d = `M ${geometry.corners.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ')} Z`;
  const fill = nutSettings.type === 'locking' ? '#3a3a3a' : nutSettings.type === 'compensated' ? '#e8dcc8' : '#f0e6d2';

  return (
    <g id="nut" style={{ pointerEvents: 'none' }}>
      <path d={d} fill={fill} stroke="#333" strokeWidth={0.7} />
      {nutSettings.type === 'locking' &&
        geometry.slots.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={1.4} fill="#222" stroke="#111" strokeWidth={0.3} />
        ))}
      {nutSettings.type !== 'locking' &&
        geometry.slots.map((p, i) => (
          <line key={i} x1={p.x - 1.2} y1={p.y} x2={p.x + 1.2} y2={p.y} stroke="#666" strokeWidth={0.5} />
        ))}
    </g>
  );
}
