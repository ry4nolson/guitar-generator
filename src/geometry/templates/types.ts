import type { AnchorSpec } from '../bodyEngine';
import type { BodyFeatureId } from '../bodyFeatures';
import type { NeckParams } from '../neckParams';
import type { HardwareState } from '../../state/hardwareDefaults';

export interface TemplateParamMeta {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: 'mm' | 'deg' | 'ratio';
  /** Which sidebar feature-section this slider appears under; omit (or 'global') for the always-visible Global section. */
  featureId?: BodyFeatureId;
}

export interface BodyTemplate {
  id: string;
  name: string;
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
}
