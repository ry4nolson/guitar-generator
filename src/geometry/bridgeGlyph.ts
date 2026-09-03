/**
 * Top-view bridge glyphs (mm), origin at the saddle-cluster center.
 * Local +X is toward the tail; −Y is treble (same as body space).
 *
 * Shared by the editor canvas and SVG export so hardware doesn't drift
 * between on-screen and downloaded drawings.
 */

import type { Point } from './types';
import type { BridgeSettings } from './bridgeTypes';
import { stringSlotOffsets } from './bridgeTypes';

export interface BridgeGlyphOpts {
  fabrication?: boolean;
}

export interface SaddleGlyphOpts {
  fabrication?: boolean;
  selected?: boolean;
}

export interface RectBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function n(v: number): string {
  return v.toFixed(2);
}

function paint(color: string, fab: boolean): string {
  return fab ? 'none' : color;
}

function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h / 2);
  const x2 = x + w;
  const y2 = y + h;
  return [
    `M ${n(x + rr)} ${n(y)}`,
    `L ${n(x2 - rr)} ${n(y)}`,
    `A ${n(rr)} ${n(rr)} 0 0 1 ${n(x2)} ${n(y + rr)}`,
    `L ${n(x2)} ${n(y2 - rr)}`,
    `A ${n(rr)} ${n(rr)} 0 0 1 ${n(x2 - rr)} ${n(y2)}`,
    `L ${n(x + rr)} ${n(y2)}`,
    `A ${n(rr)} ${n(rr)} 0 0 1 ${n(x)} ${n(y2 - rr)}`,
    `L ${n(x)} ${n(y + rr)}`,
    `A ${n(rr)} ${n(rr)} 0 0 1 ${n(x + rr)} ${n(y)}`,
    'Z',
  ].join(' ');
}

function circlePath(cx: number, cy: number, r: number): string {
  return `M ${n(cx - r)} ${n(cy)} a ${n(r)} ${n(r)} 0 1 1 ${n(r * 2)} 0 a ${n(r)} ${n(r)} 0 1 1 ${n(-r * 2)} 0 Z`;
}

function hexagonPath(cx: number, cy: number, r: number): string {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = ((60 * i - 30) * Math.PI) / 180;
    return `${n(cx + r * Math.cos(a))} ${n(cy + r * Math.sin(a))}`;
  });
  return `M ${pts.join(' L ')} Z`;
}

function slottedScrew(cx: number, cy: number, r: number, fab: boolean, angle = 0): string {
  const slotW = r * 0.22;
  const slotH = r * 1.35;
  return `<g data-part="mount-screw" transform="translate(${n(cx)} ${n(cy)}) rotate(${n(angle)})">
    <circle r="${n(r)}" fill="${paint('#9a968e', fab)}" stroke="#2a2824" stroke-width="0.35"/>
    <circle r="${n(r * 0.58)}" fill="${paint('#6e6a64', fab)}" stroke="#2a2824" stroke-width="0.2"/>
    <rect x="${n(-slotW / 2)}" y="${n(-slotH / 2)}" width="${n(slotW)}" height="${n(slotH)}" rx="0.12" fill="${paint('#1a1a1a', fab)}"/>
  </g>`;
}

function knurledKnob(cx: number, cy: number, r: number, fab: boolean, fill = '#c8c4bc'): string {
  const ticks: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ticks.push(
      `<line x1="${n(cx + Math.cos(a) * r * 0.72)}" y1="${n(cy + Math.sin(a) * r * 0.72)}" x2="${n(cx + Math.cos(a) * r * 0.97)}" y2="${n(cy + Math.sin(a) * r * 0.97)}" stroke="${paint('#5a5850', fab)}" stroke-width="0.35"/>`,
    );
  }
  return `<g>
    <circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${paint(fill, fab)}" stroke="#2a2824" stroke-width="0.4"/>
    ${ticks.join('')}
    <circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.42)}" fill="${paint('#8a8680', fab)}"/>
    <circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.18)}" fill="${paint('#2a2824', fab)}"/>
  </g>`;
}

function thumbScrew(cx: number, cy: number, r: number, fab: boolean): string {
  return `<g>
    <circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${paint('#d4d0c8', fab)}" stroke="#222" stroke-width="0.4"/>
    <circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.62)}" fill="${paint('#b0aca4', fab)}"/>
    <rect x="${n(cx - r * 0.12)}" y="${n(cy - r * 0.72)}" width="${n(r * 0.24)}" height="${n(r * 1.44)}" rx="0.1" fill="${paint('#1a1a1a', fab)}"/>
  </g>`;
}

