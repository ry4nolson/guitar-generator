import { TELE_TEMPLATE } from './tele';
import { STRAT_TEMPLATE } from './strat';
import { FLYING_V_TEMPLATE } from './flyingV';
import { JACKSON_TEMPLATES } from './jackson';
import type { BodyTemplate } from './types';

export type { BodyTemplate, TemplateParamMeta, TemplateFamily } from './types';
export { TELE_TEMPLATE, STRAT_TEMPLATE, FLYING_V_TEMPLATE };
export { SOLOIST_TEMPLATE, KELLY_TEMPLATE, RHOADS_TEMPLATE, KING_V_TEMPLATE, WARRIOR_TEMPLATE } from './jackson';
export { groupedTemplates, templateHardwareHint, shortTemplateName, TEMPLATE_FAMILIES } from './families';

export const BODY_TEMPLATES: BodyTemplate[] = [TELE_TEMPLATE, STRAT_TEMPLATE, FLYING_V_TEMPLATE, ...JACKSON_TEMPLATES];

export function getBodyTemplate(id: string): BodyTemplate {
  return BODY_TEMPLATES.find((t) => t.id === id) ?? TELE_TEMPLATE;
}
