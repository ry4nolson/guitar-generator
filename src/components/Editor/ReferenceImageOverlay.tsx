import { useRef } from 'react';
import { useReferenceOverlayContext } from '../../state/ReferenceOverlayContext';
import { referenceImageLayout, rotationFromPointer } from '../../state/referenceOverlay';
import { clientToLocalPoint } from '../../hooks/useSvgDrag';
import type { ReferenceOverlayRuntime } from '../../hooks/useReferenceOverlay';

/**
 * Renders all tracing reference images in body-local mm space,
 * behind the SVG geometry. Excluded from exports because svgExport builds
 * documents from geometry alone and never mounts this component.
 */
export function ReferenceImageOverlay() {
  const { overlays } = useReferenceOverlayContext();
  const visible = overlays.filter((o) => o.imageUrl && o.naturalSize && o.settings.visible);
  if (visible.length === 0) return null;

  return (
    <g data-reference-overlay="true" style={{ pointerEvents: 'none' }}>
      {visible.map((overlay) => (
        <ReferenceImage key={overlay.id} overlay={overlay} />
      ))}
    </g>
  );
}

function ReferenceImage({ overlay }: { overlay: ReferenceOverlayRuntime }) {
  const { settings, imageUrl, naturalSize } = overlay;
  if (!imageUrl || !naturalSize) return null;
  const { width, height, cx, cy, rotation } = referenceImageLayout(settings, naturalSize);

  return (
    <g transform={`translate(${cx},${cy}) rotate(${rotation}) translate(${-width / 2},${-height / 2})`}>
      <image href={imageUrl} x={0} y={0} width={width} height={height} opacity={settings.opacity} preserveAspectRatio="none" />
    </g>
  );
}

const HANDLE_OFFSET = 18;
const HANDLE_R = 5;

/**
 * Dashed frame + rotate handle for the active unlocked overlay, drawn above
 * the design so the reference can be dragged and rotated.
 */
export function ReferenceOverlayManipulator({ stageRef }: { stageRef: React.RefObject<SVGGElement | null> }) {
  const { activeOverlay, updateOverlay, setActiveId, overlays } = useReferenceOverlayContext();
  const dragMode = useRef<'move' | 'rotate' | null>(null);
  const dragOrigin = useRef<{
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
    cx: number;
    cy: number;
    id: string;
  } | null>(null);

  // Prefer the active unlocked overlay; otherwise first unlocked visible with an image.
  const target =
    activeOverlay &&
    activeOverlay.imageUrl &&
    activeOverlay.naturalSize &&
    activeOverlay.settings.visible &&
    !activeOverlay.settings.locked
      ? activeOverlay
      : overlays.find(
          (o) => o.imageUrl && o.naturalSize && o.settings.visible && !o.settings.locked,
        ) ?? null;

  if (!target || !target.naturalSize) return null;

  const { width, height, cx, cy, rotation } = referenceImageLayout(target.settings, target.naturalSize);
  const handleY = -height / 2 - HANDLE_OFFSET;
  const overlayId = target.id;

  const beginDrag = (mode: 'move' | 'rotate', e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const group = stageRef.current;
    if (!group) return;
    setActiveId(overlayId);
    const start = clientToLocalPoint(e.nativeEvent, group);
    dragMode.current = mode;
    dragOrigin.current = {
      x: start.x,
      y: start.y,
      offsetX: target.settings.offsetX,
      offsetY: target.settings.offsetY,
      cx,
      cy,
      id: overlayId,
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);

    const handleMove = (ev: PointerEvent) => {
      if (!dragMode.current || !dragOrigin.current) return;
      const p = clientToLocalPoint(ev, group);
      const id = dragOrigin.current.id;
      if (dragMode.current === 'move') {
        updateOverlay(id, {
          offsetX: dragOrigin.current.offsetX + (p.x - dragOrigin.current.x),
          offsetY: dragOrigin.current.offsetY + (p.y - dragOrigin.current.y),
        });
      } else {
        updateOverlay(id, {
          rotation: rotationFromPointer(dragOrigin.current.cx, dragOrigin.current.cy, p.x, p.y),
        });
      }
    };
    const handleUp = () => {
      dragMode.current = null;
      dragOrigin.current = null;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  // Hit-test only the frame stroke + rotate handle so anchors/features inside
  // the image remain clickable (pointer-events do not cover the interior).
  return (
    <g id="reference-overlay-manipulator" transform={`translate(${cx},${cy}) rotate(${rotation})`}>
      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
        style={{ cursor: 'move', pointerEvents: 'stroke' }}
        onPointerDown={(e) => beginDrag('move', e)}
      >
        <title>Drag border to move reference</title>
      </rect>
      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        fill="none"
        stroke="#4aa3ff"
        strokeWidth={1.2}
        strokeDasharray="6 4"
        style={{ pointerEvents: 'none' }}
      />
      <line
        x1={0}
        y1={-height / 2}
        x2={0}
        y2={handleY}
        stroke="#4aa3ff"
        strokeWidth={1}
        style={{ pointerEvents: 'none' }}
      />
      <circle
        cx={0}
        cy={handleY}
        r={HANDLE_R}
        fill="#4aa3ff"
        stroke="#fff"
        strokeWidth={1}
        style={{ cursor: 'grab', pointerEvents: 'all' }}
        onPointerDown={(e) => beginDrag('rotate', e)}
      >
        <title>Drag to rotate reference</title>
      </circle>
    </g>
  );
}
