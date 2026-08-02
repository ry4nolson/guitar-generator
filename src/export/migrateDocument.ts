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
import { neckJoinPoint } from '../geometry/scaleLock';
import type { BodyAnchor } from '../geometry/types';
import type { NeckParams } from '../geometry/neckParams';
import { defaultLayers, type LayerId, type LayerState } from '../state/layers';
import type { HardwareState } from '../state/hardwareDefaults';
import { relayoutHardwareToScale } from '../state/scaleLockSync';

/** Current design-document schema version. Bump when the shape changes. */
export const DESIGN_DOCUMENT_VERSION = 5;

export function migrateDesignDocument(parsed: Record<string, unknown>): Record<string, unknown> {
  let version = typeof parsed.version === 'number' ? parsed.version : 1;

  // v1 → v2 was a breaking topology change; refuse rather than guess.
  if (version < 2) {
    throw new Error(`Design format v${version} is no longer supported (pre-template topology).`);
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
    const anchors = parsed.bodyAnchors as BodyAnchor[] | undefined;
    const neckParams = parsed.neckParams as NeckParams | undefined;
    const bridgeSettings = (parsed.bridgeSettings as BridgeSettings | undefined) ?? DEFAULT_BRIDGE_SETTINGS;
    const hardware = parsed.hardware as HardwareState | undefined;
    if (anchors && neckParams && hardware?.saddles) {
      parsed.hardware = relayoutHardwareToScale(hardware, neckParams, bridgeSettings, neckJoinPoint(anchors));
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

  if (version !== DESIGN_DOCUMENT_VERSION) {
    throw new Error(
      `This file was saved with design format v${version}, but this build expects v${DESIGN_DOCUMENT_VERSION}.`,
    );
  }

  // Soft fills for any missing optional fields on current version.
  if (!parsed.bridgeSettings) parsed.bridgeSettings = { ...DEFAULT_BRIDGE_SETTINGS };
  if (!parsed.nutSettings) parsed.nutSettings = { ...DEFAULT_NUT_SETTINGS };
  if (!parsed.headstockSettings) parsed.headstockSettings = { ...DEFAULT_HEADSTOCK_SETTINGS };
  const layers = (parsed.layers as Record<LayerId, LayerState> | undefined) ?? defaultLayers();
  if (!layers.strings) layers.strings = { visible: false, locked: false };
  parsed.layers = layers;

  return parsed;
}
