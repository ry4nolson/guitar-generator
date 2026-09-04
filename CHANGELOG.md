# Changelog

## Unreleased

### Changed

- Product name is **Guitloft** (toolbar, page title, package, export
  filenames). Existing FretForge autosave and overlay keys still load.
- Inspector stations: **Gear** is split into **Bridge** (type, spacing,
  saddles) and **Pickups** (pickups, knobs, selector). Neck bolts live
  under Neck. Hover a station icon for its label; toolbar buttons use
  native tooltips so the header does not grow scrollbars.
- Bridge hardware now draws real-footprint plates instead of generic
  rectangles: Tele-style hardtail with brass saddles and string-through
  holes, vintage Tele ashtray with a pickup window in the plate, Tune-o-matic
  with thumbwheels and a stopbar, Floyd Rose with pivot posts and fine tuners,
  and a Strat synchronized tremolo with six screws, stamped saddles, and a
  trem arm. The same glyphs go out in SVG export.
- Editor chrome redesign: warm workshop palette (amber accent), document-only
  toolbar (undo/redo, reset menu, save/load, export menu, theme), floating
  finish dock + body picker on the canvas, silhouette gallery grouped by
  family (Classic / V / Superstrat), and a right inspector with sticky
  selection + luthier stations (Shape / Neck / Head / Bridge / Pickups /
  Trace / Stage). Top / Back / Construction and fit/zoom live on the
  canvas HUD. Headstock
  color is now a saved finish setting (defaults to maple).
- Default finish is now a vintage amber burst with a rosewood fretboard and
  maple headstock (was flat CAD plywood + matching tan neck). Outlines are a
  dark wood edge instead of white, frets read as nickel, strings as steel, and
  hardware has a bit more chrome / cream. Appearance has amber / butterscotch /
  black / Olympic-white chips; custom body colors still get a light burst from
  the picked fill. Saved designs that still had the old plywood defaults pick
  up the new look on load.
- Strat-inspired template is now a traced silhouette: 16 tangent-continuous
  anchors fitted to a straight-on photo of a standard 461 × 324 mm body (long
  bass horn, deep treble cutaway, sculpted waist, flowing lower bout). Feature
  sliders (horn reach, waist depth/position, lower bout fullness, hip cutout,
  lower horn reach) apply as deltas from the traced seed, like the Tele.
- Flying-V-inspired template is built analytically from '58-style proportions
  (424 mm tip-to-tip, 121 mm front, crotch ~63% back): razor-straight wing
  edges with two-anchor G1 fillets at the tips, crotch and shoulders, so the
  rounded tips land exactly on the declared length/width. New sliders for
  front width, shoulder / tip / crotch radius, and crotch position.
- Five Jackson-inspired body presets, traced from the outline drawings in
  Wikimedia Commons' [Guitar outlines](https://commons.wikimedia.org/wiki/Category:Guitar_outlines)
  category (neck + headstock clipped at the pocket mouth): **Soloist**
  (superstrat, Floyd + two humbuckers, shark-fin head), **Kelly** (offset V),
  **Rhoads** (extra-long bass wing), **King V** (symmetrical pointed V), and
  **Warrior** (hooked bass wing / explorer-like). The template gallery wraps
  so the extra cards stay usable.
- Templates carry family presets applied on switch: Strat → three single coils,
  5-way blade, tremolo, paddle head; Tele → two single coils, 3-way, hardtail;
  V → two humbuckers, 2V/1T + toggle on the treble wing, TOM bridge, 3×3 head;
  Soloist → HH + Floyd + shark-fin; Kelly / Rhoads / King V / Warrior → HH +
  TOM + pointy head. Multi-string bridge spacing is preserved across template
  switches.
- Default neck-pickup placement is footprint-aware so fresh designs no longer
  trip the "minimum wood around the neck pocket" warning; the Strat bridge coil
  ships slanted 10° like the real thing.
- Headstock presets are now traced silhouettes instead of hand-drawn guesses.
  Each is our own G1 Bézier loop fitted (≤ ~1.3 mm) to a reference outline of
  the classic shape, with proportions measured from the drawings in Wikimedia
  Commons' "Guitar headstock outlines" category: **Strat** (was "Paddle") has
  the angled straight tuner edge with the bulb swelling to the *treble* side and
  the scoop + bump beneath it; new **Tele** type is the slimmer hooked-tip
  Fender head; **Shark fin** is the superstrat slant-and-point; **Open book** is
  the Gibson flared trapezoid with sharp ear tips and two crown humps meeting at
  a centre notch (mirrored for exact symmetry); **Pointy** is the metal head
  with the hooked bass shoulder and treble-side spike. Every type carries its
  natural length / width (Strat 175 × 93, Tele 174 × 79, Shark fin 191 × 80,
  Open book 178 × 82, Pointy 185 × 134) and applies it when you pick the type
  or a template with that head; a hand-sculpted outline is kept unless the type
  changes. The "Tip width" slider is now "Head width" (overall widest point) and
  the 3×3 "Ear width" slider is gone (the traced flare replaces it).
- Peg rows are tuned per head: each type has a **nut clearance** (new setting +
  slider) as well as its tip clearance, so the first peg lands past the nut
  flare on the straight tuner edge and the last one sits just short of the tip
  corner, like the factory drilling. Split (3×3) rows are measured from where
  the crown crosses the centreline, so both sides line up on heads with
  off-centre humps.
- Inline tuner pegs are drilled on a straight line (fitted through the pegs on
  the straight part of the flank) rather than tracing the curved edge. Keys
  rotate with that row so they sit perpendicular to the mounting edge instead
  of always pointing at 90°.

### Fixed

- Saved designs whose headstock outline was never hand-edited pick up the new
  traced silhouettes (at their natural proportions) on load instead of keeping
  the old blob shapes.
- Sampled headstock outlines now include the anchor points themselves, so
  sharp tips and corners survive flattening (previously they were shaved off).
- The treble tuner row on split (3×3) heads was measured from the wrong nut
  corner (the flank included the nut face), pushing its first peg onto the nut.
- Moving the nut corners (nut width / fan changes) now carries their Bézier
  handles along instead of resetting them, so the preset's flare survives.

- Newly added reference photos appear upright on the canvas (the top-view stage
  is a 180° turn of body space, so they previously landed upside-down).
- Tuner auto-layout follows the Bezier headstock silhouette (not control
  points) and insets along the inward edge normal so pegs stay on the wood.
- Sealed-tuner glyph uses a centered oval key (cleaner top-view read).
- Strings continue past the nut to each tuner peg on headed headstocks (inline and
  3×3 layouts map correctly to treble/bass sides).
- Pickups drag along the string axis only (X); Y stays on the centerline.

### Added

- Multiple reference overlay images (add/replace/remove per image; embedded as
  base64 in Save JSON, transform settings also saved locally). Horizontal and
  vertical flip per image; drag-and-drop an image onto the canvas to add one.
  Clicking a reference on the canvas selects it and scrolls/highlights its
  controls in the sidebar.
- Neck and headstock tracing opacity sliders, grouped with body opacity next to
  the reference overlay controls.
- Draggable tuner pegs with per-peg lock/angle, plus tip clearance, end margin,
  and peg angle offset sliders under Headstock → Tuners.
- Sealed-tuner glyph drawn in two layers: keys/housing under the headstock
  (tips stick past the edge), bushings/posts on top; oval key on the post axis.
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
