# Headless Guitar Designer

A browser-based, parametric editor for headless electric guitar body designs.
Three inspired starting silhouettes ship out of the box (Tele, Strat, Flying V
families — original outlines, not traced trademarked production shapes). Built
with React + TypeScript + Vite, SVG for all drawing/interaction, Zustand for
state, and Vitest for geometry tests. No canvas, no backend.

This is a **working editor foundation** for a future build-ready SVG/CAD-style
tool — not a finished fabrication product.

## Architecture

```
src/
  geometry/        Pure math — no React, no state, fully unit-testable
    types.ts          Shared Point/Anchor/Fret/Hardware types (mm units)
    bodyEngine.ts      Continuity modes (smooth/tangent/corner) → Bezier handles
    bodyModel.ts       Template + params → anchors; preserves manual edits
    bodyFeatures.ts    Semantic feature ids shared across templates
    templates/         Tele / Strat / Flying-V inspired presets
    frets.ts           Equal-temperament fret math + true multiscale fan
    neckPlacement.ts   Places neck-local geometry into body space
    svgPath.ts         Anchors → real cubic-Bezier SVG path `d` string
    bounds.ts          Full-design bounding box (body + neck + hardware)
    constraints.ts     Extensible advisory constraint engine
    …

  state/
    store.ts                 Persistent design document + undo/redo + autosave
    referenceOverlay.ts      Lightweight overlay settings (localStorage)
    ReferenceOverlayContext  Session image URL + settings for the canvas
    hardwareDefaults.ts      Per-template hardware layout helper
    layers.ts                Figma-style layer registry

  components/
    Toolbar.tsx              Template gallery, views, undo/redo, save/export
    Toolbar/TemplateGallery  Silhouette cards from real template geometry
    Editor/                  SVG rendering + drag interaction
      EditorCanvas.tsx         Pan/zoom/fit, reference overlay, composition
      ReferenceImageOverlay    Optional tracing image (never exported)
      AnchorPoints.tsx         Selection-scoped handles + dimmed unselected
      …
    Sidebar/                 Feature params, neck, hardware, reference overlay,
                             layers, constraints, editor settings

  export/
    svgExport.ts        Clean / blueprint / fabrication SVG (geometry only)
    jsonPersistence.ts  Save/load the design document as JSON

  hooks/
    useViewport.ts         Pan/zoom/fit; wheel zooms around cursor
    useEditorShortcuts.ts  F / 0 / Esc / Delete shortcuts
    useReferenceOverlay.ts Session reference image + persisted settings
    …
```

### The persistence rule

The product requirement is that **the guitar is generated from persistent
geometry, not redrawn from scratch**. This is implemented as:

- `bodyAnchors` live in the Zustand store, not in a component.
- Moving a body-param slider calls `recomputeAnchorsPreservingEdits`, which
  recomputes only anchors that have **not** been manually edited.
- Switching templates is the deliberate full-replace exception: it resets
  body params/anchors/hardware for the new topology, warns if there are
  manual edits, and preserves shared neck settings plus unit/view prefs.

## Body templates

Three presets, each authored as semantic anchors + continuity modes (not
hard-coded SVG path strings):

| Preset | Character |
|--------|-----------|
| **Tele-inspired** | Compact, modest upper horn, shallow waist, broad rounded lower bout, small lower cutaway |
| **Strat-inspired** | Offset double-cut, longer upper horn, shorter lower horn, deeper waist, flowing lower bout |
| **Flying-V-inspired** | Symmetrical wings, tips rearmost, rearward V notch, straight edges, corner continuity |

Default body size stays in a realistic electric range (~420–470 mm length,
~300–360 mm width).

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
  anchor/handle editing overlay as the Top view. Unselected construction
  guides dim while a feature/anchor is selected.

## Canvas navigation

- Mouse wheel zooms around the cursor; middle-mouse or space+drag pans;
  double-click / **Fit** (shortcut **F**) centers and maximizes the guitar;
  **Reset View** (shortcut **0**) returns to the default camera.
- Pan/zoom survive Top ↔ Back ↔ Construction switches; Fit runs when the
  body template changes.
- Touch: one finger pans, two fingers pinch-zoom.
- On-screen D-pad + zoom buttons provide a gesture-independent fallback.
- Optional PNG/JPEG reference overlay for tracing (sidebar controls; not
  exported).

## Controls summary

- **Templates**: silhouette preview gallery; confirm before discarding manual
  body edits on switch.
- **Body**: feature-based panel (Global + per-region sliders), Advanced
  fallback for all parameters.
- **Neck**: bass/treble scale, neutral fret, fret count, nut/heel width,
  neck length, neck angle.
- **Direct editing**: drag anchors, handles (selected only), or whole
  features; Escape clears selection; Delete/Backspace resets a manual
  override after confirm.
- **Reference overlay**: upload, opacity, scale, X/Y, lock, show/hide, remove.
- **Hardware / Layers / Constraints / History / Export**: as before (JSON
  save/load, clean/blueprint/fabrication SVG).

## Running it

```bash
npm install
npm run dev       # start the editor at http://localhost:5173
npm test          # run geometry + store tests (Vitest)
npm run build     # type-check + production build
npm run lint      # oxlint
```

## Known limitations

- Neck-pocket / pickup-route / control-route shapes in Construction are
  simple placeholders, not yet parametric from real footprints.
- Constraints are advisory-only; no auto-correction/solver.
- Reference image bytes are not persisted across reloads (settings are).
- Per-layer export and layer "selection" are stubbed (visibility/lock work).
- No live UI warning for outline self-intersection (covered by tests).

## Note on assets

`public/favicon.svg` and `public/icons.svg` (default Vite scaffold assets)
were intentionally left out of this upload; drop in your own favicon if
needed.