function stringTails(ys: number[], x0: number, x1: number): string {
  return ys
    .map(
      (y) =>
        `<line data-part="string-tail" x1="${n(x0)}" y1="${n(y)}" x2="${n(x1)}" y2="${n(y)}" stroke="#7a756c" stroke-width="0.7" stroke-linecap="round"/>`,
    )
    .join('');
}

function tremArm(ferruleX: number, ferruleY: number, fab: boolean): string {
  // Tail (+X) and treble (−Y): a readable stub that stays on the lower bout.
  const midX = ferruleX + 6;
  const midY = ferruleY - 11;
  const tipX = ferruleX + 9;
  const tipY = ferruleY - 24;
  return `<g data-part="trem-arm">
    <path d="M ${n(ferruleX)} ${n(ferruleY)} Q ${n(midX)} ${n(midY)} ${n(tipX)} ${n(tipY)}" fill="none" stroke="${paint('#c8c4bc', fab)}" stroke-width="2.35" stroke-linecap="round"/>
    <circle cx="${n(tipX)}" cy="${n(tipY)}" r="2.55" fill="${paint('#dedad2', fab)}" stroke="#3a3834" stroke-width="0.4"/>
    <circle cx="${n(tipX)}" cy="${n(tipY)}" r="1.15" fill="${paint('#b0aca4', fab)}"/>
  </g>`;
}

function countOf(settings: BridgeSettings): number {
  return settings.stringCount ?? 6;
}

function saddlePitch(settings: BridgeSettings): number {
  const c = countOf(settings);
  if (c < 2) return settings.stringSpacing;
  return settings.stringSpacing / (c - 1);
}

/** Plate / posts / arm in cluster-local mm. */
export function bridgePlateLocalBounds(settings: BridgeSettings): RectBounds {
  const spacing = settings.stringSpacing;
  switch (settings.type) {
    case 'tom': {
      const half = Math.max(settings.postSpacing, spacing) / 2 + 8;
      return { minX: -9, maxX: settings.stopbarOffset + 9, minY: -half, maxY: half };
    }
    case 'floyd-rose': {
      const half = spacing / 2 + 20;
      return { minX: -18, maxX: 44, minY: -half - 28, maxY: half };
    }
    case 'strat-tremolo': {
      const half = spacing / 2 + 12;
      return { minX: -14, maxX: 44, minY: -half - 28, maxY: half };
    }
    case 'hardtail':
    default: {
      const half = spacing / 2 + 16;
      const back = Math.max(32, 16 + settings.saddleTravel * 0.7);
      return { minX: -12, maxX: back, minY: -half, maxY: half };
    }
  }
}

/** World-space corners of the plate, for design bounds. */
export function bridgeAssemblyPoints(center: Point, rotationDeg: number, settings: BridgeSettings): Point[] {
  const b = bridgePlateLocalBounds(settings);
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [
    { x: b.minX, y: b.minY },
    { x: b.maxX, y: b.minY },
    { x: b.maxX, y: b.maxY },
    { x: b.minX, y: b.maxY },
  ].map((p) => ({
    x: center.x + p.x * cos - p.y * sin,
    y: center.y + p.x * sin + p.y * cos,
  }));
}

export function bridgePlateSvgMarkup(settings: BridgeSettings, opts: BridgeGlyphOpts = {}): string {
  const fab = !!opts.fabrication;
  switch (settings.type) {
    case 'tom':
      return tomPlate(settings, fab);
    case 'floyd-rose':
      return floydPlate(settings, fab);
    case 'strat-tremolo':
      return stratPlate(settings, fab);
    case 'hardtail':
    default:
      return hardtailPlate(settings, fab);
  }
}

