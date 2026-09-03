// Central Zustand store. This is the single source of truth for the entire
// design: active template id + its params + persisted anchor geometry, neck
// params, hardware layout, layer visibility/lock, view/unit/theme prefs, and
// undo/redo history.
//
// IMPORTANT product rule: controls never regenerate the design from scratch.
// Body anchors are persisted state (`bodyAnchors`); changing a body param
// recomputes only the anchors the user hasn't manually overridden
// (see geometry/bodyModel.ts). Dragging an anchor sets `manuallyEdited` so
// future param changes leave it alone until the user resets it. Switching
// templates is the one deliberate exception — it fully replaces the body
// (params, anchors, hardware), since a different template has a different
// anchor topology entirely; callers are expected to confirm with the user
// first if there are unsaved manual edits (see `isBodyDirty`).
//
// NOTE on what's deliberately NOT here: pan/zoom (camera) state lives in the
// `useViewport` hook, not in this store — it's transient view/interaction
// state, not part of the persisted design, and must never enter undo/redo.

import { create } from 'zustand';
import type { BodyAnchor, BodyAnchorId, HardwarePosition, Point, Theme, Unit, ViewMode } from '../geometry/types';
import {
  computeParametricAnchors,
  recomputeAnchorsPreservingEdits,
  resetAnchor,
  resetFeature,
} from '../geometry/bodyModel';
import { getBodyTemplate, TELE_TEMPLATE } from '../geometry/templates';
import type { NeckParams } from '../geometry/neckParams';
import type { HardwareState } from './hardwareDefaults';
import { LAYER_IDS, defaultLayers, type LayerId, type LayerState } from './layers';
import type { BodyFeatureId } from '../geometry/bodyFeatures';
import {
  DEFAULT_BRIDGE_SETTINGS,
  DEFAULT_NUT_SETTINGS,
  MAX_STRING_COUNT,
  MIN_STRING_COUNT,
  bridgeTypeMeta,
  suggestedBridgeSpacing,
  suggestedNutSpacing,
  type BridgeSettings,
  type BridgeType,
  type NutSettings,
  type NutType,
} from '../geometry/bridgeTypes';
import {
  DEFAULT_HEADSTOCK_SETTINGS,
  headstockTypeMeta,
  seedHeadstockAnchors,
  syncHeadstockNutCorners,
  isHeadstockDirty,
  insertHeadstockAnchorAfter,
  removeHeadstockAnchorById,
  layoutTunersAsHardware,
  NUT_BASS_ID,
  type HeadstockSettings,
  type HeadstockType,
  type HeadstockAnchor,
  type TunerLayout,
} from '../geometry/headstock';
import { bodyToNeckSpace, neckToBodySpace } from '../geometry/neckPlacement';
import {
  DEFAULT_CONTROL_SETTINGS,
  DEFAULT_PICKUP_SETTINGS,
  PICKUP_SLOTS,
  defaultPickupPositions,
  defaultSelectorPosition,
  layoutControlKnobs,
  type ControlSettings,
  type PickupSettings,
  type PickupSlot,
  type PickupSlotValue,
} from '../geometry/pickups';
import {
  layoutSaddlesFromScale,
  layoutNeckBolts,
  isScaleLockNeckKey,
  isNeckBoltLayoutKey,
  neckJoinPoint,
} from '../geometry/scaleLock';
import { translateHardware, relayoutHardwareToScale } from './scaleLockSync';
import { migrateDesignDocument, DESIGN_DOCUMENT_VERSION } from '../export/migrateDocument';
import { editOutlineWithSymmetry } from '../geometry/symmetricEdit';
import type { ReferenceOverlaysDocument } from './referenceOverlay';
import { DEFAULT_BODY_COLOR, DEFAULT_FRETBOARD_COLOR, DEFAULT_HEADSTOCK_COLOR } from '../geometry/color';

export { DESIGN_DOCUMENT_VERSION };

export interface EditorSettings {
  unit: Unit;
  theme: Theme;
  view: ViewMode;
  gridSize: number;
  gridSnapEnabled: boolean;
  showPointsAndHandles: boolean;
  /** Debug overlay: anchor names, feature ownership, tangent vectors, continuity mode. */
  showDebugOverlay: boolean;
  /** Padding (mm) kept around the design's bounding box when fitting the canvas to the viewport. */
  canvasPadding: number;
  /** Top-view body fill (CSS hex). */
  bodyColor: string;
  /** Fretboard fill (CSS hex). */
  fretboardColor: string;
  /** Headstock fill (CSS hex). */
  headstockColor: string;
  /** Body fill opacity (0–1). Useful when tracing over a reference image. */
  bodyOpacity: number;
  /** Neck fill opacity (0–1). Useful when tracing over a reference image. */
  neckOpacity: number;
  /** Headstock fill opacity (0–1). Useful when tracing over a reference image. */
  headstockOpacity: number;
  /**
   * When true, dragging a body/headstock outline point or handle also moves
   * its mirror across the string centerline (y = 0).
   */
  symmetricEditing: boolean;
}

export {
  DEFAULT_BODY_COLOR,
  DEFAULT_FRETBOARD_COLOR,
  DEFAULT_HEADSTOCK_COLOR,
} from '../geometry/color';
export const DEFAULT_BODY_OPACITY = 1;
export const DEFAULT_NECK_OPACITY = 1;
export const DEFAULT_HEADSTOCK_OPACITY = 1;

