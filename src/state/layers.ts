// Figma-style layer registry. Each layer corresponds to one (or more) SVG
// group id(s) rendered by the editor/exporter, so visibility/lock state maps
// directly onto the same grouping used for export — no separate concept to
// keep in sync.

export const LAYER_IDS = [
  'body',
  'neck',
  'frets',
  'hardware',
  'construction',
  'dimensions',
  'routes',
  'centerlines',
] as const;
export type LayerId = (typeof LAYER_IDS)[number];

export interface LayerState {
  visible: boolean;
  locked: boolean;
}

export const LAYER_LABELS: Record<LayerId, string> = {
  body: 'Body',
  neck: 'Neck',
  frets: 'Frets',
  hardware: 'Hardware',
  construction: 'Construction',
  dimensions: 'Dimensions',
  routes: 'Routes',
  centerlines: 'Centerlines',
};

export function defaultLayers(): Record<LayerId, LayerState> {
  const entries = LAYER_IDS.map((id) => [id, { visible: true, locked: false }] as const);
  return Object.fromEntries(entries) as Record<LayerId, LayerState>;
}