function hardtailPlate(settings: BridgeSettings, fab: boolean): string {
  const count = countOf(settings);
  const ys = stringSlotOffsets(settings.stringSpacing, count);
  const half = settings.stringSpacing / 2 + 15;
  const front = -10;
  const back = 32;
  const depth = back - front;
  const holeX = 17.5;
  const holes = ys.map((y) => ({ cx: holeX, cy: y, r: 1.7 }));
  const plate = roundedRectPath(front, -half, depth, half * 2, 1.4);
  const floor = roundedRectPath(front + 1.8, -half + 1.8, depth - 3.6, half * 2 - 3.6, 0.9);
  const holeD = holes.map((h) => circlePath(h.cx, h.cy, h.r)).join(' ');
  const lip = 4.2;
  const screws = [
    slottedScrew(front + lip, -half + lip, 1.7, fab, 18),
    slottedScrew(front + lip, half - lip, 1.7, fab, -12),
    slottedScrew(back - lip, -half + lip, 1.7, fab, 8),
    slottedScrew(back - lip, half - lip, 1.7, fab, -22),
  ].join('');
  const ferrules = holes
    .map(
      (h) =>
        `<g data-part="string-hole">
          <circle cx="${n(h.cx)}" cy="${n(h.cy)}" r="${n(h.r)}" fill="${paint('#2a2218', fab)}"/>
          <circle cx="${n(h.cx)}" cy="${n(h.cy)}" r="${n(h.r + 0.9)}" fill="none" stroke="${paint('#b8b4ac', fab)}" stroke-width="0.75"/>
        </g>`,
    )
    .join('');
  return `<g data-bridge="hardtail">
    ${fab ? '' : `<rect x="${n(front + 0.8)}" y="${n(-half + 0.8)}" width="${n(depth)}" height="${n(half * 2)}" rx="1.4" fill="#000" opacity="0.16"/>`}
    <path fill-rule="evenodd" d="${plate} ${holeD}" fill="${paint('#c4c0b8', fab)}" stroke="#3a3834" stroke-width="0.75"/>
    <path fill-rule="evenodd" d="${floor} ${holeD}" fill="${paint('#ddd9d1', fab)}" stroke="#8a8680" stroke-width="0.3"/>
    ${fab ? '' : `<rect x="${n(front + 2.6)}" y="${n(-half + 2.4)}" width="${n(depth * 0.42)}" height="1.7" rx="0.85" fill="#fff" opacity="0.22"/>`}
    ${ferrules}
    ${stringTails(ys, 4.5, holeX)}
    ${screws}
  </g>`;
}

function tomPlate(settings: BridgeSettings, fab: boolean): string {
  const count = countOf(settings);
  const ys = stringSlotOffsets(settings.stringSpacing, count);
  const postY = settings.postSpacing / 2;
  const barHalf = postY + 5.5;
  const barX = -6.2;
  const barW = 12.4;
  const barY = -barHalf;
  const barH = barHalf * 2;
  const stopX = settings.stopbarOffset;
  const stopHalf = barHalf - 3;
  const slots = ys
    .map(
      (y) =>
        `<rect x="${n(barX + 1.4)}" y="${n(y - 2.1)}" width="${n(barW - 2.8)}" height="4.2" rx="0.7" fill="${paint('#b0aca4', fab)}" stroke="#6a6860" stroke-width="0.2"/>`,
    )
    .join('');
  const wraps = ys
    .map(
      (y) =>
        `<line x1="${n(stopX - 4.2)}" y1="${n(y)}" x2="${n(stopX + 4.2)}" y2="${n(y)}" stroke="${paint('#6a6660', fab)}" stroke-width="0.85" stroke-linecap="round"/>`,
    )
    .join('');
  const thumb = (cy: number) =>
    `<g data-part="tom-post">
      <circle cx="0" cy="${n(cy)}" r="6.2" fill="${paint('#7a7670', fab)}" stroke="#2a2824" stroke-width="0.45"/>
      ${knurledKnob(0, cy, 4.8, fab, '#d0ccc4')}
    </g>`;
  const stopPost = (cy: number) =>
    `<g data-part="stopbar-post">
      <circle cx="${n(stopX)}" cy="${n(cy)}" r="4.6" fill="${paint('#9a968e', fab)}" stroke="#2a2824" stroke-width="0.4"/>
      <circle cx="${n(stopX)}" cy="${n(cy)}" r="2.8" fill="${paint('#6a6860', fab)}"/>
      <circle cx="${n(stopX)}" cy="${n(cy)}" r="1.15" fill="${paint('#1a1a1a', fab)}"/>
    </g>`;
  return `<g data-bridge="tom">
    <circle cx="0" cy="${n(-postY)}" r="7.2" fill="${paint('#5a5854', fab)}" stroke="#2a2824" stroke-width="0.35"/>
    <circle cx="0" cy="${n(postY)}" r="7.2" fill="${paint('#5a5854', fab)}" stroke="#2a2824" stroke-width="0.35"/>
    <rect x="${n(barX)}" y="${n(barY)}" width="${n(barW)}" height="${n(barH)}" rx="3.4" fill="${paint('#d8d4cc', fab)}" stroke="#3a3834" stroke-width="0.7"/>
    ${fab ? '' : `<rect x="${n(barX + 1.1)}" y="${n(barY + 5)}" width="2.4" height="${n(barH - 10)}" rx="1.2" fill="#fff" opacity="0.22"/>`}
    ${slots}
    ${thumb(-postY)}
    ${thumb(postY)}
    <rect data-part="stopbar" x="${n(stopX - 5.2)}" y="${n(-stopHalf)}" width="10.4" height="${n(stopHalf * 2)}" rx="5" fill="${paint('#a8a49c', fab)}" stroke="#3a3834" stroke-width="0.65"/>
    ${fab ? '' : `<rect x="${n(stopX - 1.6)}" y="${n(-stopHalf + 4)}" width="3.2" height="${n(stopHalf * 2 - 8)}" rx="1.5" fill="#fff" opacity="0.2"/>`}
    ${wraps}
    ${stopPost(-postY + 3)}
    ${stopPost(postY - 3)}
    ${stringTails(ys, 5, stopX)}
  </g>`;
}

