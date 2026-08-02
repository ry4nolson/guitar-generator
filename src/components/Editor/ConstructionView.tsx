import { BodyOutline } from './BodyOutline';
import { AnchorPoints } from './AnchorPoints';
import { NeckOutline, FretLines } from './NeckAndFrets';
import { Hardware } from './Hardware';
import { LayerGroup } from './LayerGroup';
import { Centerlines } from './Centerlines';
import { ReferenceLines } from './ReferenceLines';
import { RoutesOverlay } from './RoutesOverlay';
import { Dimensions } from './Dimensions';
import { useDesignStore } from '../../state/store';

/**
 * Reference/build geometry: body + neck + hardware for context, plus
 * centerlines, scale/nut/bridge/neutral-fret lines, neck pocket, pickup +
 * control routes, dimension annotations, and the raw anchor/handle editing
 * overlay — each gated by its own layer so any of it can be hidden or
 * locked independently via the Layers panel.
 *
 * When a feature/anchor is selected, non-selected construction guides dim so
 * the active region reads clearly.
 */
export function ConstructionView({ stageRef }: { stageRef: React.RefObject<SVGGElement | null> }) {
  const selected = useDesignStore((s) => s.selected);
  const dimGuides = selected?.kind === 'anchor' || selected?.kind === 'feature';

  return (
    <g id="construction-view">
      <LayerGroup id="body">
        <BodyOutline variant="top" />
      </LayerGroup>
      <LayerGroup id="neck">
        <NeckOutline />
      </LayerGroup>
      <LayerGroup id="frets">
        <FretLines />
      </LayerGroup>
      <LayerGroup id="hardware">
        <Hardware stageRef={stageRef} />
      </LayerGroup>
      <g opacity={dimGuides ? 0.28 : 1}>
        <LayerGroup id="centerlines">
          <Centerlines />
        </LayerGroup>
        <LayerGroup id="construction">
          <ReferenceLines />
        </LayerGroup>
        <LayerGroup id="routes">
          <RoutesOverlay />
        </LayerGroup>
        <LayerGroup id="dimensions">
          <Dimensions />
        </LayerGroup>
      </g>
      <AnchorPoints stageRef={stageRef} />
    </g>
  );
}
