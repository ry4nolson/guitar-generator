// Dimension annotations (layer: "dimensions") — placeholder for now. The
// layer exists and is independently toggleable/exportable so that adding
// real linear/radial dimension annotations later is additive (new content in
// this one component) rather than a new cross-cutting concept.
export function Dimensions() {
  return <g id="dimensions" />;
}
