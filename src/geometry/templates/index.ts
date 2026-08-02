import { TELE_TEMPLATE } from './tele';
import { STRAT_TEMPLATE } from './strat';
import { FLYING_V_TEMPLATE } from './flyingV';
import type { BodyTemplate } from './types';

export type { BodyTemplate, TemplateParamMeta } from './types';
export { TELE_TEMPLATE, STRAT_TEMPLATE, FLYING_V_TEMPLATE };

export const BODY_TEMPLATES: BodyTemplate[] = [TELE_TEMPLATE, STRAT_TEMPLATE, FLYING_V_TEMPLATE];

export function getBodyTemplate(id: string): BodyTemplate {
  return BODY_TEMPLATES.find((t) => t.id === id) ?? TELE_TEMPLATE;
}
