// Tiny hex color helpers for appearance settings (body / fretboard fills).

/** Vintage amber — center of a typical 3-tone burst. */
export const DEFAULT_BODY_COLOR = '#c9973d';
/** Indian rosewood fingerboard. */
export const DEFAULT_FRETBOARD_COLOR = '#3d2416';
/** Unfinished maple neck / headstock. */
export const DEFAULT_HEADSTOCK_COLOR = '#e6c88a';

/** Pre-finish-pass CAD plywood fills; migrated to the new defaults on load. */
export const LEGACY_BODY_COLOR = '#d9c9a8';
export const LEGACY_FRETBOARD_COLOR = '#caa46a';

export interface BodyFinishStops {
  center: string;
  mid: string;
  rim: string;
}

/** Radial burst derived from a solid body color (works for amber, black, white). */
export function bodyFinishStops(hex: string): BodyFinishStops {
  const lum = relativeLuminance(hex);
  // Solid dark/light paints only need a hint of edge shading; wood/amber gets a real burst.
  const lift = lum < 0.22 ? 0.07 : lum > 0.82 ? 0.04 : 0.28;
  const sink = lum < 0.22 ? 0.18 : lum > 0.82 ? 0.16 : 0.55;
  return {
    center: lightenHex(hex, lift),
    mid: hex,
    rim: darkenHex(hex, sink),
  };
}

/** Relative luminance of a #RRGGBB color, 0–1. */
export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0.5;
  return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
}

/** Darken a #RRGGBB (or #RGB) color by mixing toward black. amount ∈ [0, 1]. */
export function darkenHex(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const t = Math.min(1, Math.max(0, amount));
  const r = Math.round(rgb.r * (1 - t));
  const g = Math.round(rgb.g * (1 - t));
  const b = Math.round(rgb.b * (1 - t));
  return toHex(r, g, b);
}

/** Lighten a #RRGGBB (or #RGB) color by mixing toward white. amount ∈ [0, 1]. */
export function lightenHex(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const t = Math.min(1, Math.max(0, amount));
  const r = Math.round(rgb.r + (255 - rgb.r) * t);
  const g = Math.round(rgb.g + (255 - rgb.g) * t);
  const b = Math.round(rgb.b + (255 - rgb.b) * t);
  return toHex(r, g, b);
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return {
      r: parseInt(raw[0] + raw[0], 16),
      g: parseInt(raw[1] + raw[1], 16),
      b: parseInt(raw[2] + raw[2], 16),
    };
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
    };
  }
  return null;
}

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}
