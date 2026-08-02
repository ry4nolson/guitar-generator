// Plugin/template scaffold.
//
// A template supplies only *default data* (body/neck params + hardware
// layout) — it never touches editor code. Adding a new body shape (Strat,
// Jazzmaster, Explorer, Flying V, bass, acoustic, ...) later means adding one
// more entry to TEMPLATES; the editor, geometry engine, and constraint engine
// all stay generic and untouched. This is intentionally NOT wired to a
// template-switcher UI yet (that's a follow-up), but the shape is load-bearing
// now so store.defaultDocument() already sources from a template rather than
// inlined literals.

import { DEFAULT_BODY_PARAMS, type BodyParams } from './bodyParams';
import { DEFAULT_NECK_PARAMS, type NeckParams } from './neckParams';
import { DEFAULT_HARDWARE, type HardwareState } from '../state/hardwareDefaults';

export interface GuitarTemplate {
  id: string;
  name: string;
  bodyParams: BodyParams;
  neckParams: NeckParams;
  hardware: HardwareState;
}

export const HEADLESS_TELE_TEMPLATE: GuitarTemplate = {
  id: 'headless-tele',
  name: 'Headless Tele-style',
  bodyParams: DEFAULT_BODY_PARAMS,
  neckParams: DEFAULT_NECK_PARAMS,
  hardware: DEFAULT_HARDWARE,
};

/** Registry of available templates. Only one shipped in this MVP. */
export const TEMPLATES: GuitarTemplate[] = [HEADLESS_TELE_TEMPLATE];

export function getTemplate(id: string): GuitarTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? HEADLESS_TELE_TEMPLATE;
}
