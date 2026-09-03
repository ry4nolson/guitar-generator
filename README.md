# Guitloft

A browser-based, parametric editor for electric guitar designs — headed or
headless. Three inspired starting silhouettes ship out of the box (Tele, Strat,
Flying V families — original outlines, not traced trademarked production
shapes). Built with React + TypeScript + Vite, SVG for all drawing/interaction,
Zustand for state, and Vitest for geometry tests. No canvas, no backend.

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
    headstock.ts       Headstock silhouettes + tuner layouts
    bridgeTypes.ts     Bridge / nut hardware presets
    scaleLock.ts       Nut↔bridge locked to scale length(s)
    svgPath.ts         Anchors → real cubic-Bezier SVG path `d` string
    bounds.ts          Full-design bounding box (body + neck + headstock + hardware)
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
      Headstock.tsx            Headstock outline + tuners
      …
    Sidebar/                 Params, features, bridge/nut/headstock, layers
```

## Features

- Parametric body templates with persistent manual Bézier edits
- Multiscale (fanned) frets with independent bass/treble scale lengths
- Scale-locked bridge: moving the neck joint keeps nut↔bridge distance
- Bridge types: hardtail, TOM, Floyd Rose, Strat tremolo
- Headstock types: headless, paddle, 6-inline, 3×3, pointy — with tuner layouts
- Optional string overlay, reference image tracing, construction view
- JSON save/load + SVG export (clean / blueprint / fabrication)

## Develop

```bash
npm install
npm run dev
npm test
npm run build
```
