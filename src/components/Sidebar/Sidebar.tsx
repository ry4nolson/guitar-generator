import { PointInspector } from './PointInspector';
import { ViewSettings } from './ViewSettings';
import { FeaturePanel } from './FeaturePanel';
import { NeckControls } from './NeckControls';
import { HardwareControls } from './HardwareControls';
import { BridgeNutControls } from './BridgeNutControls';
import { HeadstockControls } from './HeadstockControls';
import { LayersPanel } from './LayersPanel';
import { ConstraintsPanel } from './ConstraintsPanel';
import { ReferenceOverlayPanel } from './ReferenceOverlayPanel';

export function Sidebar() {
  return (
    <aside className="sidebar">
      <PointInspector />
      <ConstraintsPanel />
      <FeaturePanel />
      <NeckControls />
      <HeadstockControls />
      <BridgeNutControls />
      <HardwareControls />
      <ReferenceOverlayPanel />
      <LayersPanel />
      <ViewSettings />
    </aside>
  );
}