const DEFAULT_SETTINGS: EditorSettings = {
  unit: 'mm',
  theme: 'dark',
  view: 'top',
  gridSize: 5,
  gridSnapEnabled: false,
  showPointsAndHandles: true,
  showDebugOverlay: false,
  canvasPadding: 40,
  bodyColor: DEFAULT_BODY_COLOR,
  fretboardColor: DEFAULT_FRETBOARD_COLOR,
  headstockColor: DEFAULT_HEADSTOCK_COLOR,
  bodyOpacity: DEFAULT_BODY_OPACITY,
  neckOpacity: DEFAULT_NECK_OPACITY,
  headstockOpacity: DEFAULT_HEADSTOCK_OPACITY,
  symmetricEditing: true,
};

/** Bump this whenever DesignDocument's shape changes in a way old files can't be read as-is. */
// DESIGN_DOCUMENT_VERSION is defined in export/migrateDocument.ts and re-exported above.

/** Everything that should be saved to JSON / localStorage / undo history. */
export interface DesignDocument {
  version: number;
  templateId: string;
  bodyParams: Record<string, number>;
  bodyAnchors: BodyAnchor[];
  neckParams: NeckParams;
  hardware: HardwareState;
  bridgeSettings: BridgeSettings;
  nutSettings: NutSettings;
  headstockSettings: HeadstockSettings;
  /** Editable headstock outline (neck-local). Empty when headless. */
  headstockAnchors: HeadstockAnchor[];
  pickupSettings: PickupSettings;
  controlSettings: ControlSettings;
  settings: EditorSettings;
  layers: Record<LayerId, LayerState>;
  /**
   * Reference overlays with optional base64 images. Present in saved JSON files;
   * runtime editing lives in ReferenceOverlayContext (not kept in Zustand/autosave
   * to avoid localStorage quota blowups).
   */
  referenceOverlays?: ReferenceOverlaysDocument;
}

function defaultDocument(): DesignDocument {
  const template = TELE_TEMPLATE;
  const neckParams = { ...template.defaultNeckParams };
  const headType = template.presets?.headstockType ?? DEFAULT_HEADSTOCK_SETTINGS.type;
  const headMeta = headstockTypeMeta(headType);
  const headstockSettings: HeadstockSettings = {
    ...DEFAULT_HEADSTOCK_SETTINGS,
    type: headType,
    tunerLayout: headMeta.defaultTunerLayout,
    tunerTipClearance: headMeta.defaultTipClearance,
    tunerNutClearance: headMeta.defaultNutClearance,
    ...headMeta.defaultDims,
    ...template.presets?.headstock,
  };
  const bodyAnchors = computeParametricAnchors(template, template.defaultParams);
  const headstockAnchors = seedHeadstockAnchors(
    neckParams,
    headstockSettings,
    DEFAULT_BRIDGE_SETTINGS.stringCount,
  );
  const hardware = structuredClone(template.defaultHardware);
  const joinPoint = neckJoinPoint(bodyAnchors, neckParams);
  hardware.tuners = layoutTunersAsHardware(
    neckParams,
    headstockSettings,
    { joinPoint },
    hardware.saddles,
    DEFAULT_BRIDGE_SETTINGS.stringCount,
    headstockAnchors,
    hardware.tuners,
  );
  return {
    version: DESIGN_DOCUMENT_VERSION,
    templateId: template.id,
    bodyParams: { ...template.defaultParams },
    bodyAnchors,
    neckParams,
    hardware,
    bridgeSettings: { ...DEFAULT_BRIDGE_SETTINGS },
    nutSettings: { ...DEFAULT_NUT_SETTINGS },
    headstockSettings,
    headstockAnchors,
    pickupSettings: { ...(template.presets?.pickups ?? DEFAULT_PICKUP_SETTINGS) },
    controlSettings: { ...DEFAULT_CONTROL_SETTINGS, ...template.presets?.controls },
    settings: { ...DEFAULT_SETTINGS },
    layers: defaultLayers(),
  };
}

/** Relayout unlocked tuner pegs from the current headstock outline / settings. */
function withRelayoutTuners(
  hardware: HardwareState,
  neckParams: NeckParams,
  headstockSettings: HeadstockSettings,
  headstockAnchors: HeadstockAnchor[],
  bodyAnchors: BodyAnchor[],
  stringCount: number,
): HardwareState {
  const joinPoint = neckJoinPoint(bodyAnchors, neckParams);
  return {
    ...hardware,
    tuners: layoutTunersAsHardware(
      neckParams,
      headstockSettings,
      { joinPoint },
      hardware.saddles,
      stringCount,
      headstockAnchors,
      hardware.tuners,
    ),
  };
}

const HISTORY_LIMIT = 100;
const AUTOSAVE_KEY = 'guitloft-autosave-v12';
const LEGACY_AUTOSAVE_KEY = 'fretforge-autosave-v12';

interface HistoryEntry {
  templateId: string;
  bodyParams: Record<string, number>;
  bodyAnchors: BodyAnchor[];
  neckParams: NeckParams;
  hardware: HardwareState;
  bridgeSettings: BridgeSettings;
  nutSettings: NutSettings;
  headstockSettings: HeadstockSettings;
  headstockAnchors: HeadstockAnchor[];
  pickupSettings: PickupSettings;
  controlSettings: ControlSettings;
}

function snapshotOf(doc: DesignDocument): HistoryEntry {
  return {
    templateId: doc.templateId,
    bodyParams: { ...doc.bodyParams },
    bodyAnchors: structuredClone(doc.bodyAnchors),
    neckParams: { ...doc.neckParams },
    hardware: structuredClone(doc.hardware),
    bridgeSettings: { ...doc.bridgeSettings },
    nutSettings: { ...doc.nutSettings },
    headstockSettings: { ...doc.headstockSettings },
    headstockAnchors: structuredClone(doc.headstockAnchors),
    pickupSettings: { ...doc.pickupSettings },
    controlSettings: { ...doc.controlSettings },
  };
}

