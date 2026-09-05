// Editor chrome prefs — theme, units, grid, view — live outside the guitar
// document so Reset all / load / autosave never clobber them.

import type { Theme, Unit, ViewMode } from '../geometry/types';

export const APP_SETTINGS_KEY = 'guitloft-app-settings';

export interface AppSettings {
  unit: Unit;
  theme: Theme;
  view: ViewMode;
  gridSize: number;
  gridSnapEnabled: boolean;
  showPointsAndHandles: boolean;
  showDebugOverlay: boolean;
  canvasPadding: number;
  /**
   * When true, dragging a body/headstock outline point or handle also moves
   * its mirror across the string centerline (y = 0).
   */
  symmetricEditing: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  unit: 'mm',
  theme: 'dark',
  view: 'top',
  gridSize: 5,
  gridSnapEnabled: false,
  showPointsAndHandles: true,
  showDebugOverlay: false,
  canvasPadding: 40,
  symmetricEditing: true,
};

/** Pull known chrome prefs out of a saved design's old combined `settings` blob. */
export function pickAppSettings(source: unknown): Partial<AppSettings> {
  if (!source || typeof source !== 'object') return {};
  const s = source as Record<string, unknown>;
  const out: Partial<AppSettings> = {};
  if (s.unit === 'mm' || s.unit === 'in') out.unit = s.unit;
  if (s.theme === 'dark' || s.theme === 'light') out.theme = s.theme;
  if (s.view === 'top' || s.view === 'back' || s.view === 'construction') out.view = s.view;
  if (typeof s.gridSize === 'number' && Number.isFinite(s.gridSize)) {
    out.gridSize = Math.min(50, Math.max(1, s.gridSize));
  }
  if (typeof s.gridSnapEnabled === 'boolean') out.gridSnapEnabled = s.gridSnapEnabled;
  if (typeof s.showPointsAndHandles === 'boolean') out.showPointsAndHandles = s.showPointsAndHandles;
  if (typeof s.showDebugOverlay === 'boolean') out.showDebugOverlay = s.showDebugOverlay;
  if (typeof s.canvasPadding === 'number' && Number.isFinite(s.canvasPadding)) {
    out.canvasPadding = Math.min(200, Math.max(0, s.canvasPadding));
  }
  if (typeof s.symmetricEditing === 'boolean') out.symmetricEditing = s.symmetricEditing;
  return out;
}

export function persistAppSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable (e.g. private mode quota)
  }
}

/**
 * Load chrome prefs from their own key. If that key is missing, seed from a
 * legacy design-document `settings` object (older autosaves stored theme there).
 */
export function loadAppSettings(seedFromDesign?: unknown): AppSettings {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_APP_SETTINGS, ...pickAppSettings(JSON.parse(raw)) };
    }
  } catch {
    // invalid JSON — fall through to seed / defaults
  }
  const seeded = { ...DEFAULT_APP_SETTINGS, ...pickAppSettings(seedFromDesign) };
  persistAppSettings(seeded);
  return seeded;
}
