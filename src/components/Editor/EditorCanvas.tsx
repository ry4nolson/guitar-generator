import { useMemo, useRef, useEffect } from 'react';
import { useDesignStore } from '../../state/store';
import { useViewport } from '../../hooks/useViewport';
import { useKeyboardNudge } from '../../hooks/useKeyboardNudge';
import { useNeckGeometry } from '../../hooks/useNeckGeometry';
import { computeDesignBounds } from '../../geometry/bounds';
import { BodyOutline } from './BodyOutline';
import { AnchorPoints } from './AnchorPoints';
import { FeatureHitRegions } from './FeatureHitRegions';
import { NeckOutline, FretLines } from './NeckAndFrets';
import { Hardware } from './Hardware';
import { BackView } from './BackView';
import { ConstructionView } from './ConstructionView';
import { LayerGroup } from './LayerGroup';
import { featureById } from '../../geometry/bodyFeatures';

/**
 * Top-level SVG stage. The viewBox + stage transform are derived from the
 * FULL design's bounding box (body outline + neck + hardware — see
 * geometry/bounds.ts), not just the body's own bodyLength x bodyWidth
 * rectangle: the neck extends well beyond the body in -x, so sizing the
 * viewBox from bodyParams alone clipped most of it off-canvas.
 *
 * The stage transform applies `scale(-1,-1)`:
 *   - The y flip is required because body-local geometry uses +y = bass/
 *     upper-bout side, meant to read as "up" on screen, but SVG's own
 *     coordinate space has +y pointing down.
 *   - The x flip orients the neck/headstock toward the right side of the
 *     canvas (screen convention for this app), matching how neck-local
 *     coordinates increase in -x away from the body (see neckPlacement.ts).
 * Because all drag/pan/zoom math goes through `getScreenCTM()` (see
 * hooks/useSvgDrag.ts, useViewport.ts), this transform is transparent to
 * every interaction — nothing else needs to account for it.
 */
