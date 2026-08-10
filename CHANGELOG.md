# Changelog

## Unreleased

### Fixed

- Strings continue past the nut to each tuner peg on headed headstocks (inline and
  3×3 layouts map correctly to treble/bass sides).
- Pickups drag along the string axis only (X); Y stays on the centerline.

### Added

- Headstock outline add/remove point controls, plus a tuner inset slider.
- Per-pickup angle controls (−45°…45°) in the Pickups sidebar; routes and SVG
  export respect the rotation.
- Symmetric editing for body and headstock outlines (Editor settings): dragging
  a point or handle also moves its mirror across the string centerline.

## 0.5.3 — Multi-string + string layering

### Fixed

- Strings now draw above pickups/hardware so they sit on the pole pieces.
- Bass-side string strokes are thinner (outer bass ≈1.75 mm canvas width).
- Neck bolt holes are laid out in neck space on the heel (inside the pocket),
  centered on the neck centerline and rotated with neck angle — no longer an
  axis-aligned body-space rectangle with half the pattern past the tip.
- Back view flips bass↔treble (true rear perspective), shows the neck outline,
  and uses translucent body/neck fills so the heel and pocket stay readable
  under movable bolt ferrules.
- Control cavity on the back is an oriented rectangle fitted to the
  knob/selector cluster (not axis-aligned), with configurable pad and angle
  offset in the Pickups sidebar. Front controls render as ghosts on the back
  for alignment.

### Added

- Configurable string count (6–12) under Bridge → Strings. Changing count
  rebuilds saddles, suggests nut/bridge outer spacing, and widens nut/heel
  when needed. Tuners, nut slots, pickup poles, and Floyd/Strat plates follow.

## 0.5.2 — Strings, switch angle, finish colors

### Fixed

- Strings are darker and thicker, with treble→bass gauges matching a typical
  .010–.046" set (high E thinnest, low E thickest) so they read on cream bodies.
- Blade pickup selector default rotation is now along the strings (65°) instead
  of across the body (−25°). Legacy docs still at −25° are rotated +90° on load.

### Added

- Adjustable blade switch angle (−180°…180°) in the Pickups sidebar.
- Body and fretboard color pickers under Appearance (saved with the design;
  SVG export uses the chosen fills).

## 0.5.1 — Neck pocket inset

### Fixed

- The `neckJoint` body anchor no longer sits at the very end of the neck: it
  now marks the pocket MOUTH on the body outline, and the heel sets a
  configurable `Neck pocket inset` (default 55 mm, 0–90) deeper into the body —
  so the fretboard end lands inside the body like a real set/bolt-on neck.
- Changing the inset slides the whole nut–bridge assembly while the scale
  lock keeps nut→saddle distances intact; neck bolts ride along with the heel.
- The neck-pocket route now spans the full pocket depth (mouth → just past the
  heel) instead of a fixed 36 mm stub.
- Legacy documents load with inset 0 so their existing layouts don't shift.

## 0.5.0 — Pickups & controls overhaul

Replaced the fixed "bridge humbucker + volume knob" pair with a configurable
pickup/control system using real hardware footprints.

### Added

- Three pickup slots (neck / middle / bridge), each none, single-coil, P90, or
  humbucker — drawn at real sizes (single-coil 70×18, humbucker 70×38, P90
  86×36 mm) with pole pieces, and routed at footprint + 3 mm in the routes layer.
- 0–2 volume + 0–2 tone knobs (19 mm pot knobs) defaulting to the treble side
  behind the bridge; adding knobs never moves ones you've already placed.
- Pickup selector: 3-way/5-way blade (treble side) or LP-style toggle (bass
  upper bout).
- Sidebar "Pickups" panel; per-item position/lock/visibility rows in Hardware.
- Document schema v6 (`pickupSettings`, `controlSettings`); legacy saves keep
  their bridge pickup and volume knob exactly where they were.

### Fixed

- Default volume knob no longer lands on the bass side near the nut hardware —
  controls are placed scale-relative on the treble side behind the bridge.
- Humbucker rendered at its real 70×38 mm footprint instead of a 36×22 blob.
- Back-view control cavity now follows the actual knob/selector cluster, and
  bridge access / reference lines follow the saddle cluster rather than the
  pickup.
- Multiscale (fanned-fret) necks: the nut, fretboard/heel end, nut string
  slots, headstock base, and neck-pocket route now follow the fret fan
  instead of being drawn square. Everything collapses back to square when the
  bass and treble scales are equal.
- The fretboard now extends past the heel to 5 mm beyond the last fret (the
  classic overhang) when the fret count runs past the neck length, so frets
  never float outside the board.
- Standard dot inlays (3/5/7/9/15/17/19/21, doubles at 12 and 24), fan-aware
  and sized to the local fret gap, in the canvas and SVG exports.
- Configurable body anchor count (4 up to the template's full set: 13 for
  Tele/Strat, 10 for Flying V) via a new "Anchor points" slider. Each template
  defines which anchors survive at lower counts (skeleton first, smoothing
  points last); the neck joint is always kept and manual edits on surviving
  anchors are preserved.

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
