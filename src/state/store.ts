// Central Zustand store. This is the single source of truth for the entire
// design: body params + persisted anchor geometry, neck params, hardware
// layout, layer visibility/lock, view/unit/theme prefs, and undo/redo
// history.
//
// IMPORTANT product rule: controls never regenerate the design from scratch.
// Body anchors are persisted state (`bodyAnchors`); changing a body param
// recomputes only the anchors the user hasn't manually overridden
// (see geometry/bodyModel.ts). Dragging an anchor sets `manuallyEdited` so
// future param changes leave it alone until the user resets it.
//
// NOTE on what's deliberately NOT here: pan/zoom (camera) state lives in the
// `useViewport` hook, not in this store — it's transient view/interaction
// state, not part of the persisted design, and must never enter undo/redo.

import { create } from 'zustand';
import type { BodyAnchor, BodyAnchorId, HardwarePosition, Point, Theme, Unit, ViewMode } from '../geometry/types';
import { DEFAULT_BODY_PARAMS, type BodyParams } from '../geometry/bodyParams';
import { computeParametricAnchors, recomputeAnchorsPreservingEdits, resetAnchor } from '../geometry/bodyModel';
import { DEFAULT_NECK_PARAMS, type NeckParams } from '../geometry/neckParams';
import { DEFAULT_HARDWARE, type HardwareState } from './hardwareDefaults';
import { LAYER_IDS, defaultLayers, type LayerId, type LayerState } from './layers';
import type { BodyFeatureId } from '../geometry/bodyFeatures';

export interface EditorSettings {
  unit: Unit;
  theme: Theme;
  view: ViewMode;
  gridSize: number;
  gridSnapEnabled: boolean;
  showPointsAndHandles: boolean;
  /** Padding (mm) kept around the design's bounding box when fitting the canvas to the viewport. */
  canvasPadding: number;
}

const DEFAULT_SETTINGS: EditorSettings = {
  unit: 'mm',
  theme: 'dark',
  view: 'top',
  gridSize: 5,
  gridSnapEnabled: false,
  showPointsAndHandles: true,
  canvasPadding: 40,
};

/** Bump this whenever DesignDocument's shape changes in a way old files can't be read as-is. */
export const DESIGN_DOCUMENT_VERSION = 1;

/** Everything that should be saved to JSON / localStorage / undo history. */
export interface DesignDocument {
  version: number;
  bodyParams: BodyParams;
  bodyAnchors: BodyAnchor[];
  neckParams: NeckParams;
  hardware: HardwareState;
  settings: EditorSettings;
  layers: Record<LayerId, LayerState>;
}

function defaultDocument(): DesignDocument {
  return {
    version: DESIGN_DOCUMENT_VERSION,
    bodyParams: { ...DEFAULT_BODY_PARAMS },
    bodyAnchors: computeParametricAnchors(DEFAULT_BODY_PARAMS),
    neckParams: { ...DEFAULT_NECK_PARAMS },
    hardware: structuredClone(DEFAULT_HARDWARE),
    settings: { ...DEFAULT_SETTINGS },
    layers: defaultLayers(),
  };
}

const HISTORY_LIMIT = 100;
const AUTOSAVE_KEY = 'guitar-designer-autosave-v1';

interface HistoryEntry {
  bodyParams: BodyParams;
  bodyAnchors: BodyAnchor[];
  neckParams: NeckParams;
  hardware: HardwareState;
}

function snapshotOf(doc: DesignDocument): HistoryEntry {
  return {
    bodyParams: { ...doc.bodyParams },
    bodyAnchors: structuredClone(doc.bodyAnchors),
    neckParams: { ...doc.neckParams },
    hardware: structuredClone(doc.hardware),
  };
}

export type SelectedPoint =
  | { kind: 'anchor'; id: BodyAnchorId; part: 'position' | 'handleIn' | 'handleOut' }
  | { kind: 'hardware'; name: keyof HardwareState; index?: number }
  | { kind: 'feature'; id: BodyFeatureId }
  | null;

interface StoreState extends DesignDocument {
  past: HistoryEntry[];
  future: HistoryEntry[];
  selected: SelectedPoint;

  // --- body params ---
  setBodyParam: (key: keyof BodyParams, value: number) => void;

  // --- anchor editing ---
  moveAnchorPoint: (id: BodyAnchorId, part: 'position' | 'handleIn' | 'handleOut', point: Point) => void;
  moveFeatureAnchors: (anchorIds: BodyAnchorId[], dx: number, dy: number) => void;
  toggleMirrorHandles: (id: BodyAnchorId) => void;
  nudgeAnchorPoint: (id: BodyAnchorId, dx: number, dy: number) => void;
  toggleAnchorLock: (id: BodyAnchorId) => void;
  resetAnchorPoint: (id: BodyAnchorId) => void;
  select: (sel: SelectedPoint) => void;

