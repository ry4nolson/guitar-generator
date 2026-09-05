// Pan/zoom/fit interaction state for the SVG editor canvas.
//
// Deliberately kept OUT of the design-document store: this is transient view
// state (camera position), not part of the persisted design, and must never
// enter undo/redo history. It is pure interaction logic, decoupled from both
// the geometry engine and the renderer, per the "separate geometry /
// interaction / rendering / state" architecture goal.
//
// Coordinate model: the SVG root's viewBox is fixed (computed once from the
// design's full bounding box + padding — see EditorCanvas / geometry/bounds.ts).
// A child <g> applies `translate(panX, panY) scale(zoom)` on top of that
// fixed viewBox. zoom=1, pan=(0,0) is exactly "fit to screen" — that's what
// makes fit-to-screen a trivial reset rather than a recomputation.
//
// Input support: mouse-wheel ticks and pinch (ctrl+wheel) zoom; two-finger
// trackpad scroll and right-drag / middle-mouse / space+drag pan; double-click
// fits. Touch: one finger pans, two fingers pinch-zoom. `panBy`/`zoomBy` also
// expose on-screen D-pad/zoom buttons for hosts that swallow swipe gestures.

import { useCallback, useRef, useState } from 'react';

/** Pixel-mode |deltaY| below this is a trackpad tick, not a mouse-wheel notch. */
const TRACKPAD_PIXEL_TICK = 40;

export type WheelGesture = 'zoom' | 'pan';

/**
 * Classify a wheel event: macOS pinch arrives as ctrl+wheel; two-finger
 * trackpad scroll is pixel-mode (often with deltaX); discrete mouse wheels
 * send large notches or line/page mode.
 */
export function wheelGesture(e: {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey?: boolean;
  deltaX: number;
  deltaY: number;
  deltaMode: number;
}): WheelGesture {
  if (e.ctrlKey || e.metaKey) return 'zoom';
  if (e.shiftKey) return 'pan';
  const pixelMode = e.deltaMode === 0;
  const looksLikeTrackpad = pixelMode && (e.deltaX !== 0 || Math.abs(e.deltaY) < TRACKPAD_PIXEL_TICK);
  return looksLikeTrackpad ? 'pan' : 'zoom';
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true;
  return target.isContentEditable;
}

export interface Viewport {
  zoom: number;
  panX: number;
  panY: number;
}

export const DEFAULT_VIEWPORT: Viewport = { zoom: 1, panX: 0, panY: 0 };

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 10;

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

interface ActiveTouch {
  id: number;
  x: number;
  y: number;
}

/**
 * Wires wheel zoom/pan, right/middle/space-drag pan, touch pan/pinch-zoom, and
 * double-click-to-fit onto an SVG root element. `svgRootRef` must point at
 * the outer <svg> (whose screen CTM is unaffected by the pan/zoom transform
 * itself), so pixel deltas convert to viewBox units independent of the
 * current zoom level.
 */
