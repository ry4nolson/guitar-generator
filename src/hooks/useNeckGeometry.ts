// Memoized neck/fret geometry shared by NeckOutline, FretLines, and the
// construction-line overlays, so the (mildly expensive) fan-fret + placement
// math runs once per relevant state change instead of once per consumer.
import { useMemo } from 'react';
import { useDesignStore } from '../state/store';
import { computeBridgeX, computeFanFrets } from '../geometry/frets';
import { neckToBodySpace } from '../geometry/neckPlacement';
import type { Point } from '../geometry/types';

export function useNeckGeometry() {
  const neckParams = useDesignStore((s) => s.neckParams);
  const joinX = useDesignStore((s) => s.bodyAnchors.find((a) => a.id === 'neckJoint')!.position.x);

  const joinPoint = useMemo<Point>(() => ({ x: joinX, y: 0 }), [joinX]);
  const frets = useMemo(() => computeFanFrets(neckParams), [neckParams]);
  const bridgeX = useMemo(() => computeBridgeX(neckParams), [neckParams]);

  const outlinePoints = useMemo(
    () =>
      [
        { x: 0, y: neckParams.nutWidth / 2 },
        { x: neckParams.neckLength, y: neckParams.heelWidth / 2 },
        { x: neckParams.neckLength, y: -neckParams.heelWidth / 2 },
        { x: 0, y: -neckParams.nutWidth / 2 },
      ].map((p) => neckToBodySpace(p, neckParams, { joinPoint })),
    [neckParams, joinPoint],
  );

  const placedFrets = useMemo(
    () =>
      frets.map((f) => ({
        fretNumber: f.fretNumber,
        bass: neckToBodySpace(f.bassPoint, neckParams, { joinPoint }),
        treble: neckToBodySpace(f.treblePoint, neckParams, { joinPoint }),
      })),
    [frets, neckParams, joinPoint],
  );

  return { neckParams, joinPoint, frets, placedFrets, bridgeX, outlinePoints };
}
