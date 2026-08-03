import { useEffect } from 'react';
import { useDesignStore } from '../../state/store';
import { PointInspector } from './PointInspector';
import { ViewSettings } from './ViewSettings';
import { FeaturePanel } from './FeaturePanel';
import { NeckControls } from './NeckControls';
import { HardwareControls } from './HardwareControls';
import { BridgeNutControls } from './BridgeNutControls';
import { HeadstockControls } from './HeadstockControls';
import { PickupControls } from './PickupControls';
import { LayersPanel } from './LayersPanel';
import { ConstraintsPanel } from './ConstraintsPanel';
import { ReferenceOverlayPanel } from './ReferenceOverlayPanel';
import { scrollSidebarToId, sidebarTargetId } from './scrollToSelection';

export function Sidebar() {
  const selected = useDesignStore((s) => s.selected);

  useEffect(() => {
    const id = sidebarTargetId(selected);
    if (!id) return;
    // Wait a frame so conditional rows (e.g. pickup slots) are in the DOM.
    const t = window.requestAnimationFrame(() => scrollSidebarToId(id));
    return () => window.cancelAnimationFrame(t);
  }, [selected]);

  return (
    <aside className="sidebar">
      <PointInspector />
      <ConstraintsPanel />
      <FeaturePanel />
      <NeckControls />
      <HeadstockControls />
      <BridgeNutControls />
      <PickupControls />
      <HardwareControls />
      <ReferenceOverlayPanel />
      <LayersPanel />
      <ViewSettings />
    </aside>
  );
}