function floydPlate(settings: BridgeSettings, fab: boolean): string {
  const count = countOf(settings);
  const ys = stringSlotOffsets(settings.stringSpacing, count);
  const postY = settings.stringSpacing / 2 + 10.5;
  const half = postY + 8;
  const front = -9;
  const back = 40;
  const rearHalf = half - 4;
  const plate = `M ${n(front)} ${n(-half)} L ${n(front)} ${n(half)} L ${n(back)} ${n(rearHalf)} L ${n(back)} ${n(-rearHalf)} Z`;
  const shelfX = 24;
  const armX = 30;
  const armY = -half + 7;
  const posts = [-postY, postY]
    .map(
      (y) =>
        `<g data-part="pivot-post">
          <circle cx="${n(front - 3.2)}" cy="${n(y)}" r="5.1" fill="${paint('#c8c4bc', fab)}" stroke="#111" stroke-width="0.55"/>
          <circle cx="${n(front - 3.2)}" cy="${n(y)}" r="3.4" fill="${paint('#9a968e', fab)}" stroke="#222" stroke-width="0.3"/>
          <circle cx="${n(front - 3.2)}" cy="${n(y)}" r="1.5" fill="${paint('#2a2a2a', fab)}"/>
        </g>`,
    )
    .join('');
  const tuners = ys
    .map((y) => {
      const cx = 33.5;
      return `<g data-part="fine-tuner">
        <rect x="${n(shelfX + 1)}" y="${n(y - 0.95)}" width="${n(cx - shelfX - 2.2)}" height="1.9" rx="0.5" fill="${paint('#5a5a5a', fab)}" stroke="#111" stroke-width="0.25"/>
        ${thumbScrew(cx, y, 2.45, fab)}
      </g>`;
    })
    .join('');
  return `<g data-bridge="floyd-rose">
    ${posts}
    <path d="${plate}" fill="${paint('#2c2c2c', fab)}" stroke="#111" stroke-width="0.85"/>
    <rect x="${n(shelfX)}" y="${n(-rearHalf + 1)}" width="${n(back - shelfX - 0.5)}" height="${n((rearHalf - 1) * 2)}" fill="${paint('#1a1a1a', fab)}" stroke="#000" stroke-width="0.35"/>
    ${fab ? '' : `<rect x="${n(front + 1)}" y="${n(-half + 2)}" width="6.5" height="${n(half * 2 - 4)}" fill="#fff" opacity="0.06"/>`}
    ${tuners}
    <circle data-part="arm-ferrule" cx="${n(armX)}" cy="${n(armY)}" r="3.2" fill="${paint('#1a1a1a', fab)}" stroke="${paint('#c8c4bc', fab)}" stroke-width="1.2"/>
    ${tremArm(armX, armY, fab)}
  </g>`;
}

