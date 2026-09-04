// Builds standalone, self-contained SVG documents from the current design
// document. Three flavors are produced:
//   - clean:        body/neck/frets/hardware, no construction lines, no UI-only markers
//   - blueprint:     everything, including construction geometry
//   - fabrication:   clean, guaranteed 1:1 physical mm sizing, minimal styling

import { anchorsToPathD } from '../geometry/svgPath';
import { computeFanFrets, computeInlayDots, computeNeckOutlineLocal, trebleFanOffset } from '../geometry/frets';
import { neckToBodySpace } from '../geometry/neckPlacement';
import { neckJoinPoint } from '../geometry/scaleLock';
import { computeDesignBounds } from '../geometry/bounds';
import {
  computeBridgeStringPoints,
  computeNutStringPoints,
  computeStringSegments,
  saddleClusterCenter,
  STRING_STROKE_COLOR,
  stringStrokeWidths,
} from '../geometry/strings';
import { DEFAULT_BRIDGE_SETTINGS } from '../geometry/bridgeTypes';
import { bridgeAssemblyPoints, bridgePlateSvgMarkup, saddleGlyphSvgMarkup } from '../geometry/bridgeGlyph';
import {
  computeTunerPositions,
  DEFAULT_HEADSTOCK_SETTINGS,
  headstockAnchorsToBody,
  headstockAnchorsToPathD,
  mapStringIndexToTunerIndex,
} from '../geometry/headstock';
import { tunerGlyphSvgMarkup } from '../geometry/tunerGlyph';
import {
  DEFAULT_CONTROL_SETTINGS,
  DEFAULT_PICKUP_SETTINGS,
  PICKUP_DIMENSIONS,
  PICKUP_SLOTS,
  type PickupType,
} from '../geometry/pickups';
import type { DesignDocument } from '../state/store';
import { DEFAULT_BODY_COLOR, DEFAULT_FRETBOARD_COLOR } from '../state/store';
import { bodyFinishStops, DEFAULT_HEADSTOCK_COLOR } from '../geometry/color';

export type ExportFlavor = 'clean' | 'blueprint' | 'fabrication';

function pad(n: number) {
  return n.toFixed(2);
}

