# Headless Guitar Designer

A browser-based, parametric editor for a headless, Tele-inspired electric
guitar. Built with React + TypeScript + Vite, SVG for all drawing/interaction,
Zustand for state, and Vitest for geometry tests. No canvas, no backend.

This is a **first working version**: a solid, persistent, editable foundation
for a future build-ready SVG/CAD-style tool — not a finished fabrication
product.

## Architecture

```
src/
  geometry/        Pure math — no React, no state, fully unit-testable
    types.ts          Shared Point/Anchor/Fret/Hardware types (mm units)
    bodyParams.ts      Body slider definitions + defaults
    bodyModel.ts       BodyParams -> 8 named anchors + Bezier handles;
                       preserves manual edits when params change
    neckParams.ts      Neck slider definitions + defaults
    frets.ts           Equal-temperament fret math + true multiscale fan
    neckPlacement.ts   Places neck-local geometry into body space
    svgPath.ts         Anchors -> real cubic-Bezier SVG path `d` string
    snapping.ts        Grid snap helper
    units.ts           mm <-> inch conversion
    bodyFeatures.ts    Semantic feature grouping over the 8 raw anchors
    constraints.ts     Extensible advisory constraint engine
    templates.ts       Plugin/template scaffold (default data only)
    bounds.ts          Full-design bounding box (body + neck + hardware)

  state/
    store.ts            Single Zustand store: the persistent design document
                         (body params + anchors, neck params, hardware,
                         layers, settings) + undo/redo history + localStorage
                         autosave
    hardwareDefaults.ts  Default hardware layout
    layers.ts            Figma-style layer registry

  components/
    Toolbar.tsx          Undo/redo/reset, save/load JSON, SVG export, view
                         switch, theme toggle
    Editor/              SVG rendering + drag interaction
      EditorCanvas.tsx     Top-level SVG stage: pan/zoom/fit, bounds-based
                           viewBox, body/neck/hardware composition
      BodyOutline.tsx      Renders the single shared body path (top + back)
      AnchorPoints.tsx     Draggable anchors + Bezier handles
      FeatureHitRegions.tsx Click-to-select body regions + whole-feature drag
      NeckAndFrets.tsx     Neck outline + fanned frets
      Hardware.tsx         Draggable bridge/knob/saddles/neck bolts
      BackView.tsx         Back view (reuses the same body outline)
      ConstructionView.tsx Centerlines, scale/nut/bridge/neutral-fret lines,
                           neck pocket, pickup/control routes
      Centerlines.tsx, ReferenceLines.tsx, RoutesOverlay.tsx, Dimensions.tsx
      LayerGroup.tsx       Gates rendering by layer visibility/lock
    Sidebar/              Feature-based parameter panel, hardware coordinate
                         inputs, selected-point inspector, layers panel,
                         constraints panel, editor settings

  export/
    svgExport.ts        Builds clean / blueprint / fabrication SVG documents
                         with the required layer IDs and embedded metadata
    jsonPersistence.ts   Save/load the full design document as JSON

  hooks/
    useSvgDrag.ts        Pointer-drag -> body-local mm coordinates via the
                         SVG element's screen CTM (works at any zoom)
    useViewport.ts       Pan/zoom/fit: wheel, middle-mouse/space+drag, touch
                         pinch/pan, and gesture-independent D-pad/zoom buttons
    useNeckGeometry.ts   Memoized neck/fret geometry shared by consumers
    useKeyboardNudge.ts  Arrow-key nudging for the selected anchor
```

### The persistence rule

The product requirement is that **the guitar is generated from persistent
geometry, not redrawn from scratch**. This is implemented as:

- `bodyAnchors` (8 named anchors with position + 2 handles each) live in the
  Zustand store, not in a component.
- Moving a body-param slider calls `recomputeAnchorsPreservingEdits`, which
  recomputes only the anchors that have **not** been manually edited. Anchors
  the user dragged (`manuallyEdited: true`) or locked are left untouched until
  explicitly reset.
- Every other control (neck params, hardware position, view/unit/theme) writes
  directly into the same store slice that the SVG reads from — there is no
  separate "regenerate" path.

## Body outline

The body is 8 named cubic-Bezier segments forming one closed loop (not a
single arbitrary path string):

`upper horn → upper bout → rear upper bout → rear waist → lower rear bout →
hip cutout → lower horn → neck-side cutaway → (back to upper horn)`

Each anchor has independent `handleIn`/`handleOut` control points, editable
directly in the Construction view (or on the Top view via the anchor
overlay, or by clicking a body region to select/drag the whole feature).
Every handle uses the same Catmull-Rom-style tangent + radius-scaled length,
with the length always capped at a fraction of the distance to the
neighboring anchor — so a handle can never overshoot past the anchor it's
steering toward. The hip-cutout anchor is positioned relative to its own
neighbors' edge level (pulled inward by `hipCutoutDepth`), which is what
makes it read as a genuine inward notch rather than an outward bulge —
see the regression tests in `tests/bodyModelHandles.test.ts`.