export function EditorCanvas() {
  const bodyAnchors = useDesignStore((s) => s.bodyAnchors);
  const hardware = useDesignStore((s) => s.hardware);
  const view = useDesignStore((s) => s.settings.view);
  const gridSize = useDesignStore((s) => s.settings.gridSize);
  const canvasPadding = useDesignStore((s) => s.settings.canvasPadding);
  const selected = useDesignStore((s) => s.selected);
  const select = useDesignStore((s) => s.select);
  const { outlinePoints } = useNeckGeometry();

  const svgRootRef = useRef<SVGSVGElement | null>(null);
  const stageRef = useRef<SVGGElement | null>(null);
  const { viewport, onPointerDown, onDoubleClick, fit, bindSpaceKeys, bindWheel, bindTouch, panBy, zoomBy } =
    useViewport(svgRootRef);

  useKeyboardNudge();
  useEffect(() => bindSpaceKeys(), [bindSpaceKeys]);
  useEffect(() => bindWheel(), [bindWheel]);
  useEffect(() => bindTouch(), [bindTouch]);

  const bounds = useMemo(
    () => computeDesignBounds(bodyAnchors, outlinePoints, hardware),
    [bodyAnchors, outlinePoints, hardware],
  );

  const contentWidth = bounds.maxX - bounds.minX;
  const contentHeight = bounds.maxY - bounds.minY;
  const width = contentWidth + canvasPadding * 2;
  const height = contentHeight + canvasPadding * 2;
  // See the module comment: tx/ty are derived so that scale(-1,-1) both
  // flips y (upper-bout side renders "up") and mirrors x (neck renders
  // toward the right), while fitting the full bounds within [0,width]x[0,height].
  const stageTx = canvasPadding + bounds.maxX;
  const stageTy = canvasPadding + bounds.maxY;

  const onlyFeatureAnchorIds = useMemo(
    () => (selected?.kind === 'feature' ? featureById(selected.id).anchorIds : undefined),
    [selected],
  );

  // A fixed on-screen nudge distance (in viewBox units, scaled by the current
  // zoom so each button press feels like a consistent screen-space step).
  const panStep = Math.max(width, height) * 0.08;

  return (
    <svg
      ref={svgRootRef}
      className="editor-svg"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Guitar body ${view} view`}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      <defs>
        <pattern id="grid-pattern" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
          <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="var(--grid-line)" strokeWidth={0.25} />
        </pattern>
      </defs>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="url(#grid-pattern)"
        onPointerDown={(e) => {
          if (e.pointerType !== 'touch') select(null);
        }}
      />
      <g transform={`translate(${viewport.panX}, ${viewport.panY}) scale(${viewport.zoom})`}>
        <g ref={stageRef} id="stage" transform={`translate(${stageTx}, ${stageTy}) scale(-1,-1)`}>
          {view === 'top' && (
            <>
              <LayerGroup id="body">
                <BodyOutline variant="top" />
              </LayerGroup>
              <LayerGroup id="neck">
                <NeckOutline />
              </LayerGroup>
              <LayerGroup id="frets">
                <FretLines />
              </LayerGroup>
              <LayerGroup id="hardware">
                <Hardware stageRef={stageRef} />
              </LayerGroup>
              <FeatureHitRegions stageRef={stageRef} />
              <AnchorPoints stageRef={stageRef} onlyIds={onlyFeatureAnchorIds} />
            </>
          )}
          {view === 'back' && <BackView stageRef={stageRef} />}
          {view === 'construction' && <ConstructionView stageRef={stageRef} />}
        </g>
      </g>
      <FitButtonPortal onFit={fit} />
      <ViewportControlsPortal
        width={width}
        onPanLeft={() => panBy(-panStep, 0)}
        onPanRight={() => panBy(panStep, 0)}
        onPanUp={() => panBy(0, -panStep)}
        onPanDown={() => panBy(0, panStep)}
        onZoomIn={() => zoomBy(1.25)}
        onZoomOut={() => zoomBy(0.8)}
      />
    </svg>
  );
}

/**
 * A small always-visible "Fit" affordance, rendered as a foreignObject so it
 * doesn't require a separate absolutely-positioned wrapper element around the
 * <svg> (keeping EditorCanvas a single drop-in element for the editor pane).
 */
function FitButtonPortal({ onFit }: { onFit: () => void }) {
  return (
    <foreignObject x={8} y={8} width={70} height={30} style={{ overflow: 'visible' }}>
      <button
        className="fit-button"
        onClick={onFit}
        title="Fit to screen (or double-click the canvas)"
        style={{ pointerEvents: 'auto' }}
      >
        ⤢ Fit
      </button>
    </foreignObject>
  );
}

/**
 * Gesture-independent pan (D-pad) + zoom controls. Wheel/drag/touch gestures
 * are the primary way to navigate, but some embedding contexts (e.g. an
 * in-app preview webview) intercept horizontal swipes for their own
 * navigation before this page ever sees them — these buttons work no matter
 * what gestures the host environment does or doesn't forward.
 */
function ViewportControlsPortal({
  width,
  onPanLeft,
  onPanRight,
  onPanUp,
  onPanDown,
  onZoomIn,
  onZoomOut,
}: {
  width: number;
  onPanLeft: () => void;
  onPanRight: () => void;
  onPanUp: () => void;
  onPanDown: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}) {
  return (
    <foreignObject x={Math.max(8, width - 132)} y={8} width={124} height={124} style={{ overflow: 'visible' }}>
      <div className="viewport-controls" style={{ pointerEvents: 'auto' }}>
        <div className="dpad">
          <button className="dpad-up" onClick={onPanUp} title="Pan up" aria-label="Pan up">
            ▲
          </button>
          <button className="dpad-left" onClick={onPanLeft} title="Pan left" aria-label="Pan left">
            ◀
          </button>
          <button className="dpad-center" disabled aria-hidden="true" />
          <button className="dpad-right" onClick={onPanRight} title="Pan right" aria-label="Pan right">
            ▶
          </button>
          <button className="dpad-down" onClick={onPanDown} title="Pan down" aria-label="Pan down">
            ▼
          </button>
        </div>
        <div className="zoom-buttons">
          <button onClick={onZoomOut} title="Zoom out" aria-label="Zoom out">
            −
          </button>
          <button onClick={onZoomIn} title="Zoom in" aria-label="Zoom in">
            +
          </button>
        </div>
      </div>
    </foreignObject>
  );
}
