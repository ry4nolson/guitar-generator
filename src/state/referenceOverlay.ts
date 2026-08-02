// Session-only reference image + lightweight overlay settings persisted in
// localStorage. The bitmap itself is never written to disk/autosave — it lives
// as an object URL for the current tab only. SVG export builds documents from
// geometry alone and never consults this module.

export interface ReferenceOverlaySettings {
  visible: boolean;
  locked: boolean;
  opacity: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export const DEFAULT_REFERENCE_SETTINGS: ReferenceOverlaySettings = {
  visible: true,
  locked: false,
  opacity: 0.45,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

const SETTINGS_KEY = 'fretforge-reference-overlay-v1';

export function loadReferenceSettings(): ReferenceOverlaySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_REFERENCE_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<ReferenceOverlaySettings>;
    return {
      visible: parsed.visible ?? DEFAULT_REFERENCE_SETTINGS.visible,
      locked: parsed.locked ?? DEFAULT_REFERENCE_SETTINGS.locked,
      opacity: clamp(parsed.opacity ?? DEFAULT_REFERENCE_SETTINGS.opacity, 0.05, 1),
      scale: clamp(parsed.scale ?? DEFAULT_REFERENCE_SETTINGS.scale, 0.2, 4),
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

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
