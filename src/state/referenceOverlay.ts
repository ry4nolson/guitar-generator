// Session-only reference images + lightweight overlay settings persisted in
// localStorage. Bitmaps are never written to disk/autosave — they live as
// object URLs for the current tab only. SVG export builds documents from
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

/** One persisted overlay slot (image bytes are session-only). */
export interface ReferenceOverlayItem extends ReferenceOverlaySettings {
  id: string;
}

export interface ReferenceOverlaysState {
  overlays: ReferenceOverlayItem[];
  activeId: string | null;
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

const SETTINGS_KEY_V3 = 'fretforge-reference-overlay-v3';
const SETTINGS_KEY_V2 = 'fretforge-reference-overlay-v2';
const SETTINGS_KEY_V1 = 'fretforge-reference-overlay-v1';

export function createOverlayId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ref-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createReferenceOverlayItem(
  partial?: Partial<ReferenceOverlaySettings> & { id?: string },
): ReferenceOverlayItem {
  return {
    id: partial?.id ?? createOverlayId(),
    visible: partial?.visible ?? DEFAULT_REFERENCE_SETTINGS.visible,
    locked: partial?.locked ?? DEFAULT_REFERENCE_SETTINGS.locked,
    opacity: clamp(partial?.opacity ?? DEFAULT_REFERENCE_SETTINGS.opacity, 0.05, 1),
    scale: clamp(partial?.scale ?? DEFAULT_REFERENCE_SETTINGS.scale, 0.2, 4),
    rotation: Number.isFinite(partial?.rotation)
      ? normalizeDegrees(partial!.rotation as number)
      : DEFAULT_REFERENCE_SETTINGS.rotation,
    offsetX: Number.isFinite(partial?.offsetX) ? (partial!.offsetX as number) : 0,
    offsetY: Number.isFinite(partial?.offsetY) ? (partial!.offsetY as number) : 0,
  };
}

function normalizeItem(raw: Partial<ReferenceOverlayItem> & { id?: string }): ReferenceOverlayItem | null {
  if (!raw.id || typeof raw.id !== 'string') return null;
  return createReferenceOverlayItem(raw);
}

function parseLegacySingle(raw: string): ReferenceOverlaysState {
  const parsed = JSON.parse(raw) as Partial<ReferenceOverlaySettings>;
  const item = createReferenceOverlayItem(parsed);
  return { overlays: [item], activeId: item.id };
}

export function loadReferenceOverlays(): ReferenceOverlaysState {
  try {
    const rawV3 = localStorage.getItem(SETTINGS_KEY_V3);
    if (rawV3) {
      const parsed = JSON.parse(rawV3) as Partial<ReferenceOverlaysState>;
      const overlays = Array.isArray(parsed.overlays)
        ? parsed.overlays.map(normalizeItem).filter((o): o is ReferenceOverlayItem => o !== null)
        : [];
      const activeId =
        typeof parsed.activeId === 'string' && overlays.some((o) => o.id === parsed.activeId)
          ? parsed.activeId
          : (overlays[0]?.id ?? null);
      return { overlays, activeId };
    }

    const legacy = localStorage.getItem(SETTINGS_KEY_V2) ?? localStorage.getItem(SETTINGS_KEY_V1);
    if (legacy) {
      const migrated = parseLegacySingle(legacy);
      saveReferenceOverlays(migrated);
      return migrated;
    }
  } catch {
    // private mode / corrupt — fall through
  }
  return { overlays: [], activeId: null };
}

/** @deprecated Prefer loadReferenceOverlays — kept for older call sites/tests. */
export function loadReferenceSettings(): ReferenceOverlaySettings {
  const { overlays, activeId } = loadReferenceOverlays();
  const active = overlays.find((o) => o.id === activeId) ?? overlays[0];
  if (!active) return { ...DEFAULT_REFERENCE_SETTINGS };
  const { id: _id, ...settings } = active;
  return settings;
}

export function saveReferenceOverlays(state: ReferenceOverlaysState): void {
  try {
    localStorage.setItem(SETTINGS_KEY_V3, JSON.stringify(state));
  } catch {
    // private mode / quota — ignore
  }
}

/** @deprecated Prefer saveReferenceOverlays. */
export function saveReferenceSettings(settings: ReferenceOverlaySettings): void {
  const item = createReferenceOverlayItem(settings);
  saveReferenceOverlays({ overlays: [item], activeId: item.id });
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
