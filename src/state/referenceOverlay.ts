// Session-only reference image + lightweight overlay settings persisted in
// localStorage. The bitmap itself is never written to disk/autosave — it lives
// as an object URL for the current tab only. SVG export builds documents from
// geometry alone and never consults this module.

export interface ReferenceOverlaySettings {
  visible: boolean;
  locked: boolean;
  opacity: number;
  scale: number;
  /** Degrees, clockwise in body-local mm space. */
  rotation: number;
  /** Left edge of the unrotated image (mm). */
  offsetX: number;
  /** Vertical center of the image (mm). */
  offsetY: number;
}

export const DEFAULT_REFERENCE_SETTINGS: ReferenceOverlaySettings = {
  visible: true,
  locked: false,
  opacity: 0.45,
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
};

const SETTINGS_KEY = 'fretforge-reference-overlay-v2';

export function loadReferenceSettings(): ReferenceOverlaySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY) ?? localStorage.getItem('fretforge-reference-overlay-v1');
    if (!raw) return { ...DEFAULT_REFERENCE_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<ReferenceOverlaySettings>;
    return {
      visible: parsed.visible ?? DEFAULT_REFERENCE_SETTINGS.visible,
      locked: parsed.locked ?? DEFAULT_REFERENCE_SETTINGS.locked,
      opacity: clamp(parsed.opacity ?? DEFAULT_REFERENCE_SETTINGS.opacity, 0.05, 1),
      scale: clamp(parsed.scale ?? DEFAULT_REFERENCE_SETTINGS.scale, 0.2, 4),
      rotation: Number.isFinite(parsed.rotation) ? normalizeDegrees(parsed.rotation as number) : 0,
      offsetX: Number.isFinite(parsed.offsetX) ? (parsed.offsetX as number) : 0,
      offsetY: Number.isFinite(parsed.offsetY) ? (parsed.offsetY as number) : 0,
    };
  } catch {
    return { ...DEFAULT_REFERENCE_SETTINGS };
  }
}

export function saveReferenceSettings(settings: ReferenceOverlaySettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // private mode / quota — ignore
  }
}

/** Layout of the reference image in body-local mm space. */
export function referenceImageLayout(
  settings: Pick<ReferenceOverlaySettings, 'scale' | 'rotation' | 'offsetX' | 'offsetY'>,
  naturalSize: { width: number; height: number },
) {
  const baseWidthMm = 450;
  const aspect = naturalSize.height / naturalSize.width;
  const width = baseWidthMm * settings.scale;
  const height = width * aspect;
  const cx = settings.offsetX + width / 2;
  const cy = settings.offsetY;
  return { width, height, cx, cy, rotation: settings.rotation };
}

/** Angle (deg) from image center to a body-local point, relative to the rotate-handle at "up". */
export function rotationFromPointer(cx: number, cy: number, px: number, py: number): number {
  // Handle sits at local (0, -height/2 - pad) → angle -90° when rotation is 0.
  return normalizeDegrees((Math.atan2(py - cy, px - cx) * 180) / Math.PI + 90);
}

export function normalizeDegrees(deg: number): number {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