function stratPlate(settings: BridgeSettings, fab: boolean): string {
  const count = countOf(settings);
  const ys = stringSlotOffsets(settings.stringSpacing, count);
  const half = settings.stringSpacing / 2 + 11;
  const front = -12;
  const back = 42;
  const depth = back - front;
  const armX = 20;
  const armY = -half + 7.5;
  const plate = roundedRectPath(front, -half, depth, half * 2, 1.6);
  const hole = circlePath(armX, armY, 3.4);
  const channel = roundedRectPath(-3.5, -(settings.stringSpacing / 2 + 4.5), 22, settings.stringSpacing + 9, 1.2);
  const screws = ys.map((y, i) => slottedScrew(front + 5.2, y, 1.85, fab, i % 2 === 0 ? 8 : -14)).join('');
  return `<g data-bridge="strat-tremolo">
    <path fill-rule="evenodd" d="${plate} ${hole}" fill="${paint('#d8d4cc', fab)}" stroke="#3a3834" stroke-width="0.7"/>
    <path d="${channel}" fill="${paint('#c0bcb4', fab)}" stroke="#8a8680" stroke-width="0.25"/>
    ${fab ? '' : `<rect x="${n(front + 1.6)}" y="${n(-half + 1.8)}" width="${n(depth * 0.4)}" height="1.5" rx="0.7" fill="#fff" opacity="0.2"/>`}
    <circle data-part="arm-ferrule" cx="${n(armX)}" cy="${n(armY)}" r="3.4" fill="none" stroke="${paint('#b8b4ac', fab)}" stroke-width="1.05"/>
    <circle cx="${n(armX)}" cy="${n(armY)}" r="1.6" fill="${paint('#2a2018', fab)}"/>
    ${screws}
    ${tremArm(armX, armY, fab)}
  </g>`;
}

export function saddleHitSize(settings: BridgeSettings): { along: number; across: number } {
  const pitch = saddlePitch(settings);
  switch (settings.type) {
    case 'tom':
      return { along: 8.5, across: Math.min(pitch * 0.78, 9) };
    case 'floyd-rose':
      return { along: 12, across: Math.min(pitch * 0.9, 11) };
    case 'strat-tremolo':
      return { along: 16, across: Math.min(pitch * 0.92, 10.6) };
    case 'hardtail':
    default:
      return { along: 13, across: Math.min(pitch * 0.88, 10) };
  }
}

export function saddleGlyphSvgMarkup(settings: BridgeSettings, opts: SaddleGlyphOpts = {}): string {
  const fab = !!opts.fabrication;
  const selected = !!opts.selected;
  const stroke = selected ? '#ff5533' : '#2a2824';
  const sw = selected ? 1.05 : 0.45;
  const pitch = saddlePitch(settings);
  switch (settings.type) {
    case 'tom':
      return tomSaddle(pitch, fab, stroke, sw);
    case 'floyd-rose':
      return floydSaddle(pitch, fab, stroke, sw);
    case 'strat-tremolo':
      return stratSaddle(pitch, settings.saddleTravel, fab, stroke, sw);
    case 'hardtail':
    default:
      return hardtailSaddle(pitch, fab, stroke, sw);
  }
}

function groove(x0: number, x1: number, fab: boolean): string {
  return `<line x1="${n(x0)}" y1="0" x2="${n(x1)}" y2="0" stroke="${paint('#3a3834', fab)}" stroke-width="0.55" stroke-linecap="round"/>`;
}

function heightScrew(cx: number, cy: number, fab: boolean): string {
  return `<g data-part="height-screw" transform="translate(${n(cx)} ${n(cy)})">
    <circle r="1.15" fill="${paint('#8a8680', fab)}" stroke="#2a2824" stroke-width="0.28"/>
    <rect x="-0.12" y="-0.85" width="0.24" height="1.7" fill="${paint('#1a1a1a', fab)}"/>
  </g>`;
}