  // --- neck params ---
  setNeckParam: (key: keyof NeckParams, value: number) => void;

  // --- hardware ---
  moveHardware: (name: keyof HardwareState, point: Point, index?: number) => void;
  toggleHardwareLock: (name: keyof HardwareState, index?: number) => void;
  toggleHardwareVisibility: (name: keyof HardwareState, index?: number) => void;

  // --- layers ---
  setLayerVisible: (id: LayerId, visible: boolean) => void;
  setLayerLocked: (id: LayerId, locked: boolean) => void;

  // --- settings ---
  setUnit: (unit: Unit) => void;
  setTheme: (theme: Theme) => void;
  setView: (view: ViewMode) => void;
  setGridSize: (size: number) => void;
  toggleGridSnap: () => void;
  toggleShowPoints: () => void;
  setCanvasPadding: (mm: number) => void;

  // --- history / persistence ---
  commitHistory: () => void;
  undo: () => void;
  redo: () => void;
  resetToDefaults: () => void;
  loadDocument: (doc: DesignDocument) => void;
  autosave: () => void;
}

function loadAutosave(): DesignDocument | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.bodyParams || !parsed.bodyAnchors) return null;
    // No migrations exist yet (schema has only ever been v1); a mismatched
    // version means it's from a future/incompatible build, so fall back to
    // defaults instead of risking a corrupt render.
    if (parsed.version !== DESIGN_DOCUMENT_VERSION) return null;
    if (!parsed.layers) parsed.layers = defaultLayers();
    return parsed as DesignDocument;
  } catch {
    return null;
  }
}

