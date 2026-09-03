import { useMemo } from 'react';
import { useDesignStore, DEFAULT_HEADSTOCK_OPACITY } from '../../state/store';
import { useNeckGeometry } from '../../hooks/useNeckGeometry';
import {
  headstockAnchorsToBody,
  headstockAnchorsToPathD,
} from '../../geometry/headstock';
import { useSvgDrag } from '../../hooks/useSvgDrag';
import { snapToGrid } from '../../geometry/snapping';
import { tunerGlyphSvgMarkup, tunerHitRadius, type TunerGlyphPart } from '../../geometry/tunerGlyph';

/** Headstock silhouette past the nut (hidden when style is headless). */
export function HeadstockOutline() {
  const headstock = useDesignStore((s) => s.headstockSettings);
  const anchors = useDesignStore((s) => s.headstockAnchors);
  const headstockOpacity = useDesignStore((s) => s.settings.headstockOpacity ?? DEFAULT_HEADSTOCK_OPACITY);
  const { neckParams, joinPoint } = useNeckGeometry();

  const bodyAnchors = useMemo(
    () => headstockAnchorsToBody(anchors, neckParams, { joinPoint }),
    [anchors, neckParams, joinPoint],
  );

  if (headstock.type === 'headless' || bodyAnchors.length < 3) return null;
  const d = headstockAnchorsToPathD(bodyAnchors);
  return (
    <g id="headstock">
      <path
        d={d}
        fill="var(--headstock-fill)"
        fillOpacity={headstockOpacity}
        stroke="var(--outline-stroke)"
        strokeWidth={0.7}
      />
    </g>
  );
}

function useTunerDrawState() {
  const headstock = useDesignStore((s) => s.headstockSettings);
  const tuners = useDesignStore((s) => s.hardware.tuners ?? []);
  const stringCount = useDesignStore((s) => s.bridgeSettings.stringCount ?? 6);
  const show =
    headstock.showTuners && headstock.tunerLayout !== 'none' && tuners.length > 0;
  const radius = stringCount > 8 ? 3.6 : headstock.tunerLayout === 'headless' ? 3.2 : 4.2;
  const showButton = headstock.tunerLayout !== 'headless';
  return { headstock, tuners, show, radius, showButton };
}

/**
 * Rear of the machines (housing + shaft + key) — draw UNDER the headstock fill
 * so only the keys stick out past the outline edge.
 */
export function TunersBack() {
  const { tuners, show, radius, showButton } = useTunerDrawState();
  if (!show || !showButton) return null;

  return (
    <g id="tuners-back" style={{ pointerEvents: 'none' }}>
      {tuners.map((t, i) => {
        if (!t.visible) return null;
        return (
          <g key={i} transform={`translate(${t.x},${t.y}) rotate(${t.rotation})`}>
            <g
              dangerouslySetInnerHTML={{
                __html: tunerGlyphSvgMarkup(radius, { showButton: true, part: 'back' }),
              }}
            />
          </g>
        );
      })}
    </g>
  );
}

/**
 * Face bushings + posts (and drag handles) — draw ABOVE the headstock.
 */
export function TunersFront({ stageRef }: { stageRef: React.RefObject<SVGGElement | null> }) {
  const { tuners, show, radius, showButton } = useTunerDrawState();
  const move = useDesignStore((s) => s.moveHardware);
  const select = useDesignStore((s) => s.select);
  const selected = useDesignStore((s) => s.selected);
  const settings = useDesignStore((s) => s.settings);

  if (!show) return null;

  return (
    <g id="tuners-front">
      {tuners.map((t, i) => {
        if (!t.visible) return null;
        const isSelected =
          selected?.kind === 'hardware' && selected.name === 'tuners' && selected.index === i;
        return (
          <TunerPeg
            key={i}
            index={i}
            x={t.x}
            y={t.y}
            rotation={t.rotation}
            radius={radius}
            selected={isSelected}
            showButton={showButton}
            part="front"
            layoutLocked={t.locked}
            stageRef={stageRef}
            onSelect={() => select({ kind: 'hardware', name: 'tuners', index: i })}
            onMove={(p) => {
              const snapped = snapToGrid(p, settings.gridSize, settings.gridSnapEnabled);
              move('tuners', snapped, i);
            }}
          />
        );
      })}
    </g>
  );
}

/** @deprecated Prefer TunersBack + TunersFront for correct headstock occlusion. */
export function Tuners({ stageRef }: { stageRef: React.RefObject<SVGGElement | null> }) {
  return (
    <>
      <TunersBack />
      <TunersFront stageRef={stageRef} />
    </>
  );
}

function TunerPeg({
  index,
  x,
  y,
  rotation,
  radius,
  selected,
  showButton,
  part,
  layoutLocked,
  stageRef,
  onSelect,
  onMove,
}: {
  index: number;
  x: number;
  y: number;
  rotation: number;
  radius: number;
  selected: boolean;
  showButton: boolean;
  part: TunerGlyphPart;
  layoutLocked: boolean;
  stageRef: React.RefObject<SVGGElement | null>;
  onSelect: () => void;
  onMove: (p: { x: number; y: number }) => void;
}) {
  const drag = useSvgDrag(stageRef, onMove);
  const hitR = tunerHitRadius(radius, showButton);
  const markup = tunerGlyphSvgMarkup(radius, { showButton, selected, part });

  return (
    <g
      transform={`translate(${x},${y}) rotate(${rotation})`}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
        drag(e);
      }}
      style={{ cursor: 'grab' }}
    >
      <title>
        {layoutLocked
          ? `Tuner ${index + 1} (manual — unlock to follow outline)`
          : `Tuner ${index + 1} (drag to place)`}
      </title>
      <circle r={hitR} fill="transparent" />
      <g dangerouslySetInnerHTML={{ __html: markup }} />
    </g>
  );
}
