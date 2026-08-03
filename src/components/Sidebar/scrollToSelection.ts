// Maps the current editor selection to a sidebar element id so clicking a
// pickup/knob/etc. can scroll the control panel to the matching section.

import { PICKUP_SLOTS } from '../../geometry/pickups';
import type { SelectedPoint } from '../../state/store';

/** DOM id of the sidebar target for a selection, or null if none. */
export function sidebarTargetId(selected: SelectedPoint): string | null {
  if (!selected) return null;
  if (selected.kind === 'anchor' || selected.kind === 'feature') return 'sidebar-inspector';
  if (selected.kind !== 'hardware') return null;

  switch (selected.name) {
    case 'pickups': {
      const slot = selected.index !== undefined ? PICKUP_SLOTS[selected.index] : undefined;
      return slot ? `sidebar-pickup-${slot}` : 'sidebar-pickups';
    }
    case 'controls':
      return selected.index !== undefined ? `sidebar-hw-controls-${selected.index}` : 'sidebar-hardware';
    case 'selector':
      return 'sidebar-hw-selector';
    case 'saddles':
      return selected.index !== undefined ? `sidebar-hw-saddles-${selected.index}` : 'sidebar-hardware';
    case 'neckBolts':
      return selected.index !== undefined ? `sidebar-hw-neckBolts-${selected.index}` : 'sidebar-hardware';
    default:
      return 'sidebar-hardware';
  }
}

/** Smooth-scroll the sidebar so `id` is in view. */
export function scrollSidebarToId(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  el.classList.remove('sidebar-scroll-flash');
  // Retrigger animation if the same target is re-selected.
  void el.offsetWidth;
  el.classList.add('sidebar-scroll-flash');
}
