// Memoized neck/fret geometry shared by NeckOutline, FretLines, and the
// construction-line overlays, so the (mildly expensive) fan-fret + placement
// math runs once per relevant state change instead of once per consumer.
import { useMemo } from 'react';
import { useDesignStore } from '../state/store';
import { computeBridgeX, computeFanFrets, computeInlayDots, computeNeckOutlineLocal } from '../geometry/frets';
import { neckToBodySpace } from '../geometry/neckPlacement';
import { neckJoinPoint } from '../geometry/scaleLock';
import { computeHeadstockOutlineBody, computeTunerPositions } from '../geometry/headstock';
import type { Point } from '../geometry/types';

export function useNeckGeometry() {
  const neckParams = useDesignStore((s) => s.neckParams);
  const bodyAnchors = useDesignStore((s) => s.bodyAnchors);
  const headstockSettings = useDesignStore((s) => s.headstockSettings);
  const saddles = useDesignStore((s) => s.hardware.saddles);

  const joinPoint = useMemo<Point>(() => neckJoinPoint(bodyAnchors), [bodyAnchors]);
  const frets = useMemo(() => computeFanFrets(neckParams), [neckParams]);
  const bridgeX = useMemo(() => computeBridgeX(neckParams), [neckParams]);

  const outlinePoints = useMemo(
    () => computeNeckOutlineLocal(neckParams).map((p) => neckToBodySpace(p, neckParams, { joinPoint })),
    [neckParams, joinPoint],
  );

  const headstockPoints = useMemo(
    () => computeHeadstockOutlineBody(neckParams, headstockSettings, { joinPoint }),
    [neckParams, headstockSettings, joinPoint],
  );

  const tunerPoints = useMemo(
    () => computeTunerPositions(neckParams, headstockSettings, { joinPoint }, saddles).map((t) => t.position),
    [neckParams, headstockSettings, joinPoint, saddles],
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

  const placedInlays = useMemo(
    () =>
      computeInlayDots(neckParams).map((d) => ({
        fret: d.fret,
        radius: d.radius,
        center: neckToBodySpace({ x: d.x, y: d.y }, neckParams, { joinPoint }),
      })),
    [neckParams, joinPoint],
  );

  return {
    neckParams,
    joinPoint,
    frets,
    placedFrets,
    placedInlays,
    bridgeX,
    outlinePoints,
    headstockPoints,
    tunerPoints,
  };
}