export function useViewport(svgRootRef: React.RefObject<SVGSVGElement | null>) {
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
  const spaceHeld = useRef(false);
  const panState = useRef<{ startClientX: number; startClientY: number; startPan: Viewport } | null>(null);
  const touches = useRef<Map<number, ActiveTouch>>(new Map());
  const pinchState = useRef<{ startDistance: number; startMid: { x: number; y: number }; startPan: Viewport } | null>(
    null,
  );
  const singleTouchPan = useRef<{ startClientX: number; startClientY: number; startPan: Viewport } | null>(null);

  /** Fit = center and maximize the guitar in the current viewBox (identity camera). */
  const fit = useCallback(() => setViewport(DEFAULT_VIEWPORT), []);

  /** Reset View = return to the default camera; same identity as Fit in this model. */
  const resetView = useCallback(() => setViewport(DEFAULT_VIEWPORT), []);

  /**
   * Gesture-independent pan/zoom, for the on-screen D-pad/zoom buttons. Some
   * embedding contexts (e.g. an in-app preview webview) intercept horizontal
   * swipe gestures for their own navigation before this page ever sees them,
   * so touch/wheel panning alone isn't always reliable — these button-driven
   * controls work regardless of what gestures the host environment does or
   * doesn't forward.
   */
  const panBy = useCallback((dx: number, dy: number) => {
    setViewport((prev) => ({ ...prev, panX: prev.panX + dx, panY: prev.panY + dy }));
  }, []);

  const zoomBy = useCallback((factor: number) => {
    setViewport((prev) => ({ ...prev, zoom: clampZoom(prev.zoom * factor) }));
  }, []);

  /** Uniform screen-px -> viewBox-unit scale, read from the (pan/zoom-independent) root CTM. */
  const rootScale = useCallback((): number => {
    const svg = svgRootRef.current;
    const ctm = svg?.getScreenCTM();
    return ctm?.a || 1;
  }, [svgRootRef]);

  /** Converts a client-space point to the fixed (pre pan/zoom) viewBox frame. */
  const toLocal = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRootRef.current;
      const ctm = svg?.getScreenCTM();
      if (!svg || !ctm) return { x: 0, y: 0 };
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const local = pt.matrixTransform(ctm.inverse());
      return { x: local.x, y: local.y };
    },
    [svgRootRef],
  );

  const zoomAround = useCallback((localX: number, localY: number, factor: number) => {
    setViewport((prev) => {
      const nextZoom = clampZoom(prev.zoom * factor);
      const appliedFactor = nextZoom / prev.zoom;
      return {
        zoom: nextZoom,
        panX: localX * (1 - appliedFactor) + prev.panX * appliedFactor,
        panY: localY * (1 - appliedFactor) + prev.panY * appliedFactor,
      };
    });
  }, []);

  // --- Desktop: wheel zoom / trackpad pan ---
  // Bound with a manual, non-passive native listener (via `bindWheel`,
  // called from a useEffect) rather than React's `onWheel` prop: React
  // registers wheel listeners as passive for scroll-performance reasons, and
  // a passive listener cannot call preventDefault() — we need to, so the
  // page itself doesn't scroll while zooming/panning the canvas.
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      if (wheelGesture(e) === 'pan') {
        const scale = rootScale();
        setViewport((prev) => ({
          ...prev,
          panX: prev.panX - e.deltaX / scale,
          panY: prev.panY - e.deltaY / scale,
        }));
        return;
      }
      const local = toLocal(e.clientX, e.clientY);
      zoomAround(local.x, local.y, Math.pow(1.0015, -e.deltaY));
    },
    [toLocal, zoomAround, rootScale],
  );

  const bindWheel = useCallback(() => {
    const svg = svgRootRef.current;
    if (!svg) return () => {};
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [svgRootRef, handleWheel]);

  // --- Desktop: right-drag / middle-mouse / space+drag pan ---
  // Capture-phase so a right-drag starting on an anchor/pickup still pans
  // instead of moving geometry (children stopPropagation on pointerdown).
  const beginMousePan = useCallback(
    (e: PointerEvent) => {
      panState.current = { startClientX: e.clientX, startClientY: e.clientY, startPan: viewport };
      const handleMove = (ev: PointerEvent) => {
        if (!panState.current) return;
        const scale = rootScale();
        const dx = (ev.clientX - panState.current.startClientX) / scale;
        const dy = (ev.clientY - panState.current.startClientY) / scale;
        setViewport({
          zoom: panState.current.startPan.zoom,
          panX: panState.current.startPan.panX + dx,
          panY: panState.current.startPan.panY + dy,
        });
      };
      const handleUp = () => {
        panState.current = null;
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [rootScale, viewport],
  );

  const bindPointerPan = useCallback(() => {
    const svg = svgRootRef.current;
    if (!svg) return () => {};

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const isMiddle = e.button === 1;
      const isRight = e.button === 2;
      const isSpaceDrag = e.button === 0 && spaceHeld.current;
      if (!isMiddle && !isRight && !isSpaceDrag) return;
      e.preventDefault();
      e.stopPropagation();
      beginMousePan(e);
    };
    const onContextMenu = (e: Event) => {
      e.preventDefault();
    };

    svg.addEventListener('pointerdown', onPointerDown, { capture: true });
    svg.addEventListener('contextmenu', onContextMenu);
    return () => {
      svg.removeEventListener('pointerdown', onPointerDown, { capture: true });
      svg.removeEventListener('contextmenu', onContextMenu);
    };
  }, [svgRootRef, beginMousePan]);

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      fit();
    },
    [fit],
  );

  // --- Touch: one-finger pan, two-finger pinch-zoom ---
  // Bound as native (non-passive) touch listeners, same rationale as wheel:
  // we must call preventDefault() so the browser doesn't scroll/refresh the
  // page while the user pans/pinches the canvas, and passive listeners
  // registered via React's synthetic touch props can't do that.
  const bindTouch = useCallback(() => {
    const svg = svgRootRef.current;
    if (!svg) return () => {};

    const distance = (a: ActiveTouch, b: ActiveTouch) => Math.hypot(a.x - b.x, a.y - b.y);
    const midpoint = (a: ActiveTouch, b: ActiveTouch) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

    const onTouchStart = (e: TouchEvent) => {
      // Anchor/handle/hardware drag targets stop propagation on their own
      // pointerdown, so a touch that reaches here is always canvas-level
      // pan/zoom, never a point drag.
      e.preventDefault();
      for (const t of Array.from(e.changedTouches)) {
        touches.current.set(t.identifier, { id: t.identifier, x: t.clientX, y: t.clientY });
      }
      const active = Array.from(touches.current.values());
      if (active.length === 1) {
        singleTouchPan.current = { startClientX: active[0].x, startClientY: active[0].y, startPan: viewport };
        pinchState.current = null;
      } else if (active.length === 2) {
        singleTouchPan.current = null;
        const mid = midpoint(active[0], active[1]);
        pinchState.current = {
          startDistance: distance(active[0], active[1]),
          startMid: toLocal(mid.x, mid.y),
          startPan: viewport,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches)) {
        if (touches.current.has(t.identifier)) {
          touches.current.set(t.identifier, { id: t.identifier, x: t.clientX, y: t.clientY });
        }
      }
      const active = Array.from(touches.current.values());

      if (active.length === 2 && pinchState.current) {
        const mid = midpoint(active[0], active[1]);
        const midLocal = toLocal(mid.x, mid.y);
        const newDistance = distance(active[0], active[1]);
        const factor = newDistance / pinchState.current.startDistance;
        const nextZoom = clampZoom(pinchState.current.startPan.zoom * factor);
        const appliedFactor = nextZoom / pinchState.current.startPan.zoom;
        // Zoom around the pinch's start midpoint, then also carry any
        // two-finger drag (the midpoint moving) as additional pan.
        setViewport({
          zoom: nextZoom,
          panX:
            pinchState.current.startMid.x * (1 - appliedFactor) +
            pinchState.current.startPan.panX * appliedFactor +
            (midLocal.x - pinchState.current.startMid.x),
          panY:
            pinchState.current.startMid.y * (1 - appliedFactor) +
            pinchState.current.startPan.panY * appliedFactor +
            (midLocal.y - pinchState.current.startMid.y),
        });
      } else if (active.length === 1 && singleTouchPan.current) {
        const scale = rootScale();
        const dx = (active[0].x - singleTouchPan.current.startClientX) / scale;
        const dy = (active[0].y - singleTouchPan.current.startClientY) / scale;
        setViewport({
          zoom: singleTouchPan.current.startPan.zoom,
          panX: singleTouchPan.current.startPan.panX + dx,
          panY: singleTouchPan.current.startPan.panY + dy,
        });
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        touches.current.delete(t.identifier);
      }
      const active = Array.from(touches.current.values());
      if (active.length === 0) {
        singleTouchPan.current = null;
        pinchState.current = null;
      } else if (active.length === 1) {
        // Dropped from pinch to a single remaining finger: restart a plain pan from here.
        pinchState.current = null;
        singleTouchPan.current = { startClientX: active[0].x, startClientY: active[0].y, startPan: viewport };
      }
    };

    svg.addEventListener('touchstart', onTouchStart, { passive: false });
    svg.addEventListener('touchmove', onTouchMove, { passive: false });
    svg.addEventListener('touchend', onTouchEnd, { passive: false });
    svg.addEventListener('touchcancel', onTouchEnd, { passive: false });
    return () => {
      svg.removeEventListener('touchstart', onTouchStart);
      svg.removeEventListener('touchmove', onTouchMove);
      svg.removeEventListener('touchend', onTouchEnd);
      svg.removeEventListener('touchcancel', onTouchEnd);
    };
    // `viewport` is intentionally read fresh via closures created per-call
    // (onTouchStart/onTouchEnd capture it at gesture-start time); re-binding
    // whenever it changes keeps those closures correct without needing a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svgRootRef, rootScale, toLocal, viewport]);

  // Track spacebar state globally so "space + drag" works without needing
  // the SVG to have DOM focus.
  const bindSpaceKeys = useCallback(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTypingTarget(e.target)) return;
      e.preventDefault();
      spaceHeld.current = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceHeld.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  return {
    viewport,
    onDoubleClick,
    fit,
    resetView,
    bindSpaceKeys,
    bindWheel,
    bindTouch,
    bindPointerPan,
    panBy,
    zoomBy,
  };
}
