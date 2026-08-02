// Builds standalone, self-contained SVG documents from the current design
// document. Three flavors are produced:
//   - clean:        body/neck/frets/hardware, no construction lines, no UI-only markers
//   - blueprint:     everything, including construction geometry
//   - fabrication:   clean, guaranteed 1:1 physical mm sizing, minimal styling
//
// All flavors use real vector primitives (path/line/circle) grouped under the
// IDs required by the spec, and embed a metadata comment with the design params.
//
// Sizing/orientation mirrors the live editor (EditorCanvas + geometry/bounds.ts):
// the viewBox fits the FULL design (body + neck + hardware), and a
// `scale(-1,-1)` transform both flips y (body-local +y renders as screen
// "up") and mirrors x (neck renders toward the right) — see EditorCanvas's
// module comment for the full rationale.

import { anchorsToPathD } from '../geometry/svgPath';
import { computeFanFrets } from '../geometry/frets';
import { neckToBodySpace } from '../geometry/neckPlacement';
import { computeDesignBounds } from '../geometry/bounds';
import type { DesignDocument } from '../state/store';

export type ExportFlavor = 'clean' | 'blueprint' | 'fabrication';

function pad(n: number) {
  return n.toFixed(2);
}

export function buildSvgDocument(doc: DesignDocument, flavor: ExportFlavor): string {
  const { bodyParams, bodyAnchors, neckParams, hardware } = doc;
  const margin = 40;

  const joinPoint = { x: bodyAnchors.find((a) => a.id === 'neckJoint')!.position.x, y: 0 };
  const neckOutlinePts = [
    { x: 0, y: neckParams.nutWidth / 2 },
    { x: neckParams.neckLength, y: neckParams.heelWidth / 2 },
    { x: neckParams.neckLength, y: -neckParams.heelWidth / 2 },
    { x: 0, y: -neckParams.nutWidth / 2 },
  ].map((p) => neckToBodySpace(p, neckParams, { joinPoint }));

  const bounds = computeDesignBounds(bodyAnchors, neckOutlinePts, hardware);
  const width = bounds.maxX - bounds.minX + margin * 2;
  const height = bounds.maxY - bounds.minY + margin * 2;
  const tx = margin + bounds.maxX;
  const ty = margin + bounds.maxY;
  const transform = `translate(${pad(tx)},${pad(ty)}) scale(-1,-1)`;

  const frets = computeFanFrets(neckParams);
  const bodyPathD = anchorsToPathD(bodyAnchors);

  const bodyGroup = `<g id="body-outline"><path d="${bodyPathD}" fill="${
    flavor === 'fabrication' ? 'none' : '#d9c9a8'
  }" stroke="#1a1a1a" stroke-width="1" transform="${transform}"/></g>`;

  const neckPathD = `M ${neckOutlinePts.map((p) => `${pad(p.x)} ${pad(p.y)}`).join(' L ')} Z`;
  const neckGroup = `<g id="neck"><path d="${neckPathD}" fill="${
    flavor === 'fabrication' ? 'none' : '#caa46a'
  }" stroke="#1a1a1a" stroke-width="1" transform="${transform}"/></g>`;

  const fretLines = frets
    .slice(1) // skip fret 0 (the nut line is drawn separately)
    .map((f) => {
      const b = neckToBodySpace(f.bassPoint, neckParams, { joinPoint });
      const t = neckToBodySpace(f.treblePoint, neckParams, { joinPoint });
      return `<line x1="${pad(b.x)}" y1="${pad(b.y)}" x2="${pad(t.x)}" y2="${pad(t.y)}" stroke="#333" stroke-width="0.6"/>`;
    })
    .join('');
  const fretsGroup = `<g id="frets" transform="${transform}">${fretLines}</g>`;

  const hw: string[] = [];
  const drawCircle = (p: { x: number; y: number; visible: boolean }, r: number, fill: string) => {
    if (!p.visible) return;
    hw.push(`<circle cx="${pad(p.x)}" cy="${pad(p.y)}" r="${r}" fill="${fill}" stroke="#111" stroke-width="0.8"/>`);
  };
  drawCircle(hardware.bridgeHumbucker, 14, '#222');
  drawCircle(hardware.volumeKnob, 9, '#555');
  for (const s of hardware.saddles) drawCircle(s, 3, '#888');
  if (flavor !== 'fabrication') {
    for (const b of hardware.neckBolts) drawCircle(b, 3.5, '#777');
  }
  const hardwareGroup = `<g id="hardware" transform="${transform}">${hw.join('')}</g>`;

  const routesGroup = `<g id="routes" transform="${transform}"></g>`;

  let constructionGroup = '<g id="construction"></g>';
  if (flavor === 'blueprint') {
    const nutB = neckToBodySpace({ x: 0, y: neckParams.nutWidth / 2 }, neckParams, { joinPoint });
    const nutT = neckToBodySpace({ x: 0, y: -neckParams.nutWidth / 2 }, neckParams, { joinPoint });
    const bridgeB = neckToBodySpace({ x: neckParams.bassScale, y: 20 }, neckParams, { joinPoint });
    const bridgeT = neckToBodySpace(
      { x: neckParams.bassScale - (neckParams.bassScale - neckParams.trebleScale), y: -20 },
      neckParams,
      { joinPoint },
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
    exportedAt: new Date().toISOString(),
    unit: 'mm',
  }).replace(/-->/g, '')} -->`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">
${metadata}
${bodyGroup}
${neckGroup}
${fretsGroup}
${hardwareGroup}
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
