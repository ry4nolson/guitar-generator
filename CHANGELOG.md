# Changelog

## 0.1.0 — Initial working MVP

First working version of the parametric headless electric guitar designer.

### Added

- React + TypeScript + Vite project scaffold with Zustand state and Vitest.
- Parametric body model: 8 named cubic-Bezier segments forming a single
  closed, editable outline, driven by 12 sliders.
- Persistent-geometry rule: parametric recompute preserves any anchor the
  user has manually dragged or locked; nothing is regenerated from scratch.
- Direct curve editing: draggable anchors and Bezier handles, point
  selection + coordinate readout, per-point lock/reset, adjustable grid
  snapping, show/hide points & handles toggle.
- True multiscale (fanned-fret) neck: independent equal-temperament fret
  math per side, neutral-fret alignment, adjustable bass/treble scale,
  neutral fret, fret count, nut/heel width, neck length, and neck angle.
- Hardware layer: draggable single bridge humbucker, one volume knob, six
  individual headless saddles, and a 4-bolt neck attachment pattern.
- Three views: Top, Back (reusing the exact same body outline), and
  Construction.
- Undo/redo, reset-to-defaults, save/load design JSON, autosave.
- SVG export in three flavors — clean, blueprint, fabrication (1:1 mm).
- mm/inch display unit toggle; dark/light editor themes.
- Automated geometry tests (Vitest).

## 0.2.0 — CAD-oriented architecture pass

### Added

- Full pan/zoom/fit-to-screen: mouse wheel, middle-mouse/space+drag, touch
  pan/pinch-zoom, plus gesture-independent on-screen D-pad/zoom buttons.
- 75/25 canvas/sidebar layout.
- Feature-based body editing: clicking a body region selects it; the
  sidebar shows only that feature's sliders plus an always-present Global
  section. Dragging a selected feature's outline moves every anchor it
  owns together.
- Figma-style Layers panel with per-layer visibility + lock.
- Extensible constraint engine (advisory warnings): bridge-on-centerline,
  minimum wood around neck pocket, pickup/neck overlap, knob-to-pickup
  distance, hardware collision.
- Mirror-handle editing, numeric x/y editing, arrow-key nudging.
- Versioned JSON persistence.
- Template scaffold (not yet wired to a UI switcher).
- The canvas now fits the FULL design bounding box (body + neck +
  hardware), not just the body's own rectangle.
- The neck now renders on the right side of the canvas.

### Fixed

- A Zustand selector allocating a new array every render caused an infinite
  render loop; selectors now return stable references.
- Dev server `allowedHosts` rejected the sandbox's public preview domain.
- Mobile layout collapsed the canvas; added responsive breakpoints.
- Body-local geometry rendered top-to-bottom inverted (missing y-flip).
- The hip-cutout region's handles could overshoot past their destination
  anchor at wide hipCutoutWidth values, causing a self-intersecting
  "extra blob"; fixed by capping every handle's length at a fraction of
  the distance to its neighboring anchor.
- The hip-cutout anchor's y-position bulged outward instead of notching
  inward for typical params; fixed by positioning it relative to its
  neighbors' own edge level, then pulling inward by hipCutoutDepth.