export const useDesignStore = create<StoreState>((set, get) => ({
  ...(loadAutosave() ?? defaultDocument()),
  past: [],
  future: [],
  selected: null,

  setBodyParam: (key, value) => {
    const before = snapshotOf(get());
    const bodyParams = { ...get().bodyParams, [key]: value };
    const bodyAnchors = recomputeAnchorsPreservingEdits(bodyParams, get().bodyAnchors);
    set({ bodyParams, bodyAnchors, past: pushPast(get().past, before), future: [] });
    get().autosave();
  },

  moveAnchorPoint: (id, part, point) => {
    const before = snapshotOf(get());
    const bodyAnchors = get().bodyAnchors.map((a) => {
      if (a.id !== id || a.locked) return a;
      if (part === 'position') {
        const dx = point.x - a.position.x;
        const dy = point.y - a.position.y;
        return {
          ...a,
          position: point,
          handleIn: { x: a.handleIn.x + dx, y: a.handleIn.y + dy },
          handleOut: { x: a.handleOut.x + dx, y: a.handleOut.y + dy },
          manuallyEdited: true,
        };
      }
      // Mirror-handle ("smooth point") behavior: moving one handle keeps the
      // opposite handle at the same distance on the exact opposite side of
      // the anchor, preserving tangent continuity through the curve.
      if (a.mirrorHandles) {
        const opposite = part === 'handleIn' ? 'handleOut' : 'handleIn';
        const mirrored = { x: 2 * a.position.x - point.x, y: 2 * a.position.y - point.y };
        return { ...a, [part]: point, [opposite]: mirrored, manuallyEdited: true };
      }
      return { ...a, [part]: point, manuallyEdited: true };
    });
    set({ bodyAnchors, past: pushPast(get().past, before), future: [] });
    get().autosave();
  },

  moveFeatureAnchors: (anchorIds, dx, dy) => {
    const before = snapshotOf(get());
    const idSet = new Set(anchorIds);
    const bodyAnchors = get().bodyAnchors.map((a) => {
      if (!idSet.has(a.id) || a.locked) return a;
      return {
        ...a,
        position: { x: a.position.x + dx, y: a.position.y + dy },
        handleIn: { x: a.handleIn.x + dx, y: a.handleIn.y + dy },
        handleOut: { x: a.handleOut.x + dx, y: a.handleOut.y + dy },
        manuallyEdited: true,
      };
    });
    set({ bodyAnchors, past: pushPast(get().past, before), future: [] });
    get().autosave();
  },

  toggleMirrorHandles: (id) => {
    const bodyAnchors = get().bodyAnchors.map((a) => (a.id === id ? { ...a, mirrorHandles: !a.mirrorHandles } : a));
    set({ bodyAnchors });
    get().autosave();
  },

  nudgeAnchorPoint: (id, dx, dy) => {
    const anchor = get().bodyAnchors.find((a) => a.id === id);
    if (!anchor || anchor.locked) return;
    get().moveAnchorPoint(id, 'position', { x: anchor.position.x + dx, y: anchor.position.y + dy });
  },

  toggleAnchorLock: (id) => {
    const bodyAnchors = get().bodyAnchors.map((a) => (a.id === id ? { ...a, locked: !a.locked } : a));
    set({ bodyAnchors });
    get().autosave();
  },

  resetAnchorPoint: (id) => {
    const before = snapshotOf(get());
    const bodyAnchors = resetAnchor(id, get().bodyParams, get().bodyAnchors);
    set({ bodyAnchors, past: pushPast(get().past, before), future: [] });
    get().autosave();
  },

  select: (sel) => set({ selected: sel }),

  setNeckParam: (key, value) => {
    const before = snapshotOf(get());
    const neckParams = { ...get().neckParams, [key]: value };
    set({ neckParams, past: pushPast(get().past, before), future: [] });
    get().autosave();
  },

  moveHardware: (name, point, index) => {
    const before = snapshotOf(get());
    const hardware = { ...get().hardware };
    if (name === 'saddles' || name === 'neckBolts') {
      const arr = [...hardware[name]];
      if (index !== undefined && !arr[index].locked) arr[index] = { ...arr[index], x: point.x, y: point.y };
      hardware[name] = arr;
    } else {
      const item = hardware[name] as HardwarePosition;
      if (!item.locked) hardware[name] = { ...item, x: point.x, y: point.y } as never;
    }
    set({ hardware, past: pushPast(get().past, before), future: [] });
    get().autosave();
  },

  toggleHardwareLock: (name, index) => {
    const hardware = { ...get().hardware };
    if (name === 'saddles' || name === 'neckBolts') {
      const arr = [...hardware[name]];
      if (index !== undefined) arr[index] = { ...arr[index], locked: !arr[index].locked };
      hardware[name] = arr;
    } else {
      const item = hardware[name] as HardwarePosition;
      hardware[name] = { ...item, locked: !item.locked } as never;
    }
    set({ hardware });
    get().autosave();
  },

  toggleHardwareVisibility: (name, index) => {
    const hardware = { ...get().hardware };
    if (name === 'saddles' || name === 'neckBolts') {
      const arr = [...hardware[name]];
      if (index !== undefined) arr[index] = { ...arr[index], visible: !arr[index].visible };
      hardware[name] = arr;
    } else {
      const item = hardware[name] as HardwarePosition;
      hardware[name] = { ...item, visible: !item.visible } as never;
    }
    set({ hardware });
    get().autosave();
  },

  setLayerVisible: (id, visible) => {
    set((s) => ({ layers: { ...s.layers, [id]: { ...s.layers[id], visible } } }));
    get().autosave();
  },
  setLayerLocked: (id, locked) => {
    set((s) => ({ layers: { ...s.layers, [id]: { ...s.layers[id], locked } } }));
    get().autosave();
  },

  setUnit: (unit) => set((s) => ({ settings: { ...s.settings, unit } })),
  setTheme: (theme) => set((s) => ({ settings: { ...s.settings, theme } })),
  setView: (view) => set((s) => ({ settings: { ...s.settings, view } })),
  setGridSize: (gridSize) => set((s) => ({ settings: { ...s.settings, gridSize } })),
  toggleGridSnap: () => set((s) => ({ settings: { ...s.settings, gridSnapEnabled: !s.settings.gridSnapEnabled } })),
  toggleShowPoints: () =>
    set((s) => ({ settings: { ...s.settings, showPointsAndHandles: !s.settings.showPointsAndHandles } })),
  setCanvasPadding: (mm) => set((s) => ({ settings: { ...s.settings, canvasPadding: mm } })),

  commitHistory: () => {
    // No-op hook kept for callers that want an explicit "checkpoint now"
    // (e.g. end of a drag gesture) without duplicating snapshot logic.
  },

  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const currentSnap = snapshotOf(get());
    set({
      ...previous,
      past: past.slice(0, -1),
      future: [currentSnap, ...future].slice(0, HISTORY_LIMIT),
    });
    get().autosave();
  },

  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return;
    const next = future[0];
    const currentSnap = snapshotOf(get());
    set({
      ...next,
      past: pushPast(past, currentSnap),
      future: future.slice(1),
    });
    get().autosave();
  },

  resetToDefaults: () => {
    const before = snapshotOf(get());
    const doc = defaultDocument();
    set({ ...doc, past: pushPast(get().past, before), future: [] });
    get().autosave();
  },

  loadDocument: (doc) => {
    const withLayers = {
      ...doc,
      layers: doc.layers ?? defaultLayers(),
      version: doc.version ?? DESIGN_DOCUMENT_VERSION,
    };
    set({ ...withLayers, past: [], future: [] });
    get().autosave();
  },

  autosave: () => {
    const s = get();
    const doc: DesignDocument = {
      version: s.version,
      bodyParams: s.bodyParams,
      bodyAnchors: s.bodyAnchors,
      neckParams: s.neckParams,
      hardware: s.hardware,
      settings: s.settings,
      layers: s.layers,
    };
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(doc));
    } catch {
      // storage unavailable (e.g. private mode quota) — safe to ignore for MVP
    }
  },
}));

function pushPast(past: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  return [...past, entry].slice(-HISTORY_LIMIT);
}

export { LAYER_IDS };
