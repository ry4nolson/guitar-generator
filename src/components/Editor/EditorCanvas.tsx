import { useMemo, useRef, useEffect } from 'react';
import { useDesignStore } from '../../state/store';
import { useViewport } from '../../hooks/useViewport';
import { useKeyboardNudge } from '../../hooks/useKeyboardNudge';
import { useEditorShortcuts } from '../../hooks/useEditorShortcuts';
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
import { DebugOverlay } from './DebugOverlay';
import { ReferenceImageOverlay } from './ReferenceImageOverlay';

/**
 * Top-level SVG stage. The viewBox + stage transform are derived from the
 * FULL design's bounding box (body outline + neck + hardware — see
 * geometry/bounds.ts), not just the body's own bodyLength x bodyWidth
 * rectangle: the neck extends well beyond the body in -x, so sizing the
 * viewBox from bodyParams alone clipped most of it off-canvas.
 *
 * Pan/zoom lives in useViewport (not the design store) so it survives
 * Top/Back/Construction panel switches. Template switches call fit() so the
 * new silhouette is centered.
 */
export function EditorCanvas() {
  const bodyAnchors = useDesignStore((s) => s.bodyAnchors);
  const hardware = useDesignStore((s) => s.hardware);
  const view = useDesignStore((s) => s.settings.view);
  const gridSize = useDesignStore((s) => s.settings.gridSize);
  const canvasPadding = useDesignStore((s) => s.settings.canvasPadding);
  const showDebugOverlay = useDesignStore((s) => s.settings.showDebugOverlay);
  const selected = useDesignStore((s) => s.selected);
  const select = useDesignStore((s) => s.select);
  const templateId = useDesignStore((s) => s.templateId);
  const { outlinePoints } = useNeckGeometry();

  const svgRootRef = useRef<SVGSVGElement | null>(null);
  const stageRef = useRef<SVGGElement | null>(null);
  const { viewport, onPointerDown, onDoubleClick, fit, resetView, bindSpaceKeys, bindWheel, bindTouch, panBy, zoomBy } =
    useViewport(svgRootRef);

  useKeyboardNudge();
  useEditorShortcuts({ fit, resetView });
  useEffect(() => bindSpaceKeys(), [bindSpaceKeys]);
  useEffect(() => bindWheel(), [bindWheel]);
  useEffect(() => bindTouch(), [bindTouch]);

  // New template → re-fit so pan/zoom from the previous silhouette don't leave
  // the guitar off-screen. View-mode switches deliberately do NOT reset.
  const prevTemplateRef = useRef(templateId);
  useEffect(() => {
    if (prevTemplateRef.current !== templateId) {
      prevTemplateRef.current = templateId;
      fit();
    }
  }, [templateId, fit]);

  const bounds = useMemo(
    () => computeDesignBounds(bodyAnchors, outlinePoints, hardware),
    [bodyAnchors, outlinePoints, hardware],
  );

  const contentWidth = bounds.maxX - bounds.minX;
  const contentHeight = bounds.maxY - bounds.minY;
  const width = contentWidth + canvasPadding * 2;
  const height = contentHeight + canvasPadding * 2;
  const stageTx = canvasPadding + bounds.maxX;
  const stageTy = canvasPadding + bounds.maxY;

  const onlyFeatureAnchorIds = useMemo(
    () => (selected?.kind === 'feature' ? bodyAnchors.filter((a) => a.featureId === selected.id).map((a) => a.id) : undefined),
    [selected, bodyAnchors],
  );

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
          <ReferenceImageOverlay />
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
              {showDebugOverlay && <DebugOverlay />}
            </>
          )}
          {view === 'back' && <BackView stageRef={stageRef} />}
          {view === 'construction' && (
            <>
              <ConstructionView stageRef={stageRef} />
              {showDebugOverlay && <DebugOverlay />}
            </>
          )}
        </g>
      </g>
      <ViewportButtonsPortal onFit={fit} onResetView={resetView} />
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

function ViewportButtonsPortal({ onFit, onResetView }: { onFit: () => void; onResetView: () => void }) {
  return (
    <foreignObject x={8} y={8} width={160} height={30} style={{ overflow: 'visible' }}>
      <div className="viewport-top-buttons" style={{ pointerEvents: 'auto' }}>
        <button className="fit-button" onClick={onFit} title="Fit to screen (F)">
          ⤢ Fit
        </button>
        <button className="fit-button" onClick={onResetView} title="Reset view (0)">
          Reset View
        </button>
      </div>
    </foreignObject>
  );
}

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
