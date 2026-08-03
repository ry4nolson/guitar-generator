// Migrates older DesignDocument JSON shapes up to the current version.
// Kept separate from the store so load paths (autosave + file import) share one
// safe upgrade path without forking logic.

import {
  DEFAULT_BRIDGE_SETTINGS,
  DEFAULT_NUT_SETTINGS,
  type BridgeSettings,
  type NutSettings,
} from '../geometry/bridgeTypes';
import {
  DEFAULT_HEADSTOCK_SETTINGS,
  LEGACY_HEADLESS_SETTINGS,
  type HeadstockSettings,
} from '../geometry/headstock';
import {
  DEFAULT_CONTROL_SETTINGS,
  DEFAULT_PICKUP_SETTINGS,
  defaultPickupPositions,
  defaultSelectorPosition,
  type ControlSettings,
  type PickupSettings,
} from '../geometry/pickups';
import { layoutNeckBolts, layoutSaddlesFromScale, neckJoinPoint } from '../geometry/scaleLock';
import type { BodyAnchor, HardwarePosition } from '../geometry/types';
import type { NeckParams } from '../geometry/neckParams';
import { defaultLayers, type LayerId, type LayerState } from '../state/layers';

/** Current design-document schema version. Bump when the shape changes. */
export const DESIGN_DOCUMENT_VERSION = 8;

/** Pre-v6 hardware shape (single fixed pickup + volume knob). */
interface LegacyHardware {
  bridgeHumbucker?: HardwarePosition;
  volumeKnob?: HardwarePosition;
  pickups?: HardwarePosition[];
  controls?: HardwarePosition[];
  selector?: HardwarePosition;
  saddles?: HardwarePosition[];
  neckBolts?: HardwarePosition[];
}