export type SelectedPoint =
  | { kind: 'anchor'; id: BodyAnchorId; part: 'position' | 'handleIn' | 'handleOut' }
  | { kind: 'headstock'; id: string; part: 'position' | 'handleIn' | 'handleOut' }
  | { kind: 'hardware'; name: keyof HardwareState; index?: number }
  | { kind: 'feature'; id: BodyFeatureId }
  | { kind: 'reference'; id: string }
  | null;

interface StoreState extends DesignDocument {
  past: HistoryEntry[];
  future: HistoryEntry[];
  selected: SelectedPoint;

  // --- template ---
  /** True if any body anchor has been manually dragged/edited — callers should confirm with the user before switching templates. */
  isBodyDirty: () => boolean;
  setTemplate: (templateId: string) => void;
  resetBodyToTemplate: () => void;
  resetFeature: (featureId: BodyFeatureId) => void;

  // --- body params ---
  setBodyParam: (key: string, value: number) => void;

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

  // --- bridge / nut ---
  setBridgeType: (type: BridgeType) => void;
  setBridgeSetting: <K extends keyof BridgeSettings>(key: K, value: BridgeSettings[K]) => void;
  /** Change string count (6–12); relayouts saddles and suggests nut/bridge spacing. */
  setStringCount: (count: number) => void;
  setNutType: (type: NutType) => void;
  setNutSetting: <K extends keyof NutSettings>(key: K, value: NutSettings[K]) => void;
  /** Convenience: toggle the strings layer visibility. */
  setShowStrings: (visible: boolean) => void;

  // --- headstock / tuners ---
  setHeadstockType: (type: HeadstockType) => void;
  setHeadstockSetting: <K extends keyof HeadstockSettings>(key: K, value: HeadstockSettings[K]) => void;
  setTunerLayout: (layout: TunerLayout) => void;
  resetHeadstockShape: () => void;
  /** Unlock all tuners and snap them back to auto layout along the outline. */
  resetTunerPositions: () => void;
  moveHeadstockAnchor: (id: string, part: 'position' | 'handleIn' | 'handleOut', bodyPoint: Point) => void;
  nudgeHeadstockAnchor: (id: string, dx: number, dy: number) => void;
  /** Insert a free outline point after the given (or selected) headstock anchor. */
  insertHeadstockAnchor: (afterId?: string) => void;
  /** Remove a free outline point by id (or the current selection). */
  removeHeadstockAnchor: (id?: string) => void;

  // --- pickups / controls ---
  setPickupType: (slot: PickupSlot, type: PickupSlotValue) => void;
  setControlSetting: <K extends keyof ControlSettings>(key: K, value: ControlSettings[K]) => void;

  // --- hardware ---
  moveHardware: (name: keyof HardwareState, point: Point, index?: number) => void;
  rotateHardware: (name: keyof HardwareState, rotation: number, index?: number) => void;
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
  setBodyColor: (color: string) => void;
  setFretboardColor: (color: string) => void;
  setHeadstockColor: (color: string) => void;
  setBodyOpacity: (opacity: number) => void;
  setNeckOpacity: (opacity: number) => void;
  setHeadstockOpacity: (opacity: number) => void;
  toggleGridSnap: () => void;
  toggleShowPoints: () => void;
  toggleSymmetricEditing: () => void;
  toggleDebugOverlay: () => void;
  setCanvasPadding: (mm: number) => void;

  // --- history / persistence ---
  /** Snapshot current design once; subsequent mutations until endHistoryGesture share that undo step. */
  beginHistoryGesture: () => void;
  endHistoryGesture: () => void;
  commitHistory: () => void;
  undo: () => void;
  redo: () => void;
  resetToDefaults: () => void;
  loadDocument: (doc: DesignDocument) => void;
  autosave: () => void;
}

function loadAutosave(): DesignDocument | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY) ?? localStorage.getItem(LEGACY_AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.bodyParams || !parsed.bodyAnchors || !parsed.templateId) return null;
    const migrated = migrateDesignDocument(parsed);
    return migrated as unknown as DesignDocument;
  } catch {
    return null;
  }
}

