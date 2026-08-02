import { PointInspector } from './PointInspector';
import { ViewSettings } from './ViewSettings';
import { FeaturePanel } from './FeaturePanel';
import { NeckControls } from './NeckControls';
import { HardwareControls } from './HardwareControls';
import { LayersPanel } from './LayersPanel';
import { ConstraintsPanel } from './ConstraintsPanel';

export function Sidebar() {
  return (
    <aside className="sidebar">
      <PointInspector />
      <ConstraintsPanel />
      <FeaturePanel />
      <NeckControls />
      <HardwareControls />
      <LayersPanel />
      <ViewSettings />
    </aside>
  );
}
