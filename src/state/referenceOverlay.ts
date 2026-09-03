// Reference overlay settings (localStorage) + document serialization helpers.
// Bitmaps are embedded as base64 data URLs in saved design JSON; SVG export
// builds from geometry alone and never consults this module.

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
  /** Mirror left↔right in the image's local frame (after rotation). */
  flipH: boolean;
  /** Mirror top↔bottom in the image's local frame (after rotation). */
  flipV: boolean;
}

/** One overlay slot (settings only — used by localStorage prefs). */
export interface ReferenceOverlayItem extends ReferenceOverlaySettings {
  id: string;
}

/** Overlay entry as stored inside a design JSON file (settings + optional bitmap). */
export interface ReferenceOverlayDocumentItem extends ReferenceOverlayItem {
  /** data:image/png|jpeg|webp;base64,... */
  imageDataUrl?: string;
}

export interface ReferenceOverlaysState {
  overlays: ReferenceOverlayItem[];
  activeId: string | null;
}

export interface ReferenceOverlaysDocument {
  overlays: ReferenceOverlayDocumentItem[];
  activeId: string | null;
}

export const EMPTY_REFERENCE_OVERLAYS: ReferenceOverlaysDocument = {
  overlays: [],
  activeId: null,
};

export const DEFAULT_REFERENCE_SETTINGS: ReferenceOverlaySettings = {
  visible: true,
  locked: false,
  opacity: 0.45,
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  flipH: false,
  flipV: false,
};

const SETTINGS_KEY_V3 = 'guitloft-reference-overlay-v3';
const LEGACY_SETTINGS_KEY_V3 = 'fretforge-reference-overlay-v3';
const SETTINGS_KEY_V2 = 'fretforge-reference-overlay-v2';
const SETTINGS_KEY_V1 = 'fretforge-reference-overlay-v1';

const IMAGE_DATA_URL_RE = /^data:image\/(png|jpeg|jpg|webp);base64,/i;

export function isAllowedImageDataUrl(value: string): boolean {
  return IMAGE_DATA_URL_RE.test(value);
}

/** PNG / JPEG / WebP by MIME type or filename extension. */
export function isAllowedReferenceImageFile(file: File): boolean {
  return /^image\/(png|jpeg|jpg|webp)$/i.test(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name);
}

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
    flipH: partial?.flipH === true,
    flipV: partial?.flipV === true,
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

/** Normalize/validate the design-file `referenceOverlays` section. */
export function normalizeReferenceOverlaysDocument(raw: unknown): ReferenceOverlaysDocument {
  if (!raw || typeof raw !== 'object') return { overlays: [], activeId: null };
  const obj = raw as Partial<ReferenceOverlaysDocument>;
  const overlays: ReferenceOverlayDocumentItem[] = [];
  if (Array.isArray(obj.overlays)) {
    for (const entry of obj.overlays) {
      if (!entry || typeof entry !== 'object') continue;
      const item = normalizeItem(entry);
      if (!item) continue;
      const dataUrl = (entry as ReferenceOverlayDocumentItem).imageDataUrl;
      if (typeof dataUrl === 'string' && isAllowedImageDataUrl(dataUrl)) {
        overlays.push({ ...item, imageDataUrl: dataUrl });
      } else {
        overlays.push(item);
      }
    }
  }
  const activeId =
    typeof obj.activeId === 'string' && overlays.some((o) => o.id === obj.activeId)
      ? obj.activeId
      : (overlays[0]?.id ?? null);
  return { overlays, activeId };
}

export function loadReferenceOverlays(): ReferenceOverlaysState {
  try {
    const rawV3 = localStorage.getItem(SETTINGS_KEY_V3) ?? localStorage.getItem(LEGACY_SETTINGS_KEY_V3);
    if (rawV3) {
      const parsed = JSON.parse(rawV3) as Partial<ReferenceOverlaysState>;
      const overlays = Array.isArray(parsed.overlays)
        ? parsed.overlays.map(normalizeItem).filter((o): o is ReferenceOverlayItem => o !== null)
        : [];
      const activeId =
        typeof parsed.activeId === 'string' && overlays.some((o) => o.id === parsed.activeId)
          ? parsed.activeId
          : (overlays[0]?.id ?? null);
      const state = { overlays, activeId };
      if (!localStorage.getItem(SETTINGS_KEY_V3)) saveReferenceOverlays(state);
      return state;
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
    // Settings only — never write image payloads into this localStorage key.
    const slim: ReferenceOverlaysState = {
      activeId: state.activeId,
      overlays: state.overlays.map(
        ({ id, visible, locked, opacity, scale, rotation, offsetX, offsetY, flipH, flipV }) => ({
          id,
          visible,
          locked,
          opacity,
          scale,
          rotation,
          offsetX,
          offsetY,
          flipH,
          flipV,
        }),
      ),
    };
    localStorage.setItem(SETTINGS_KEY_V3, JSON.stringify(slim));
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