export function buildSvgDocument(doc: DesignDocument, flavor: ExportFlavor): string {
  const {
    bodyParams,
    bodyAnchors,
    neckParams,
    hardware,
    bridgeSettings,
    nutSettings,
    headstockSettings = DEFAULT_HEADSTOCK_SETTINGS,
    headstockAnchors = [],
    pickupSettings = DEFAULT_PICKUP_SETTINGS,
    controlSettings = DEFAULT_CONTROL_SETTINGS,
    settings,
    layers,
  } = doc;
  const margin = 40;
  const bodyColor = settings?.bodyColor || DEFAULT_BODY_COLOR;
  const fretboardColor = settings?.fretboardColor || DEFAULT_FRETBOARD_COLOR;
  const headstockColor = settings?.headstockColor || DEFAULT_HEADSTOCK_COLOR;

  const joinPoint = neckJoinPoint(bodyAnchors, neckParams);
  const placement = { joinPoint };
  const neckOutlinePts = computeNeckOutlineLocal(neckParams).map((p) => neckToBodySpace(p, neckParams, placement));

  const hsBody = headstockAnchorsToBody(headstockAnchors, neckParams, placement);
  const headstockPts = hsBody.map((a) => a.position);
  const autoTuners = computeTunerPositions(
    neckParams,
    headstockSettings,
    placement,
    hardware.saddles,
    bridgeSettings?.stringCount ?? 6,
    headstockAnchors,
  );
  const storedTuners = hardware.tuners ?? [];
  const tunerPts =
    storedTuners.length > 0
      ? storedTuners.map((t, i) => ({
          index: i,
          position: { x: t.x, y: t.y },
          radius: autoTuners[i]?.radius ?? 4.2,
          pegAngleDeg: t.rotation,
          visible: t.visible,
        }))
      : autoTuners.map((t) => ({ ...t, visible: true }));

  const bridge = bridgeSettings ?? DEFAULT_BRIDGE_SETTINGS;
  const bounds = computeDesignBounds(bodyAnchors, neckOutlinePts, hardware, {}, [
    ...headstockPts,
    ...tunerPts.map((t) => t.position),
    ...bridgeAssemblyPoints(
      saddleClusterCenter(hardware.saddles),
      hardware.saddles[0]?.rotation ?? 0,
      bridge,
    ),
  ]);
  const width = bounds.maxX - bounds.minX + margin * 2;
  const height = bounds.maxY - bounds.minY + margin * 2;
  const tx = margin + bounds.maxX;
  const ty = margin + bounds.maxY;
  const transform = `translate(${pad(tx)},${pad(ty)}) scale(-1,-1)`;

  const frets = computeFanFrets(neckParams);
  const bodyPathD = anchorsToPathD(bodyAnchors);

  const stops = bodyFinishStops(bodyColor);
  let bx = 0;
  let by = 0;
  for (const a of bodyAnchors) {
    bx += a.position.x;
    by += a.position.y;
  }
  const bn = bodyAnchors.length || 1;
  const bcx = bx / bn;
  const bcy = by / bn;
  let br = 80;
  for (const a of bodyAnchors) {
    br = Math.max(br, Math.hypot(a.position.x - bcx, a.position.y - bcy));
  }
  const finishGrad =
    flavor === 'fabrication'
      ? ''
      : `<defs><radialGradient id="body-finish" cx="${pad(bcx)}" cy="${pad(bcy)}" r="${pad(br)}" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="${stops.center}"/><stop offset="48%" stop-color="${stops.mid}"/><stop offset="100%" stop-color="${stops.rim}"/></radialGradient></defs>`;
  const bodyFill = flavor === 'fabrication' ? 'none' : 'url(#body-finish)';
  const bodyGroup = `<g id="body-outline" transform="${transform}">${finishGrad}<path d="${bodyPathD}" fill="${bodyFill}" stroke="#2a2218" stroke-width="0.7"/></g>`;

  const neckPathD = `M ${neckOutlinePts.map((p) => `${pad(p.x)} ${pad(p.y)}`).join(' L ')} Z`;
  const neckGroup = `<g id="neck"><path d="${neckPathD}" fill="${
    flavor === 'fabrication' ? 'none' : fretboardColor
  }" stroke="#2a2218" stroke-width="0.7" transform="${transform}"/></g>`;

  let headstockGroup = '<g id="headstock"></g>';
  if (hsBody.length >= 3) {
    const hsPath = headstockAnchorsToPathD(hsBody);
    headstockGroup = `<g id="headstock"><path d="${hsPath}" fill="${
      flavor === 'fabrication' ? 'none' : headstockColor
    }" stroke="#2a2218" stroke-width="0.7" transform="${transform}"/></g>`;
  }

  const inlayDots =
    flavor === 'fabrication'
      ? ''
      : computeInlayDots(neckParams)
          .map((d) => {
            const c = neckToBodySpace({ x: d.x, y: d.y }, neckParams, placement);
            return `<circle cx="${pad(c.x)}" cy="${pad(c.y)}" r="${pad(d.radius)}" fill="#e8dfc4" stroke="#2a2018" stroke-width="0.25"/>`;
          })
          .join('');
  const fretLines = frets
    .slice(1)
    .map((f) => {
      const b = neckToBodySpace(f.bassPoint, neckParams, placement);
      const t = neckToBodySpace(f.treblePoint, neckParams, placement);
      return `<line x1="${pad(b.x)}" y1="${pad(b.y)}" x2="${pad(t.x)}" y2="${pad(t.y)}" stroke="#333" stroke-width="0.6"/>`;
    })
    .join('');
  const fretsGroup = `<g id="frets" transform="${transform}">${inlayDots}${fretLines}</g>`;

  const showStrings = layers?.strings?.visible && flavor !== 'fabrication';
  let stringsGroup = '<g id="strings"></g>';
  if (showStrings && bridgeSettings && nutSettings) {
    const count = bridgeSettings.stringCount ?? 6;
    const nutPts = computeNutStringPoints(neckParams, nutSettings, placement, count);
    const bridgePts = computeBridgeStringPoints(hardware.saddles);
    const headed =
      headstockSettings.type !== 'headless' &&
      headstockSettings.showTuners &&
      headstockSettings.tunerLayout !== 'none' &&
      headstockSettings.tunerLayout !== 'headless' &&
      tunerPts.length > 0;
    const tunerEnds = headed
      ? Array.from({ length: count }, (_, i) => {
          const ti = mapStringIndexToTunerIndex(i, count, headstockSettings.tunerLayout);
          const mark = tunerPts.find((t) => t.index === ti) ?? tunerPts[ti];
          return mark?.position ?? null;
        })
      : null;
    const segs = computeStringSegments(nutPts, bridgePts, tunerEnds);
    const gauges = stringStrokeWidths(count);
    stringsGroup = `<g id="strings" transform="${transform}">${segs
      .map((s) => {
        const w = gauges[s.index] ?? 1;
        const fretted = `<line x1="${pad(s.bridge.x)}" y1="${pad(s.bridge.y)}" x2="${pad(s.nut.x)}" y2="${pad(s.nut.y)}" stroke="${STRING_STROKE_COLOR}" stroke-width="${w}" stroke-linecap="round"/>`;
        const toPeg =
          s.tuner != null
            ? `<line x1="${pad(s.nut.x)}" y1="${pad(s.nut.y)}" x2="${pad(s.tuner.x)}" y2="${pad(s.tuner.y)}" stroke="${STRING_STROKE_COLOR}" stroke-width="${w}" stroke-linecap="round"/>`
            : '';
        return fretted + toPeg;
      })
      .join('')}</g>`;
  }

  const hw: string[] = [];
  const fab = flavor === 'fabrication';
  const cluster = saddleClusterCenter(hardware.saddles);
  const bridgeRot = hardware.saddles[0]?.rotation ?? 0;
  const drawCircle = (p: { x: number; y: number; visible: boolean }, r: number, fill: string) => {
    if (!p.visible) return;
    hw.push(`<circle cx="${pad(p.x)}" cy="${pad(p.y)}" r="${r}" fill="${fill}" stroke="#111" stroke-width="0.8"/>`);
  };
  hardware.pickups.forEach((p, i) => {
    const type = pickupSettings[PICKUP_SLOTS[i]];
    if (type === 'none' || !p.visible) return;
    const dims = PICKUP_DIMENSIONS[type as PickupType];
    const fill = type === 'single-coil' ? '#e8e2d2' : '#1a1a1a';
    const rot = p.rotation ? ` transform="rotate(${p.rotation}, ${pad(p.x)}, ${pad(p.y)})"` : '';
    hw.push(
      `<rect x="${pad(p.x - dims.along / 2)}" y="${pad(p.y - dims.across / 2)}" width="${pad(dims.along)}" height="${pad(
        dims.across,
      )}" rx="${dims.radius}" fill="${flavor === 'fabrication' ? 'none' : fill}" stroke="#111" stroke-width="0.8"${rot}/>`,
    );
  });
  hw.push(
    `<g id="bridge-assembly" transform="translate(${pad(cluster.x)},${pad(cluster.y)}) rotate(${pad(bridgeRot)})">${bridgePlateSvgMarkup(bridge, { fabrication: fab })}</g>`,
  );
  for (const c of hardware.controls) drawCircle(c, 9.5, '#333');
  if (controlSettings.selector !== 'none' && hardware.selector.visible) {
    const s = hardware.selector;
    if (controlSettings.selector === 'toggle') {
      drawCircle(s, 8, '#c9b98d');
    } else {
      hw.push(
        `<rect x="${pad(s.x - 7)}" y="${pad(s.y - 26)}" width="14" height="52" rx="4" fill="${
          flavor === 'fabrication' ? 'none' : '#1c1c1c'
        }" stroke="#111" stroke-width="0.8" transform="rotate(${s.rotation}, ${pad(s.x)}, ${pad(s.y)})"/>`,
      );
    }
  }
  for (const s of hardware.saddles) {
    if (!s.visible) continue;
    hw.push(
      `<g transform="translate(${pad(s.x)},${pad(s.y)}) rotate(${pad(s.rotation ?? 0)})">${saddleGlyphSvgMarkup(bridge, { fabrication: fab })}</g>`,
    );
  }
  if (flavor !== 'fabrication') {
    for (const b of hardware.neckBolts) drawCircle(b, 3.5, '#777');
  }
  const showTunerButtons = headstockSettings.tunerLayout !== 'headless';
  const tunerBack: string[] = [];
  const tunerFront: string[] = [];
  for (const t of tunerPts) {
    if (t.visible === false) continue;
    const xf = `transform="translate(${pad(t.position.x)},${pad(t.position.y)}) rotate(${pad(t.pegAngleDeg)})"`;
    if (showTunerButtons) {
      tunerBack.push(
        `<g ${xf}>${tunerGlyphSvgMarkup(t.radius, {
          showButton: true,
          part: 'back',
          fabrication: flavor === 'fabrication',
        })}</g>`,
      );
    }
    tunerFront.push(
      `<g ${xf}>${tunerGlyphSvgMarkup(t.radius, {
        showButton: showTunerButtons,
        part: 'front',
        fabrication: flavor === 'fabrication',
      })}</g>`,
    );
  }
  const tunersBackGroup = `<g id="tuners-back" transform="${transform}">${tunerBack.join('')}</g>`;
  hw.push(...tunerFront);
  const hardwareGroup = `<g id="hardware" transform="${transform}">${hw.join('')}</g>`;

  const routesGroup = `<g id="routes" transform="${transform}"></g>`;

  let constructionGroup = '<g id="construction"></g>';
  if (flavor === 'blueprint') {
    const nutB = neckToBodySpace({ x: 0, y: neckParams.nutWidth / 2 }, neckParams, placement);
    const nutT = neckToBodySpace(
      { x: trebleFanOffset(neckParams), y: -neckParams.nutWidth / 2 },
      neckParams,
      placement,
    );
    const bridgeB = neckToBodySpace({ x: neckParams.bassScale, y: 20 }, neckParams, placement);
    const bridgeT = neckToBodySpace(
      { x: neckParams.bassScale - (neckParams.bassScale - neckParams.trebleScale), y: -20 },
      neckParams,
      placement,
    );
    const lines = [
      `<line x1="0" y1="0" x2="${pad(bodyParams.bodyLength)}" y2="0" stroke="#0af" stroke-dasharray="4 2" stroke-width="0.5"/>`,
      `<line x1="${pad(nutB.x)}" y1="${pad(nutB.y)}" x2="${pad(nutT.x)}" y2="${pad(nutT.y)}" stroke="#0a0" stroke-width="0.6"/>`,
      `<line x1="${pad(bridgeB.x)}" y1="${pad(bridgeB.y)}" x2="${pad(bridgeT.x)}" y2="${pad(bridgeT.y)}" stroke="#a00" stroke-width="0.6"/>`,
    ];
    constructionGroup = `<g id="construction" transform="${transform}">${lines.join('')}</g>`;
  }

  const dimensionsGroup = `<g id="dimensions"></g>`;

  const metadata = `<!-- design-metadata: ${JSON.stringify({
    bodyParams,
    neckParams,
    bridgeSettings,
    nutSettings,
    headstockSettings,
    pickupSettings,
    controlSettings,
    exportedAt: new Date().toISOString(),
    unit: 'mm',
  }).replace(/-->/g, '')} -->`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">
${metadata}
${bodyGroup}
${neckGroup}
${tunersBackGroup}
${headstockGroup}
${fretsGroup}
${hardwareGroup}
${stringsGroup}
${routesGroup}
${constructionGroup}
${dimensionsGroup}
</svg>`;
}

export function downloadSvg(svgText: string, filename: string) {
  const blob = new Blob([svgText], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
