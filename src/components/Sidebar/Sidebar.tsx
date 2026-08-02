import { PointInspector } from './PointInspector';
import { ViewSettings } from './ViewSettings';
import { FeaturePanel } from './FeaturePanel';
import { NeckControls } from './NeckControls';
import { HardwareControls } from './HardwareControls';
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
      <HardwareControls />
      <ReferenceOverlayPanel />
      <LayersPanel />
      <ViewSettings />
    </aside>
  );
}