## Multiscale (fanned-fret) neck

For fret `n`, distance from the nut is computed independently per side using
the standard equal-temperament formula:

```
distance(n) = scaleLength * (1 - 2^(-n/12))
```

Bass-side frets use `bassScale` (default 647.7mm / 25.5in), treble-side frets
use `trebleScale` (default 628.65mm / 24.75in). The **neutral fret** is the
one fret where both sides land on the same longitudinal (x) position — the
treble side's nut is offset along x by `bassDistance(neutralFret) -
trebleDistance(neutralFret)` so that fret comes out perpendicular to the
centerline "for free," with no extra rotation hack. See
`geometry/frets.ts` and `tests/frets.test.ts`.

## Views

- **Top** — body, neck, frets, hardware, click-to-select feature regions,
  draggable anchor/handle overlay.
- **Back** — reuses the *exact same* `bodyAnchors` path (see `BodyOutline`
  used by both views) with neck bolts/ferrules, an optional control cavity,
  and optional bridge access outline. No string-through holes anywhere.
- **Construction** — centerlines, nut/bridge/neutral-fret lines, scale
  reference lines, neck pocket, pickup + control routes, and the same
  anchor/handle editing overlay as the Top view.

## Canvas navigation

- Mouse wheel zooms (around the cursor); middle-mouse or space+drag pans;
  double-click fits.
- Touch: one finger pans, two fingers pinch-zoom.
- On-screen D-pad + zoom buttons provide a gesture-independent fallback for
  environments that intercept swipe gestures (e.g. some embedding webviews).
- The canvas fits the FULL design (body + neck + hardware bounding box, not
  just the body's own rectangle) with configurable padding.

## Controls summary

- **Body**: feature-based panel (Global dimensions + per-region sliders when
  you click a body region), plus a collapsible "Advanced: all parameters"
  fallback.
- **Neck**: bass/treble scale length, neutral fret, fret count, nut width,
  heel width, neck length, neck angle.
- **Direct editing**: drag any anchor, handle, or whole feature; mirror-handle
  ("smooth point") toggle; lock/unlock; reset a single point; numeric x/y
  entry; arrow-key nudging; grid snap with adjustable size; show/hide points
  & handles.
- **Hardware**: drag bridge humbucker, volume knob, 6 individual saddles, and
  4 neck bolts; numeric X/Y entry; per-item lock/visibility.
- **Layers**: Figma-style panel (Body/Neck/Frets/Hardware/Construction/
  Dimensions/Routes/Centerlines) with per-layer visibility + lock.
- **Constraints**: live advisory panel (bridge-on-centerline, minimum wood
  around the neck pocket, pickup/neck-pocket overlap, knob-to-pickup
  distance, hardware collision).
- **History/persistence**: undo/redo, reset to defaults, save/load versioned
  design JSON, autosave to `localStorage`.
- **Export**: clean SVG, blueprint SVG (construction lines), fabrication SVG
  (1:1 mm, no UI chrome) — each grouped under
  `body-outline / neck / frets / hardware / routes / construction /
  dimensions` with embedded design-parameter metadata.

## Running it

```bash
npm install
npm run dev       # start the editor at http://localhost:5173
npm test          # run geometry tests (Vitest)
npm run build     # type-check + production build
npm run lint      # oxlint
```

## Known limitations (first version)

- Neck-pocket / pickup-route / control-route shapes in the Construction view
  are simple placeholder rectangles/ellipses, not yet parametric or routed
  from real pickup/pot footprints.
- Constraints are advisory-only; no auto-correction/solver.
- No outline self-intersection validation as a live UI warning (it's covered
  by tests, not a runtime check).
- Per-layer export and layer "selection" are stubbed (visibility/lock work;
  export/selection don't yet).
- The template scaffold (`geometry/templates.ts`) isn't wired to a UI
  switcher yet — only one template ships.

## Next five most valuable improvements

1. Wire the template scaffold to a real switcher (Strat/Jazzmaster/Explorer/
   Flying V/bass/acoustic).
2. Derive neck pocket / pickup / control routes from real hardware footprint
   data instead of placeholder shapes.
3. Per-layer export + a real "active layer" selection concept.
4. Constraint auto-correction (e.g., snap bridge back onto centerline) as an
   opt-in mode.
5. Outline self-intersection / minimum-radius validation feeding into the
   same Constraints panel as a live warning.

## Note on assets

`public/favicon.svg` and `public/icons.svg` (default Vite scaffold assets,
not part of this project's custom work) were intentionally left out of this
upload; running `npm create vite@latest -- --template react-ts` regenerates
equivalents if needed, or just drop in your own favicon.
