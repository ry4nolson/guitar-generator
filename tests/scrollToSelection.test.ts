import { describe, it, expect } from 'vitest';
import { sidebarTargetId, stationFromSelection } from '../src/components/Sidebar/scrollToSelection';

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

  it('maps reference overlays to their sidebar row', () => {
    expect(sidebarTargetId({ kind: 'reference', id: 'ref-abc' })).toBe('sidebar-ref-ref-abc');
  });

  it('returns null when nothing is selected', () => {
    expect(sidebarTargetId(null)).toBeNull();
  });
});

describe('stationFromSelection', () => {
  it('routes body edits to Shape', () => {
    expect(stationFromSelection({ kind: 'anchor', id: 'neckJoint', part: 'position' })).toBe('shape');
    expect(stationFromSelection({ kind: 'feature', id: 'upperHorn' })).toBe('shape');
  });

  it('routes headstock and tuners to Head', () => {
    expect(stationFromSelection({ kind: 'headstock', id: 'hs1', part: 'position' })).toBe('head');
    expect(stationFromSelection({ kind: 'hardware', name: 'tuners', index: 0 })).toBe('head');
  });

  it('routes pickups and controls to Pickups', () => {
    expect(stationFromSelection({ kind: 'hardware', name: 'pickups', index: 1 })).toBe('pickups');
    expect(stationFromSelection({ kind: 'hardware', name: 'controls', index: 0 })).toBe('pickups');
    expect(stationFromSelection({ kind: 'hardware', name: 'selector' })).toBe('pickups');
  });

  it('routes saddles to Bridge and neck bolts to Neck', () => {
    expect(stationFromSelection({ kind: 'hardware', name: 'saddles', index: 0 })).toBe('bridge');
    expect(stationFromSelection({ kind: 'hardware', name: 'neckBolts', index: 0 })).toBe('neck');
  });

  it('routes reference overlays to Trace', () => {
    expect(stationFromSelection({ kind: 'reference', id: 'ref-1' })).toBe('trace');
  });

  it('returns null when nothing is selected', () => {
    expect(stationFromSelection(null)).toBeNull();
  });
});
