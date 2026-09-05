import { useEffect } from 'react';
import { useDesignStore } from '../../state/store';
import { useUiStore } from '../../state/uiStore';
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
import { scrollSidebarToId, sidebarTargetId, stationFromSelection, type InspectorStation } from './scrollToSelection';
import { useConstraintViolations } from '../../hooks/useConstraintViolations';
import {
  IconBridge,
  IconGear,
  IconHead,
  IconNeck,
  IconPickup,
  IconShape,
  IconStage,
  IconTrace,
} from '../chrome/icons';

const STATIONS: { id: InspectorStation; label: string; hint: string; icon: typeof IconShape }[] = [
  { id: 'shape', label: 'Shape', hint: 'Body silhouette and horns', icon: IconShape },
  { id: 'neck', label: 'Neck', hint: 'Scale, nut, and neck bolts', icon: IconNeck },
  { id: 'head', label: 'Head', hint: 'Headstock and tuners', icon: IconHead },
  { id: 'bridge', label: 'Bridge', hint: 'Type, spacing, and saddles', icon: IconBridge },
  { id: 'pickups', label: 'Pickups', hint: 'Pickups, knobs, and selector', icon: IconPickup },
  { id: 'trace', label: 'Trace', hint: 'Reference photo overlay', icon: IconTrace },
  { id: 'stage', label: 'Stage', hint: 'Layers and warnings', icon: IconStage },
  { id: 'settings', label: 'Settings', hint: 'Units, grid, and editor prefs', icon: IconGear },
];

export function Sidebar() {
  const selected = useDesignStore((s) => s.selected);
  const activeStation = useUiStore((s) => s.activeStation);
  const setStation = useUiStore((s) => s.setStation);
  const violations = useConstraintViolations();

  useEffect(() => {
    const station = stationFromSelection(selected);
    if (station) setStation(station);
    const id = sidebarTargetId(selected);
    if (!id) return;
    // Wait a couple frames so the station panel mounts before scrolling.
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => scrollSidebarToId(id));
    });
    return () => {
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
    };
  }, [selected, setStation]);

  return (
    <aside className="sidebar">
      <div className="sidebar-main">
        <div className="sidebar-inspector-sticky">
          <PointInspector />
        </div>
        <div className="sidebar-station">
          {activeStation === 'shape' && <FeaturePanel />}
          {activeStation === 'neck' && (
            <>
              <NeckControls />
              <BridgeNutControls section="nut" />
              <HardwareControls group="bolts" />
            </>
          )}
          {activeStation === 'head' && (
            <>
              <HeadstockControls />
              <HardwareControls group="tuners" />
            </>
          )}
          {activeStation === 'bridge' && (
            <>
              <BridgeNutControls section="bridge" />
              <HardwareControls group="saddles" />
            </>
          )}
          {activeStation === 'pickups' && (
            <>
              <PickupControls />
              <HardwareControls group="electronics" />
            </>
          )}
          {activeStation === 'trace' && <ReferenceOverlayPanel />}
          {activeStation === 'stage' && (
            <>
              <LayersPanel />
              <ConstraintsPanel />
            </>
          )}
          {activeStation === 'settings' && <ViewSettings />}
        </div>
      </div>
      <nav className="station-rail" aria-label="Inspector stations">
        {STATIONS.map((s) => {
          const Icon = s.icon;
          const badge = s.id === 'stage' && violations.length > 0 ? violations.length : 0;
          const tooltip = `${s.label} — ${s.hint}`;
          return (
            <button
              key={s.id}
              type="button"
              className={`station-rail-btn${activeStation === s.id ? ' active' : ''}`}
              data-tooltip={tooltip}
              aria-label={tooltip}
              aria-current={activeStation === s.id ? 'page' : undefined}
              onClick={() => setStation(s.id)}
            >
              <Icon />
              {badge > 0 && <span className="station-badge">{badge > 9 ? '9+' : badge}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