export function migrateDesignDocument(parsed: Record<string, unknown>): Record<string, unknown> {
  let version = typeof parsed.version === 'number' ? parsed.version : 1;

  // v1 → v2 was a breaking topology change; refuse rather than guess.
  if (version < 2) {
    throw new Error(`Design format v${version} is no longer supported (pre-template topology).`);
  }

  const anchors = parsed.bodyAnchors as BodyAnchor[] | undefined;
  const neckParams = parsed.neckParams as NeckParams | undefined;

  // Docs saved before the neck-pocket inset existed placed the heel exactly at
  // the neckJoint anchor. Fill 0 (not the new default) so their layout is
  // untouched; new designs get the template default inset.
  if (neckParams && neckParams.neckInset === undefined) {
    neckParams.neckInset = 0;
  }

  // v2 → v3: add bridge/nut settings + strings layer.
  if (version === 2) {
    parsed.bridgeSettings = { ...DEFAULT_BRIDGE_SETTINGS, ...(parsed.bridgeSettings as BridgeSettings | undefined) };
    parsed.nutSettings = { ...DEFAULT_NUT_SETTINGS, ...(parsed.nutSettings as NutSettings | undefined) };
    const layers = (parsed.layers as Record<LayerId, LayerState> | undefined) ?? defaultLayers();
    if (!layers.strings) {
      layers.strings = { visible: false, locked: false };
    }
    parsed.layers = layers;
    version = 3;
    parsed.version = 3;
  }

  // v3 → v4: snap bridge saddles to nut + scale length(s) at the neck joint.
  if (version === 3) {
    const bridgeSettings = (parsed.bridgeSettings as BridgeSettings | undefined) ?? DEFAULT_BRIDGE_SETTINGS;
    const hardware = parsed.hardware as LegacyHardware | undefined;
    if (anchors && neckParams && hardware?.saddles) {
      hardware.saddles = layoutSaddlesFromScale(
        neckParams,
        bridgeSettings,
        { joinPoint: neckJoinPoint(anchors, neckParams) },
        hardware.saddles,
      );
    }
    version = 4;
    parsed.version = 4;
  }

  // v4 → v5: headstock + tuners (legacy saves stay headless visually).
  if (version === 4) {
    parsed.headstockSettings = {
      ...LEGACY_HEADLESS_SETTINGS,
      ...(parsed.headstockSettings as HeadstockSettings | undefined),
    };
    version = 5;
    parsed.version = 5;
  }

  // v5 → v6: pickup slots + control knobs + selector replace the fixed
  // bridgeHumbucker/volumeKnob pair. Legacy docs keep their bridge pickup and
  // single volume knob exactly where they were.
  if (version === 5) {
    const hardware = parsed.hardware as LegacyHardware | undefined;
    if (hardware && !hardware.pickups && anchors && neckParams) {
      const placement = { joinPoint: neckJoinPoint(anchors, neckParams) };
      const defaults = defaultPickupPositions(neckParams, placement);
      const mk = (p: { x: number; y: number }, visible: boolean): HardwarePosition => ({
        x: p.x,
        y: p.y,
        rotation: 0,
        visible,
        locked: false,
      });
      const sel = defaultSelectorPosition('blade-3', neckParams, placement);
      parsed.hardware = {
        pickups: [
          mk(defaults[0], false),
          mk(defaults[1], false),
          hardware.bridgeHumbucker ?? mk(defaults[2], true),
        ],
        controls: hardware.volumeKnob ? [hardware.volumeKnob] : [],
        selector: { ...mk(sel.position, false), rotation: sel.rotation },
        saddles: hardware.saddles ?? [],
        neckBolts: hardware.neckBolts ?? [],
      };
      parsed.pickupSettings = { neck: 'none', middle: 'none', bridge: 'humbucker' } satisfies PickupSettings;
      parsed.controlSettings = {
        volumes: hardware.volumeKnob ? 1 : 0,
        tones: 0,
        selector: 'none',
        cavityPad: DEFAULT_CONTROL_SETTINGS.cavityPad,
        cavityRotationOffset: DEFAULT_CONTROL_SETTINGS.cavityRotationOffset,
      } satisfies ControlSettings;
    }
    version = 6;
    parsed.version = 6;
  }

  // v6 → v7: blade switch default was −25° (across-body); correct default is
  // 65° (along-strings). Rotate any still-at-legacy-default blade by +90°.
  // Appearance colors are soft-filled below for older docs.
  if (version === 6) {
    const controlSettings = parsed.controlSettings as ControlSettings | undefined;
    const hardware = parsed.hardware as LegacyHardware | undefined;
    const sel = hardware?.selector;
    const blade =
      controlSettings?.selector === 'blade-3' || controlSettings?.selector === 'blade-5';
    if (blade && sel && Math.abs(sel.rotation - -25) < 0.01) {
      sel.rotation = 65;
    }
    version = 7;
    parsed.version = 7;
  }

  // v7 → v8: neck bolts used to be an axis-aligned body-space rectangle that
  // often sat past the heel tip. Snap unlocked 4-bolt patterns onto the heel
  // in neck space (centered, rotated with neckAngle).
  if (version === 7) {
    const hardware = parsed.hardware as LegacyHardware | undefined;
    if (anchors && neckParams && hardware?.neckBolts?.length === 4) {
      hardware.neckBolts = layoutNeckBolts(
        neckParams,
        { joinPoint: neckJoinPoint(anchors, neckParams) },
        { prior: hardware.neckBolts },
      );
    }
    version = 8;
    parsed.version = 8;
  }

  if (version !== DESIGN_DOCUMENT_VERSION) {
    throw new Error(
      `This file was saved with design format v${version}, but this build expects v${DESIGN_DOCUMENT_VERSION}.`,
    );
  }

  // Soft fills for any missing optional fields on current version.
  if (!parsed.bridgeSettings) parsed.bridgeSettings = { ...DEFAULT_BRIDGE_SETTINGS };
  else {
    const bridge = parsed.bridgeSettings as BridgeSettings;
    if (bridge.stringCount === undefined) bridge.stringCount = 6;
  }
  if (!parsed.nutSettings) parsed.nutSettings = { ...DEFAULT_NUT_SETTINGS };
  if (!parsed.headstockSettings) parsed.headstockSettings = { ...DEFAULT_HEADSTOCK_SETTINGS };
  if (!parsed.pickupSettings) parsed.pickupSettings = { ...DEFAULT_PICKUP_SETTINGS };
  if (!parsed.controlSettings) {
    parsed.controlSettings = { ...DEFAULT_CONTROL_SETTINGS };
  } else {
    const cs = parsed.controlSettings as ControlSettings;
    if (cs.cavityPad === undefined) cs.cavityPad = DEFAULT_CONTROL_SETTINGS.cavityPad;
    if (cs.cavityRotationOffset === undefined) cs.cavityRotationOffset = DEFAULT_CONTROL_SETTINGS.cavityRotationOffset;
  }
  const layers = (parsed.layers as Record<LayerId, LayerState> | undefined) ?? defaultLayers();
  if (!layers.strings) layers.strings = { visible: false, locked: false };
  parsed.layers = layers;
  const settings = (parsed.settings as Record<string, unknown> | undefined) ?? {};
  if (typeof settings.bodyColor !== 'string') settings.bodyColor = '#d9c9a8';
  if (typeof settings.fretboardColor !== 'string') settings.fretboardColor = '#caa46a';
  if (typeof settings.bodyOpacity !== 'number' || !Number.isFinite(settings.bodyOpacity)) {
    settings.bodyOpacity = 1;
  } else {
    settings.bodyOpacity = Math.min(1, Math.max(0.05, settings.bodyOpacity as number));
  }
  parsed.settings = settings;

  return parsed;
}