export const useDesignStore = create<StoreState>((set, get) => ({
  ...(loadAutosave() ?? defaultDocument()),
  past: [],
  future: [],
  selected: null,

  isBodyDirty: () => get().bodyAnchors.some((a) => a.manuallyEdited),

  setTemplate: (templateId) => {
    const before = snapshotOf(get());
    const template = getBodyTemplate(templateId);
    const currentNeck = get().neckParams;
    // Preserve shared neck settings the user already dialed in; reset only
    // template-specific body geometry + hardware placement.
    const neckParams: NeckParams = {
      ...template.defaultNeckParams,
      bassScale: currentNeck.bassScale,
      trebleScale: currentNeck.trebleScale,
      fretCount: currentNeck.fretCount,
      nutWidth: currentNeck.nutWidth,
      neutralFret: currentNeck.neutralFret,
    };
    const bodyAnchors = computeParametricAnchors(template, template.defaultParams);
    const presets = template.presets ?? {};
    const stringCount = get().bridgeSettings.stringCount ?? 6;

    // Family presets: electronics + bridge + headstock. Multi-string designs
    // keep their spacing; only 6-string snaps to the bridge type's default.
    const pickupSettings: PickupSettings = presets.pickups ? { ...presets.pickups } : get().pickupSettings;
    const controlSettings: ControlSettings = presets.controls
      ? { ...get().controlSettings, ...presets.controls }
      : get().controlSettings;
    let bridgeSettings: BridgeSettings = get().bridgeSettings;
    if (presets.bridgeType && presets.bridgeType !== bridgeSettings.type) {
      bridgeSettings = {
        ...bridgeSettings,
        type: presets.bridgeType,
        stringSpacing:
          stringCount === 6 ? bridgeTypeMeta(presets.bridgeType).defaultSpacing : bridgeSettings.stringSpacing,
      };
    }
    let headstockSettings: HeadstockSettings = get().headstockSettings;
    let headstockAnchors: HeadstockAnchor[] = syncHeadstockNutCorners(get().headstockAnchors, neckParams);
    const typeChanges = presets.headstockType !== undefined && presets.headstockType !== headstockSettings.type;
    if (typeChanges || !isHeadstockDirty(headstockAnchors)) {
      // Apply the family's head type + dimensions; a hand-sculpted outline is
      // kept unless the type itself changes.
      if (typeChanges) {
        const meta = headstockTypeMeta(presets.headstockType!);
        headstockSettings = {
          ...headstockSettings,
          type: presets.headstockType!,
          tunerLayout: meta.defaultTunerLayout,
          tunerTipClearance: meta.defaultTipClearance,
          tunerNutClearance: meta.defaultNutClearance,
          ...meta.defaultDims,
        };
      }
      if (presets.headstock) headstockSettings = { ...headstockSettings, ...presets.headstock };
      headstockAnchors = seedHeadstockAnchors(neckParams, headstockSettings, stringCount);
    }

    let hardware = relayoutHardwareToScale(
      structuredClone(template.defaultHardware),
      neckParams,
      bridgeSettings,
      neckJoinPoint(bodyAnchors, neckParams),
    );
    hardware = withRelayoutTuners(
      { ...hardware, tuners: [] },
      neckParams,
      headstockSettings,
      headstockAnchors,
      bodyAnchors,
      stringCount,
    );
    set({
      templateId: template.id,
      bodyParams: { ...template.defaultParams },
      bodyAnchors,
      neckParams,
      hardware,
      pickupSettings,
      controlSettings,
      bridgeSettings,
      headstockSettings,
      headstockAnchors,
      selected: null,
      past: pushPast(get().past, before),
      future: [],
    });
    get().autosave();
  },

  resetBodyToTemplate: () => {
    const before = snapshotOf(get());
    const template = getBodyTemplate(get().templateId);
    const oldJoinX = neckJoinPoint(get().bodyAnchors, get().neckParams).x;
    const bodyAnchors = computeParametricAnchors(template, template.defaultParams);
    const dx = neckJoinPoint(bodyAnchors, get().neckParams).x - oldJoinX;
    const hardware = translateHardware(get().hardware, dx, 0);
    set({
      bodyParams: { ...template.defaultParams },
      bodyAnchors,
      hardware,
      past: pushPast(get().past, before),
      future: [],
    });
    get().autosave();
  },

  resetFeature: (featureId) => {
    const before = snapshotOf(get());
    const template = getBodyTemplate(get().templateId);
    const oldJoinX = neckJoinPoint(get().bodyAnchors, get().neckParams).x;
    const bodyAnchors = resetFeature(featureId, template, get().bodyParams, get().bodyAnchors);
    const dx = neckJoinPoint(bodyAnchors, get().neckParams).x - oldJoinX;
    const hardware = dx !== 0 ? translateHardware(get().hardware, dx, 0) : get().hardware;
    set({ bodyAnchors, hardware, past: pushPast(get().past, before), future: [] });
    get().autosave();
  },

  setBodyParam: (key, value) => {
    const hist = historyForMutation(get);
    const template = getBodyTemplate(get().templateId);
    const bodyParams = { ...get().bodyParams, [key]: value };
    const oldJoinX = neckJoinPoint(get().bodyAnchors, get().neckParams).x;
    const bodyAnchors = recomputeAnchorsPreservingEdits(template, bodyParams, get().bodyAnchors);
    const dx = neckJoinPoint(bodyAnchors, get().neckParams).x - oldJoinX;
    const hardware = dx !== 0 ? translateHardware(get().hardware, dx, 0) : get().hardware;
    // Lowering anchorCount can remove the currently selected anchor.
    const sel = get().selected;
    const selected = sel?.kind === 'anchor' && !bodyAnchors.some((a) => a.id === sel.id) ? null : sel;
    set(hist ? { bodyParams, bodyAnchors, hardware, selected, ...hist } : { bodyParams, bodyAnchors, hardware, selected });
    get().autosave();
  },

  moveAnchorPoint: (id, part, point) => {
    const hist = historyForMutation(get);
    const prevJointX = neckJoinPoint(get().bodyAnchors, get().neckParams).x;
    const bodyAnchors = editOutlineWithSymmetry(
      get().bodyAnchors,
      id,
      part,
      point,
      get().settings.symmetricEditing,
    );
    // Neck joint x drives heel placement — keep bridge/nut assembly locked to scale
    // by translating hardware with the joint (y only reshapes the body pocket).
    let hardware = get().hardware;
    if (id === 'neckJoint' && part === 'position') {
      const dx = neckJoinPoint(bodyAnchors, get().neckParams).x - prevJointX;
      if (dx !== 0) hardware = translateHardware(hardware, dx, 0);
    }
    set(hist ? { bodyAnchors, hardware, ...hist } : { bodyAnchors, hardware });
    get().autosave();
  },

  moveFeatureAnchors: (anchorIds, dx, dy) => {
    const hist = historyForMutation(get);
    const idSet = new Set(anchorIds);
    const movesJoint = idSet.has('neckJoint');
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
    const hardware = movesJoint ? translateHardware(get().hardware, dx, 0) : get().hardware;
    set(hist ? { bodyAnchors, hardware, ...hist } : { bodyAnchors, hardware });
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
    const template = getBodyTemplate(get().templateId);
    const oldJoinX = neckJoinPoint(get().bodyAnchors, get().neckParams).x;
    const bodyAnchors = resetAnchor(id, template, get().bodyParams, get().bodyAnchors);
    const dx = id === 'neckJoint' ? neckJoinPoint(bodyAnchors, get().neckParams).x - oldJoinX : 0;
    const hardware = dx !== 0 ? translateHardware(get().hardware, dx, 0) : get().hardware;
    set({ bodyAnchors, hardware, past: pushPast(get().past, before), future: [] });
    get().autosave();
  },

  select: (sel) => set({ selected: sel }),

  setNeckParam: (key, value) => {
    const hist = historyForMutation(get);
    const neckParams = { ...get().neckParams, [key]: value };
    let hardware = get().hardware;
    if (isScaleLockNeckKey(key)) {
      // Note: the NEW neck params — neckInset/neckAngle move the heel itself.
      const newJoin = neckJoinPoint(get().bodyAnchors, neckParams);
      hardware = relayoutHardwareToScale(hardware, neckParams, get().bridgeSettings, newJoin);
      // Bolts live in neck space — relayout so they stay on the heel centerline
      // and rotate with neckAngle (a plain translate can't do that).
      if (isNeckBoltLayoutKey(key)) {
        hardware = {
          ...hardware,
          neckBolts: layoutNeckBolts(neckParams, { joinPoint: newJoin }, {
            prior: hardware.neckBolts,
          }),
        };
      }
    }
    const headstockAnchors = syncHeadstockNutCorners(get().headstockAnchors, neckParams);
    set(
      hist
        ? { neckParams, hardware, headstockAnchors, ...hist }
        : { neckParams, hardware, headstockAnchors },
    );
    get().autosave();
  },

  setBridgeType: (type) => {
    const before = snapshotOf(get());
    const meta = bridgeTypeMeta(type);
    const count = get().bridgeSettings.stringCount ?? 6;
    const bridgeSettings: BridgeSettings = {
      ...get().bridgeSettings,
      type,
      // Keep multi-string outer spacing; only snap to type default for 6-string.
      stringSpacing: count === 6 ? meta.defaultSpacing : get().bridgeSettings.stringSpacing,
    };
    const saddles = layoutSaddlesFromScale(
      get().neckParams,
      bridgeSettings,
      { joinPoint: neckJoinPoint(get().bodyAnchors, get().neckParams) },
      get().hardware.saddles,
    );
    // Floyd locking nut pairs naturally with a locking nut type.
    const nutSettings =
      type === 'floyd-rose' && get().nutSettings.type === 'standard'
        ? { ...get().nutSettings, type: 'locking' as const }
        : get().nutSettings;
    set({
      bridgeSettings,
      nutSettings,
      hardware: { ...get().hardware, saddles },
      past: pushPast(get().past, before),
      future: [],
    });
    get().autosave();
  },

  setBridgeSetting: (key, value) => {
    const hist = historyForMutation(get);
    const bridgeSettings = { ...get().bridgeSettings, [key]: value };
    let hardware = get().hardware;
    if (key === 'stringSpacing' || key === 'stringCount') {
      hardware = {
        ...hardware,
        saddles: layoutSaddlesFromScale(
          get().neckParams,
          bridgeSettings,
          { joinPoint: neckJoinPoint(get().bodyAnchors, get().neckParams) },
          hardware.saddles,
        ),
      };
    }
    set(hist ? { bridgeSettings, hardware, ...hist } : { bridgeSettings, hardware });
    get().autosave();
  },

  setNutType: (type) => {
    const before = snapshotOf(get());
    set({
      nutSettings: { ...get().nutSettings, type },
      past: pushPast(get().past, before),
      future: [],
    });
    get().autosave();
  },

  setNutSetting: (key, value) => {
    const hist = historyForMutation(get);
    const nutSettings = { ...get().nutSettings, [key]: value };
    set(hist ? { nutSettings, ...hist } : { nutSettings });
    get().autosave();
  },

  setStringCount: (count) => {
    const before = snapshotOf(get());
    const stringCount = Math.min(MAX_STRING_COUNT, Math.max(MIN_STRING_COUNT, Math.round(count)));
    const bridgeSettings: BridgeSettings = {
      ...get().bridgeSettings,
      stringCount,
      stringSpacing: suggestedBridgeSpacing(stringCount),
    };
    const nutSettings: NutSettings = {
      ...get().nutSettings,
      stringSpacing: suggestedNutSpacing(stringCount),
    };
    // Wider nut for multi-string so slots still sit inside the board.
    const neckParams: NeckParams = {
      ...get().neckParams,
      nutWidth: Math.max(get().neckParams.nutWidth, Math.round(nutSettings.stringSpacing + 8)),
      heelWidth: Math.max(get().neckParams.heelWidth, Math.round(bridgeSettings.stringSpacing + 4)),
    };
    const saddles = layoutSaddlesFromScale(
      neckParams,
      bridgeSettings,
      { joinPoint: neckJoinPoint(get().bodyAnchors, neckParams) },
      // Don't reuse prior saddles when the count changes — rebuild cleanly.
      undefined,
    );
    let headstockAnchors = syncHeadstockNutCorners(get().headstockAnchors, neckParams);
    if (!isHeadstockDirty(headstockAnchors)) {
      headstockAnchors = seedHeadstockAnchors(neckParams, get().headstockSettings, stringCount);
    }
    const hardware = withRelayoutTuners(
      { ...get().hardware, saddles, tuners: [] },
      neckParams,
      get().headstockSettings,
      headstockAnchors,
      get().bodyAnchors,
      stringCount,
    );
    set({
      bridgeSettings,
      nutSettings,
      neckParams,
      hardware,
      headstockAnchors,
      past: pushPast(get().past, before),
      future: [],
    });
    get().autosave();
  },

  setShowStrings: (visible) => {
    set((s) => ({ layers: { ...s.layers, strings: { ...s.layers.strings, visible } } }));
    get().autosave();
  },

  setHeadstockType: (type) => {
    const before = snapshotOf(get());
    const meta = headstockTypeMeta(type);
    const headstockSettings: HeadstockSettings = {
      ...get().headstockSettings,
      type,
      tunerLayout: meta.defaultTunerLayout,
      tunerTipClearance: meta.defaultTipClearance,
      tunerNutClearance: meta.defaultNutClearance,
      ...meta.defaultDims,
    };
    const headstockAnchors = seedHeadstockAnchors(
      get().neckParams,
      headstockSettings,
      get().bridgeSettings.stringCount ?? 6,
    );
    const hardware = withRelayoutTuners(
      { ...get().hardware, tuners: [] },
      get().neckParams,
      headstockSettings,
      headstockAnchors,
      get().bodyAnchors,
      get().bridgeSettings.stringCount ?? 6,
    );
    set({ headstockSettings, headstockAnchors, hardware, past: pushPast(get().past, before), future: [] });
    get().autosave();
  },

  setHeadstockSetting: (key, value) => {
    const hist = historyForMutation(get);
    const headstockSettings = { ...get().headstockSettings, [key]: value };
    let headstockAnchors = get().headstockAnchors;
    // Dimensional knobs re-seed unless the user has already sculpted the outline.
    if ((key === 'length' || key === 'tipWidth' || key === 'earWidth') && !isHeadstockDirty(headstockAnchors)) {
      headstockAnchors = seedHeadstockAnchors(
        get().neckParams,
        headstockSettings,
        get().bridgeSettings.stringCount ?? 6,
      );
    }
    const hardware = withRelayoutTuners(
      get().hardware,
      get().neckParams,
      headstockSettings,
      headstockAnchors,
      get().bodyAnchors,
      get().bridgeSettings.stringCount ?? 6,
    );
    set(hist ? { headstockSettings, headstockAnchors, hardware, ...hist } : { headstockSettings, headstockAnchors, hardware });
    get().autosave();
  },

  setTunerLayout: (layout) => {
    const before = snapshotOf(get());
    const headstockSettings = {
      ...get().headstockSettings,
      tunerLayout: layout,
      showTuners: layout !== 'none',
    };
    const hardware = withRelayoutTuners(
      { ...get().hardware, tuners: [] },
      get().neckParams,
      headstockSettings,
      get().headstockAnchors,
      get().bodyAnchors,
      get().bridgeSettings.stringCount ?? 6,
    );
    set({
      headstockSettings,
      hardware,
      past: pushPast(get().past, before),
      future: [],
    });
    get().autosave();
  },

  resetHeadstockShape: () => {
    const before = snapshotOf(get());
    const headstockAnchors = seedHeadstockAnchors(
      get().neckParams,
      get().headstockSettings,
      get().bridgeSettings.stringCount ?? 6,
    );
    const hardware = withRelayoutTuners(
      { ...get().hardware, tuners: [] },
      get().neckParams,
      get().headstockSettings,
      headstockAnchors,
      get().bodyAnchors,
      get().bridgeSettings.stringCount ?? 6,
    );
    set({ headstockAnchors, hardware, past: pushPast(get().past, before), future: [] });
    get().autosave();
  },

  resetTunerPositions: () => {
    const before = snapshotOf(get());
    const unlocked = (get().hardware.tuners ?? []).map((t) => ({ ...t, locked: false }));
    const hardware = withRelayoutTuners(
      { ...get().hardware, tuners: unlocked },
      get().neckParams,
      get().headstockSettings,
      get().headstockAnchors,
      get().bodyAnchors,
      get().bridgeSettings.stringCount ?? 6,
    );
    set({ hardware, past: pushPast(get().past, before), future: [] });
    get().autosave();
  },

  moveHeadstockAnchor: (id, part, bodyPoint) => {
    const hist = historyForMutation(get);
    const joinPoint = neckJoinPoint(get().bodyAnchors, get().neckParams);
    const localPoint = bodyToNeckSpace(bodyPoint, get().neckParams, { joinPoint });
    const headstockAnchors = editOutlineWithSymmetry(
      get().headstockAnchors,
      id,
      part,
      localPoint,
      get().settings.symmetricEditing,
    );
    const hardware = withRelayoutTuners(
      get().hardware,
      get().neckParams,
      get().headstockSettings,
      headstockAnchors,
      get().bodyAnchors,
      get().bridgeSettings.stringCount ?? 6,
    );
    set(hist ? { headstockAnchors, hardware, ...hist } : { headstockAnchors, hardware });
    get().autosave();
  },

  nudgeHeadstockAnchor: (id, dx, dy) => {
    const a = get().headstockAnchors.find((h) => h.id === id);
    if (!a || a.locked) return;
    const joinPoint = neckJoinPoint(get().bodyAnchors, get().neckParams);
    const bodyPos = neckToBodySpace(a.position, get().neckParams, { joinPoint });
    get().moveHeadstockAnchor(id, 'position', { x: bodyPos.x + dx, y: bodyPos.y + dy });
  },

  insertHeadstockAnchor: (afterId) => {
    if (get().headstockSettings.type === 'headless') return;
    const selected = get().selected;
    const id =
      afterId ??
      (selected?.kind === 'headstock' ? selected.id : NUT_BASS_ID);
    const before = snapshotOf(get());
    const prevIds = new Set(get().headstockAnchors.map((a) => a.id));
    const headstockAnchors = insertHeadstockAnchorAfter(get().headstockAnchors, id);
    const neu = headstockAnchors.find((a) => !prevIds.has(a.id));
    const hardware = withRelayoutTuners(
      get().hardware,
      get().neckParams,
      get().headstockSettings,
      headstockAnchors,
      get().bodyAnchors,
      get().bridgeSettings.stringCount ?? 6,
    );
    set({
      headstockAnchors,
      hardware,
      selected: neu ? { kind: 'headstock', id: neu.id, part: 'position' } : get().selected,
      past: pushPast(get().past, before),
      future: [],
    });
    get().autosave();
  },

  removeHeadstockAnchor: (id) => {
    const selected = get().selected;
    const target = id ?? (selected?.kind === 'headstock' ? selected.id : undefined);
    if (!target) return;
    const before = snapshotOf(get());
    const headstockAnchors = removeHeadstockAnchorById(get().headstockAnchors, target);
    if (headstockAnchors === get().headstockAnchors || headstockAnchors.length === get().headstockAnchors.length) {
      return;
    }
    const clearSel = selected?.kind === 'headstock' && selected.id === target;
    const hardware = withRelayoutTuners(
      get().hardware,
      get().neckParams,
      get().headstockSettings,
      headstockAnchors,
      get().bodyAnchors,
      get().bridgeSettings.stringCount ?? 6,
    );
    set({
      headstockAnchors,
      hardware,
      selected: clearSel ? null : selected,
      past: pushPast(get().past, before),
      future: [],
    });
    get().autosave();
  },

  setPickupType: (slot, type) => {
    const before = snapshotOf(get());
    const idx = PICKUP_SLOTS.indexOf(slot);
    const wasNone = get().pickupSettings[slot] === 'none';
    const pickupSettings: PickupSettings = { ...get().pickupSettings, [slot]: type };
    const pickups = [...get().hardware.pickups];
    const prev = pickups[idx];
    if (type === 'none') {
      pickups[idx] = { ...prev, visible: false };
    } else {
      // Re-seat the pickup at its slot default when it was previously empty,
      // so it doesn't reappear wherever it was last dragged for another config.
      const placement = { joinPoint: neckJoinPoint(get().bodyAnchors, get().neckParams) };
      const pos = wasNone ? defaultPickupPositions(get().neckParams, placement, pickupSettings)[idx] : prev;
      pickups[idx] = { ...prev, x: pos.x, y: pos.y, visible: true };
    }
    set({
      pickupSettings,
      hardware: { ...get().hardware, pickups },
      past: pushPast(get().past, before),
      future: [],
    });
    get().autosave();
  },

  setControlSetting: (key, value) => {
    const before = snapshotOf(get());
    const controlSettings: ControlSettings = { ...get().controlSettings, [key]: value };
    const placement = { joinPoint: neckJoinPoint(get().bodyAnchors, get().neckParams) };
    let hardware = get().hardware;
    if (key === 'volumes' || key === 'tones') {
      const controls = layoutControlKnobs(get().neckParams, placement, controlSettings, hardware.controls);
      hardware = { ...hardware, controls };
    } else if (key === 'selector') {
      const selectorType = value as ControlSettings['selector'];
      const prevType = get().controlSettings.selector;
      let selector = hardware.selector;
      if (selectorType === 'none') {
        selector = { ...selector, visible: false };
      } else {
        const family = (t: string) => (t === 'toggle' ? 'toggle' : 'blade');
        const reseat = prevType === 'none' || family(prevType) !== family(selectorType);
        if (reseat) {
          const def = defaultSelectorPosition(selectorType, get().neckParams, placement);
          selector = { ...selector, x: def.position.x, y: def.position.y, rotation: def.rotation, visible: true };
        } else {
          selector = { ...selector, visible: true };
        }
      }
      hardware = { ...hardware, selector };
    }
    set({ controlSettings, hardware, past: pushPast(get().past, before), future: [] });
    get().autosave();
  },

  moveHardware: (name, point, index) => {
    const hist = historyForMutation(get);
    const hardware = { ...get().hardware };
    const field = hardware[name];
    if (Array.isArray(field)) {
      const arr = [...field];
      if (index !== undefined && arr[index]) {
        // Tuner "locked" means stay put on outline/inset changes — still draggable.
        if (name !== 'tuners' && arr[index].locked) {
          // no-op
        } else {
          // Pickups slide along the strings only — Y stays on the centerline.
          const y = name === 'pickups' ? arr[index].y : point.y;
          const locked = name === 'tuners' ? true : arr[index].locked;
          arr[index] = { ...arr[index], x: point.x, y, locked };
        }
      }
      hardware[name] = arr as never;
    } else {
      const item = field as HardwarePosition;
      if (!item.locked) hardware[name] = { ...item, x: point.x, y: point.y } as never;
    }
    set(hist ? { hardware, ...hist } : { hardware });
    get().autosave();
  },

  rotateHardware: (name, rotation, index) => {
    const before = snapshotOf(get());
    const hardware = { ...get().hardware };
    const field = hardware[name];
    // Normalize to (−180, 180] for tidy sidebar display.
    let deg = ((rotation % 360) + 360) % 360;
    if (deg > 180) deg -= 360;
    if (Array.isArray(field)) {
      const arr = [...field];
      if (index !== undefined && arr[index]) {
        if (name === 'tuners' || !arr[index].locked) {
          // Rotating a tuner also marks it as manual so outline sync won't overwrite.
          arr[index] = {
            ...arr[index],
            rotation: deg,
            locked: name === 'tuners' ? true : arr[index].locked,
          };
        }
      }
      hardware[name] = arr as never;
    } else {
      const item = field as HardwarePosition;
      if (!item.locked) hardware[name] = { ...item, rotation: deg } as never;
    }
    set({ hardware, past: pushPast(get().past, before), future: [] });
    get().autosave();
  },

  toggleHardwareLock: (name, index) => {
    const hardware = { ...get().hardware };
    const field = hardware[name];
    if (Array.isArray(field)) {
      const arr = [...field];
      if (index !== undefined && arr[index]) arr[index] = { ...arr[index], locked: !arr[index].locked };
      hardware[name] = arr as never;
    } else {
      const item = field as HardwarePosition;
      hardware[name] = { ...item, locked: !item.locked } as never;
    }
    // Unlocking a tuner snaps it back onto the auto layout.
    const next =
      name === 'tuners'
        ? withRelayoutTuners(
            hardware,
            get().neckParams,
            get().headstockSettings,
            get().headstockAnchors,
            get().bodyAnchors,
            get().bridgeSettings.stringCount ?? 6,
          )
        : hardware;
    set({ hardware: next });
    get().autosave();
  },

  toggleHardwareVisibility: (name, index) => {
    const hardware = { ...get().hardware };
    const field = hardware[name];
    if (Array.isArray(field)) {
      const arr = [...field];
      if (index !== undefined && arr[index]) arr[index] = { ...arr[index], visible: !arr[index].visible };
      hardware[name] = arr as never;
    } else {
      const item = field as HardwarePosition;
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
  setBodyColor: (bodyColor) => {
    set((s) => ({ settings: { ...s.settings, bodyColor } }));
    get().autosave();
  },
  setFretboardColor: (fretboardColor) => {
    set((s) => ({ settings: { ...s.settings, fretboardColor } }));
    get().autosave();
  },
  setHeadstockColor: (headstockColor) => {
    set((s) => ({ settings: { ...s.settings, headstockColor } }));
    get().autosave();
  },
  setBodyOpacity: (opacity) => {
    const bodyOpacity = Math.min(1, Math.max(0.05, opacity));
    set((s) => ({ settings: { ...s.settings, bodyOpacity } }));
    get().autosave();
  },
  setNeckOpacity: (opacity) => {
    const neckOpacity = Math.min(1, Math.max(0.05, opacity));
    set((s) => ({ settings: { ...s.settings, neckOpacity } }));
    get().autosave();
  },
  setHeadstockOpacity: (opacity) => {
    const headstockOpacity = Math.min(1, Math.max(0.05, opacity));
    set((s) => ({ settings: { ...s.settings, headstockOpacity } }));
    get().autosave();
  },
  toggleGridSnap: () => set((s) => ({ settings: { ...s.settings, gridSnapEnabled: !s.settings.gridSnapEnabled } })),
  toggleShowPoints: () =>
    set((s) => ({ settings: { ...s.settings, showPointsAndHandles: !s.settings.showPointsAndHandles } })),
  toggleSymmetricEditing: () =>
    set((s) => ({ settings: { ...s.settings, symmetricEditing: !s.settings.symmetricEditing } })),
  toggleDebugOverlay: () => set((s) => ({ settings: { ...s.settings, showDebugOverlay: !s.settings.showDebugOverlay } })),
  setCanvasPadding: (mm) => set((s) => ({ settings: { ...s.settings, canvasPadding: mm } })),

  beginHistoryGesture: () => {
    historyGestureActive = true;
    historyGestureBase = snapshotOf(get());
  },

  endHistoryGesture: () => {
    historyGestureActive = false;
    historyGestureBase = null;
  },

  commitHistory: () => {
    // Explicit checkpoint (same as beginning a one-shot gesture snapshot).
    set({ past: pushPast(get().past, snapshotOf(get())), future: [] });
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
    const migrated = migrateDesignDocument({ ...doc }) as unknown as DesignDocument;
    // Keep base64 overlays out of the Zustand snapshot / autosave.
    const { referenceOverlays: _overlays, ...rest } = migrated;
    set({ ...rest, past: [], future: [] });
    get().autosave();
  },

  autosave: () => {
    const s = get();
    const doc: DesignDocument = {
      version: s.version,
      templateId: s.templateId,
      bodyParams: s.bodyParams,
      bodyAnchors: s.bodyAnchors,
      neckParams: s.neckParams,
      hardware: s.hardware,
      bridgeSettings: s.bridgeSettings,
      nutSettings: s.nutSettings,
      headstockSettings: s.headstockSettings,
      headstockAnchors: s.headstockAnchors,
      pickupSettings: s.pickupSettings,
      controlSettings: s.controlSettings,
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

/**
 * Drag coalescing: beginHistoryGesture() freezes a pre-drag snapshot; the first
 * mutation during the gesture pushes that one undo step; further moves skip
 * history until endHistoryGesture(). Discrete edits (sliders, nudges, buttons)
 * leave the gesture inactive and push normally.
 */
let historyGestureBase: HistoryEntry | null = null;
let historyGestureActive = false;

/** Past/future patch for a mutation, or null when this mid-gesture move should not record. */
function historyForMutation(get: () => StoreState): { past: HistoryEntry[]; future: HistoryEntry[] } | null {
  if (historyGestureActive) {
    if (historyGestureBase) {
      const base = historyGestureBase;
      historyGestureBase = null;
      return { past: pushPast(get().past, base), future: [] };
    }
    return null;
  }
  return { past: pushPast(get().past, snapshotOf(get())), future: [] };
}

function pushPast(past: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  return [...past, entry].slice(-HISTORY_LIMIT);
}

export { LAYER_IDS };
