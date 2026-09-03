import { useMemo, useRef, useEffect } from 'react';
import { useDesignStore } from '../../state/store';
import { useViewport } from '../../hooks/useViewport';
import { useKeyboardNudge } from '../../hooks/useKeyboardNudge';
import { useEditorShortcuts } from '../../hooks/useEditorShortcuts';
import { useNeckGeometry } from '../../hooks/useNeckGeometry';
import { computeDesignBounds } from '../../geometry/bounds';
import { saddleClusterCenter } from '../../geometry/strings';
import { bridgeAssemblyPoints } from '../../geometry/bridgeGlyph';
import { BodyOutline } from './BodyOutline';
import { AnchorPoints } from './AnchorPoints';
import { FeatureHitRegions } from './FeatureHitRegions';
import { NeckOutline, FretLines } from './NeckAndFrets';
import { Hardware } from './Hardware';
import { BackView } from './BackView';
import { ConstructionView } from './ConstructionView';
import { LayerGroup } from './LayerGroup';
import { DebugOverlay } from './DebugOverlay';
import { ReferenceImageOverlay, ReferenceOverlayHitTargets, ReferenceOverlayManipulator } from './ReferenceImageOverlay';
import { Strings } from './Strings';
import { NutHardware } from './NutHardware';
import { HeadstockOutline, TunersBack, TunersFront } from './Headstock';
import { HeadstockAnchors } from './HeadstockAnchors';
import { FinishDock } from '../chrome/FinishDock';
import { BodyPickerButton, TemplateGalleryOverlay } from '../chrome/TemplatePicker';
import { ViewModeHud, ViewportHud } from '../chrome/CanvasHud';

/**
 * Top-level SVG stage. The viewBox + stage transform are derived from the
 * FULL design's bounding box (body outline + neck + headstock + hardware — see
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
  const bridgeSettings = useDesignStore((s) => s.bridgeSettings);
  const view = useDesignStore((s) => s.settings.view);
  const gridSize = useDesignStore((s) => s.settings.gridSize);
  const canvasPadding = useDesignStore((s) => s.settings.canvasPadding);
  const showDebugOverlay = useDesignStore((s) => s.settings.showDebugOverlay);
  const selected = useDesignStore((s) => s.selected);
  const select = useDesignStore((s) => s.select);
  const templateId = useDesignStore((s) => s.templateId);
  const { outlinePoints, headstockPoints, tunerPoints } = useNeckGeometry();

  const svgRootRef = useRef<SVGSVGElement | null>(null);
  const stageRef = useRef<SVGGElement | null>(null);
  const { viewport, onPointerDown, onDoubleClick, fit, resetView, bindSpaceKeys, bindWheel, bindTouch, zoomBy } =
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
    () =>
      computeDesignBounds(bodyAnchors, outlinePoints, hardware, {}, [
        ...headstockPoints,
        ...tunerPoints,
        ...bridgeAssemblyPoints(
          saddleClusterCenter(hardware.saddles),
          hardware.saddles[0]?.rotation ?? 0,
          bridgeSettings,
        ),
      ]),
    [bodyAnchors, outlinePoints, hardware, headstockPoints, tunerPoints, bridgeSettings],
  );

  const contentWidth = bounds.maxX - bounds.minX;
  const contentHeight = bounds.maxY - bounds.minY;
  const width = contentWidth + canvasPadding * 2;
  const height = contentHeight + canvasPadding * 2;
  // Top/construction: scale(-1,-1). Back: scale(-1,1) — flips bass↔treble like
  // turning the guitar over, while keeping body-local coords (and drag CTM) intact.
  const stageTx = canvasPadding + bounds.maxX;
  const stageTy = view === 'back' ? canvasPadding - bounds.minY : canvasPadding + bounds.maxY;
  const stageScale = view === 'back' ? 'scale(-1, 1)' : 'scale(-1, -1)';

  const onlyFeatureAnchorIds = useMemo(
    () => (selected?.kind === 'feature' ? bodyAnchors.filter((a) => a.featureId === selected.id).map((a) => a.id) : undefined),
    [selected, bodyAnchors],
  );

  return (
    <div className="editor-stage">
      <div className="canvas-identity">
        <BodyPickerButton />
        <FinishDock />
      </div>
      <ViewModeHud />
      <ViewportHud
        onFit={fit}
        onResetView={resetView}
        onZoomIn={() => zoomBy(1.25)}
        onZoomOut={() => zoomBy(0.8)}
      />
      <svg
        ref={svgRootRef}
        className="editor-svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Guitloft ${view} view`}
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
          <g ref={stageRef} id="stage" transform={`translate(${stageTx}, ${stageTy}) ${stageScale}`}>
            <ReferenceImageOverlay />
            {view === 'top' && (
              <>
                <LayerGroup id="body">
                  <BodyOutline variant="top" />
                </LayerGroup>
                <LayerGroup id="neck">
                  {/* Keys/housing under the headstock fill; only tips stick past the edge. */}
                  <TunersBack />
                  <NeckOutline />
                  <HeadstockOutline />
                  <NutHardware />
                </LayerGroup>
                <LayerGroup id="frets">
                  <FretLines />
                </LayerGroup>
                {/* Above body/neck fills so the photo is clickable; below hardware/anchors. */}
                <ReferenceOverlayHitTargets />
                <LayerGroup id="hardware">
                  <Hardware stageRef={stageRef} />
                  <TunersFront stageRef={stageRef} />
                </LayerGroup>
                {/* Strings above pickups/hardware so they read as sitting on the poles. */}
                <LayerGroup id="strings">
                  <Strings />
                </LayerGroup>
                <ReferenceOverlayManipulator stageRef={stageRef} />
                <FeatureHitRegions stageRef={stageRef} />
                <AnchorPoints stageRef={stageRef} onlyIds={onlyFeatureAnchorIds} />
                <HeadstockAnchors stageRef={stageRef} />
                {showDebugOverlay && <DebugOverlay />}
              </>
            )}
            {view === 'back' && (
              <>
                <ReferenceOverlayManipulator stageRef={stageRef} />
                <BackView stageRef={stageRef} />
              </>
            )}
            {view === 'construction' && (
              <>
                <ReferenceOverlayManipulator stageRef={stageRef} />
                <ConstructionView stageRef={stageRef} />
                <HeadstockAnchors stageRef={stageRef} />
                {showDebugOverlay && <DebugOverlay />}
              </>
            )}
          </g>
        </g>
      </svg>
      <TemplateGalleryOverlay />
    </div>
  );
}