function hardtailSaddle(pitch: number, fab: boolean, stroke: string, sw: number): string {
  const half = Math.min(pitch * 0.4, 4.5);
  // Compensated brass block (6-saddle Tele / modern hardtail), barrel-crowned.
  return `<g data-saddle="hardtail">
    <rect x="-4.4" y="${n(-half)}" width="11.6" height="${n(half * 2)}" rx="${n(Math.min(1.6, half))}" fill="${paint('#c9a24a', fab)}" stroke="${stroke}" stroke-width="${sw}"/>
    <ellipse cx="1.2" cy="0" rx="4.4" ry="${n(half * 0.62)}" fill="${paint('#b08638', fab)}" stroke="${stroke}" stroke-width="0.22"/>
    ${groove(-3.4, 6.4, fab)}
    ${heightScrew(-2.4, -half + 1.35, fab)}
    ${heightScrew(-2.4, half - 1.35, fab)}
    <circle cx="6.5" cy="0" r="1.05" fill="${paint('#8a6a28', fab)}" stroke="${stroke}" stroke-width="0.28"/>
    <rect x="6.38" y="-0.8" width="0.24" height="1.6" fill="${paint('#1a1a1a', fab)}"/>
  </g>`;
}

function tomSaddle(pitch: number, fab: boolean, stroke: string, sw: number): string {
  const half = Math.min(pitch * 0.36, 4.2);
  const notch = `M ${n(-3.6)} ${n(-half)} L ${n(3.8)} ${n(-half)} L ${n(3.8)} ${n(half)} L ${n(-3.6)} ${n(half)} L ${n(-3.6)} ${n(0.9)} L ${n(-1.4)} 0 L ${n(-3.6)} ${n(-0.9)} Z`;
  return `<g data-saddle="tom">
    <path d="${notch}" fill="${paint('#eceae4', fab)}" stroke="${stroke}" stroke-width="${sw}"/>
    ${groove(-1.2, 3.2, fab)}
    <circle cx="2.8" cy="0" r="0.85" fill="${paint('#8a8680', fab)}" stroke="${stroke}" stroke-width="0.25"/>
  </g>`;
}

function floydSaddle(pitch: number, fab: boolean, stroke: string, sw: number): string {
  const half = Math.min(pitch * 0.42, 5);
  const body = roundedRectPath(-5.2, -half, 11.2, half * 2, 0.7);
  const pad = roundedRectPath(-5, -half + 0.7, 4.2, half * 2 - 1.4, 0.4);
  return `<g data-saddle="floyd-rose">
    <path d="${body}" fill="${paint('#4a4a4a', fab)}" stroke="${stroke}" stroke-width="${sw}"/>
    <path d="${pad}" fill="${paint('#6a6a6a', fab)}" stroke="${stroke}" stroke-width="0.3"/>
    ${groove(-1.5, 5.2, fab)}
    <path data-part="hex-grub" d="${hexagonPath(-3.1, 0, 1.55)}" fill="${paint('#c8c4bc', fab)}" stroke="${stroke}" stroke-width="0.3"/>
    <circle cx="-3.1" cy="0" r="0.55" fill="${paint('#1a1a1a', fab)}"/>
  </g>`;
}

function stratSaddle(pitch: number, travel: number, fab: boolean, stroke: string, sw: number): string {
  const half = Math.min(pitch * 0.44, 5.05);
  const front = -3.6;
  const back = 8 + Math.min(6, travel * 0.2);
  // Bent-steel stamp: wide at the height screws, tapering to the intonation screw.
  const d = [
    `M ${n(front)} ${n(-half + 0.35)}`,
    `L ${n(front)} ${n(half - 0.35)}`,
    `L ${n(3.2)} ${n(half - 0.15)}`,
    `L ${n(back - 2.2)} ${n(half * 0.42)}`,
    `L ${n(back)} ${n(half * 0.22)}`,
    `L ${n(back)} ${n(-half * 0.22)}`,
    `L ${n(back - 2.2)} ${n(-half * 0.42)}`,
    `L ${n(3.2)} ${n(-half + 0.15)}`,
    'Z',
  ].join(' ');
  return `<g data-saddle="strat-tremolo">
    <path d="${d}" fill="${paint('#c8c4bc', fab)}" stroke="${stroke}" stroke-width="${sw}"/>
    ${groove(-2.4, back - 1.5, fab)}
    ${heightScrew(-1.1, -half + 1.55, fab)}
    ${heightScrew(-1.1, half - 1.55, fab)}
    <circle cx="${n(back - 0.9)}" cy="0" r="1.15" fill="${paint('#8a8680', fab)}" stroke="${stroke}" stroke-width="0.28"/>
    <rect x="${n(back - 1.02)}" y="-0.85" width="0.24" height="1.7" fill="${paint('#1a1a1a', fab)}"/>
  </g>`;
}
