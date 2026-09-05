import { BRIDGE_TYPE_META } from '../bridgeTypes';
import { HEADSTOCK_TYPE_META } from '../headstock';
import type { PickupSettings } from '../pickups';
import type { BodyTemplate, TemplateFamily } from './types';

export const TEMPLATE_FAMILIES: { id: TemplateFamily; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'v', label: 'V' },
  { id: 'superstrat', label: 'Superstrat' },
];

export function groupedTemplates(
  templates: BodyTemplate[],
): { id: TemplateFamily; label: string; templates: BodyTemplate[] }[] {
  return TEMPLATE_FAMILIES.map((f) => ({
    ...f,
    templates: templates.filter((t) => t.family === f.id),
  })).filter((g) => g.templates.length > 0);
}

function pickupAbbrev(pickups?: PickupSettings): string {
  if (!pickups) return '';
  const letter = (v: PickupSettings[keyof PickupSettings]) => {
    if (v === 'humbucker') return 'H';
    if (v === 'single-coil') return 'S';
    if (v === 'p90') return 'P';
    return '';
  };
  return [letter(pickups.neck), letter(pickups.middle), letter(pickups.bridge)].join('');
}

/** One-line hardware caption for gallery cards, e.g. "SSS · Sync tremolo · Paddle". */
export function templateHardwareHint(template: BodyTemplate): string {
  const p = template.presets;
  const parts: string[] = [];
  const pick = pickupAbbrev(p?.pickups);
  if (pick) parts.push(pick);
  if (p?.bridgeType) {
    const label = BRIDGE_TYPE_META.find((b) => b.id === p.bridgeType)?.label;
    if (label) parts.push(label);
  }
  if (p?.headstockType) {
    const label = HEADSTOCK_TYPE_META.find((h) => h.id === p.headstockType)?.label;
    if (label) parts.push(label);
  }
  return parts.join(' · ');
}

export function shortTemplateName(name: string): string {
  return name.replace(/-inspired$/i, '').trim();
}
