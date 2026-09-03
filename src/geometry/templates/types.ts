import type { AnchorSpec } from '../bodyEngine';
import type { BodyFeatureId } from '../bodyFeatures';
import type { NeckParams } from '../neckParams';
import type { HardwareState } from '../../state/hardwareDefaults';
import type { PickupSettings, ControlSettings } from '../pickups';
import type { BridgeType } from '../bridgeTypes';
import type { HeadstockSettings, HeadstockType } from '../headstock';

/**
 * Hardware/electronics/headstock a template family ships with. Applied when
 * the user picks the template so a Strat gets three single coils + tremolo
 * + 6-inline, a V gets two humbuckers + TOM + 3×3, etc. Each field is
 * optional; omitted fields keep whatever the user currently has.
 */
export interface TemplatePresets {
  pickups?: PickupSettings;
  controls?: Pick<ControlSettings, 'volumes' | 'tones' | 'selector'>;
  bridgeType?: BridgeType;
  headstockType?: HeadstockType;
  /** Head dimensions for this family (applied unless the outline was hand-sculpted). */
  headstock?: Partial<Pick<HeadstockSettings, 'length' | 'tipWidth' | 'earWidth'>>;
}

export interface TemplateParamMeta {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: 'mm' | 'deg' | 'ratio' | 'count';
  /** Which sidebar feature-section this slider appears under; omit (or 'global') for the always-visible Global section. */
  featureId?: BodyFeatureId;
}

export type TemplateFamily = 'classic' | 'v' | 'superstrat';

export interface BodyTemplate {
  id: string;
  name: string;
  /** Gallery grouping. */
  family: TemplateFamily;
  /** Short description shown in the template picker. */
  description: string;
  defaultParams: Record<string, number>;
  paramMeta: TemplateParamMeta[];
  /**
   * Pure function: params -> ordered closed-loop anchor specs. Must include
   * an anchor with id "neckJoint" (used as the neck attachment/pivot point
   * by neckPlacement.ts and the forward-lean shear).
   */
  buildAnchorSpecs: (params: Record<string, number>) => AnchorSpec[];
  defaultNeckParams: NeckParams;
  defaultHardware: HardwareState;
  /** Family-appropriate electronics/bridge/headstock applied on template switch. */
  presets?: TemplatePresets;
}
