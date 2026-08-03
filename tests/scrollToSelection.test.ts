import { describe, it, expect } from 'vitest';
import { sidebarTargetId } from '../src/components/Sidebar/scrollToSelection';

describe('sidebarTargetId', () => {
  it('maps pickups to their slot row', () => {
    expect(sidebarTargetId({ kind: 'hardware', name: 'pickups', index: 0 })).toBe('sidebar-pickup-neck');
    expect(sidebarTargetId({ kind: 'hardware', name: 'pickups', index: 2 })).toBe('sidebar-pickup-bridge');
  });

  it('maps knobs and selector to hardware rows', () => {
    expect(sidebarTargetId({ kind: 'hardware', name: 'controls', index: 1 })).toBe('sidebar-hw-controls-1');
    expect(sidebarTargetId({ kind: 'hardware', name: 'selector' })).toBe('sidebar-hw-selector');
  });

  it('maps saddles and neck bolts to hardware rows', () => {
    expect(sidebarTargetId({ kind: 'hardware', name: 'saddles', index: 3 })).toBe('sidebar-hw-saddles-3');
    expect(sidebarTargetId({ kind: 'hardware', name: 'neckBolts', index: 0 })).toBe('sidebar-hw-neckBolts-0');
  });

  it('maps anchors/features to the inspector', () => {
    expect(sidebarTargetId({ kind: 'anchor', id: 'neckJoint', part: 'position' })).toBe('sidebar-inspector');
    expect(sidebarTargetId({ kind: 'feature', id: 'upperHorn' })).toBe('sidebar-inspector');
  });

  it('returns null when nothing is selected', () => {
    expect(sidebarTargetId(null)).toBeNull();
  });
});
