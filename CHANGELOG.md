# Changelog

## 0.4.0 — FretForge + headstock / tuners

Renamed the app to **FretForge** and lifted the headless-only assumption.

### Added

- Headstock styles: headless, paddle, 6-inline, 3×3, pointy — with length / tip /
  ear controls where relevant.
- Tuner layouts: none, bridge-end (headless), 6-inline, 3×3; toggleable visibility.
- Sidebar Headstock panel; headstock + tuners in the canvas and SVG export.
- Document schema v5 (`headstockSettings`); legacy saves migrate as headless.

### Changed

- Product name / branding: FretForge (toolbar, page title, package, export filenames).
- New designs default to a paddle headstock with 6-inline tuners.

## 0.3.0 — Usability + preset silhouette pass

Focused improvement pass: better default body templates, reference tracing,
safer template switching, and smoother canvas editing. Architecture unchanged.

### Added

- Compact template preview gallery (silhouette cards generated from real
  parametric geometry) for Tele / Strat / Flying-V inspired presets.
- Optional reference-image overlay (PNG/JPEG) behind the outline: opacity,
  scale, X/Y, lock, show/hide, remove. Settings persist in localStorage; the
  bitmap is session-only. Never included in SVG exports.
- Reset View control + keyboard shortcuts: F (fit), 0 (reset view), Escape
  (clear selection), Delete/Backspace (reset selected manual override after
  confirm).
- Template-switch confirmation when manual body edits exist; switching
  preserves shared neck settings (scale lengths, fret count, nut width,
  neutral fret) and unit/view prefs while resetting body geometry + hardware.

### Changed

- Refined Tele / Strat / Flying-V default anchor geometry for more intentional
  silhouettes within realistic electric-guitar bounds (~420–470 × 300–360 mm).
- Flying-V tips are now the rearmost points with a rearward-opening notch
  (solid body mass around the bridge).
- Fit uses outline+neck+hardware bounds (handles no longer inflate the
  viewBox), so Fit maximizes the visible guitar.
- Bézier handles only appear for the selected anchor or selected feature;
  unselected anchors and construction guides dim while a selection is active.
- Pan/zoom is preserved across Top/Back/Construction; Fit runs on template
  switch.

### Tests

- Closed valid paths, finite coordinates, realistic body bounds.
- Flying-V corner continuity + tip/notch topology.
- Tele/Strat smooth tangent alignment.
- Template switch preserves neck settings / resets body geometry.
- SVG export never includes reference images.

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
