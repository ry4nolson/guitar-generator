/**
 * Top-view sealed-tuner glyph (mm), post at the origin.
 * Local +X is outboard (layout rotation aims keys past the headstock edge).
 *
 * Split into two layers so top-view reads correctly:
 *  - back:  housing + shaft + key (UNDER the headstock fill)
 *  - front: bushing + post (ON TOP of the headstock)
 *
 * Keys are a simple vintage oval / tulip on the post axis — easier to read than
 * an offset worm-drive sketch in plan view.
 */

export type TunerGlyphPart = 'back' | 'front' | 'all';

export interface TunerGlyphGeom {
  bushingR: number;
  bushingInnerR: number;
  postR: number;
  postTopR: number;
  holeR: number;
  /** Lateral offset of the rear assembly (0 = centered on the post). */
  shaftY: number;
  housingCx: number;
  housingRx: number;
  housingRy: number;
  shaftX0: number;
  shaftX1: number;
  shaftHalfW: number;
  /** Inboard end of the key (meets the shaft). */
  keyX0: number;
  /** Outboard tip of the key. */
  keyX1: number;
  /** Half-width of the oval key. */
  keyHalfW: number;
}

/** Real-ish sealed-tuner sizes; `radius` only nudges scale for dense string counts. */
export function tunerGlyphGeom(radius = 4.2): TunerGlyphGeom {
  const s = radius / 4.2;
  const bushingR = 5 * s;
  const postR = 2.85 * s;
  const shaftX1 = 13 * s;
  return {
    bushingR,
    bushingInnerR: bushingR * 0.72,
    postR,
    postTopR: postR * 0.72,
    holeR: 1.1 * s,
    shaftY: 0,
    housingCx: 1.2 * s,
    housingRx: 6.5 * s,
    housingRy: 4.2 * s,
    shaftX0: bushingR * 0.85,
    shaftX1,
    shaftHalfW: 1.25 * s,
    keyX0: shaftX1 - 0.5 * s,
    keyX1: shaftX1 + 16 * s, // ~16 mm oval button past the shaft
    keyHalfW: 5.2 * s,
  };
}

/** Hit radius covering the key tip. */
export function tunerHitRadius(radius: number, showButton: boolean): number {
  const g = tunerGlyphGeom(radius);
  if (!showButton) return g.bushingR + 2;
  return Math.hypot(g.keyX1, g.shaftY) + 2;
}

/**
 * Vintage oval / tulip key: narrower at the shaft, rounded outboard tip.
 * Drawn in local coords with y = 0 on the shaft line.
 */
export function tunerKeyPath(g: TunerGlyphGeom): string {
  const x0 = g.keyX0;
  const x1 = g.keyX1;
  const cx = (x0 + x1) / 2;
  const neck = g.keyHalfW * 0.48;
  const tip = g.keyHalfW;
  // Smooth capsule: neck → wide mid → round tip.
  return [
    `M ${x0.toFixed(2)} ${(-neck).toFixed(2)}`,
    `C ${(x0 + 4).toFixed(2)} ${(-neck).toFixed(2)} ${(cx - 2).toFixed(2)} ${(-tip).toFixed(2)} ${cx.toFixed(2)} ${(-tip).toFixed(2)}`,
    `C ${(cx + 4).toFixed(2)} ${(-tip).toFixed(2)} ${(x1 - 2).toFixed(2)} ${(-tip * 0.55).toFixed(2)} ${x1.toFixed(2)} 0`,
    `C ${(x1 - 2).toFixed(2)} ${(tip * 0.55).toFixed(2)} ${(cx + 4).toFixed(2)} ${tip.toFixed(2)} ${cx.toFixed(2)} ${tip.toFixed(2)}`,
    `C ${(cx - 2).toFixed(2)} ${tip.toFixed(2)} ${(x0 + 4).toFixed(2)} ${neck.toFixed(2)} ${x0.toFixed(2)} ${neck.toFixed(2)}`,
    'Z',
  ].join(' ');
}

export function tunerGlyphSvgMarkup(
  radius: number,
  opts: {
    showButton: boolean;
    part?: TunerGlyphPart;
    fabrication?: boolean;
    selected?: boolean;
  },
): string {
  const part = opts.part ?? 'all';
  const g = tunerGlyphGeom(radius);
  const fab = !!opts.fabrication;
  const selected = !!opts.selected;
  const stroke = selected ? '#ff5533' : '#2c2c2c';
  const sw = selected ? 1.05 : 0.45;
  const fill = (c: string) => (fab ? 'none' : c);
  const parts: string[] = [];

  const drawBack = part === 'back' || part === 'all';
  const drawFront = part === 'front' || part === 'all';

  if (drawBack && opts.showButton) {
    const y = g.shaftY;
    parts.push(`<g transform="translate(0 ${y.toFixed(2)})">`);
    parts.push(
      `<ellipse cx="${g.housingCx.toFixed(2)}" cy="0" rx="${g.housingRx.toFixed(2)}" ry="${g.housingRy.toFixed(2)}" fill="${fill('#8a8a8a')}" stroke="${stroke}" stroke-width="${sw}"/>`,
    );
    parts.push(
      `<rect x="${g.shaftX0.toFixed(2)}" y="${(-g.shaftHalfW).toFixed(2)}" width="${(g.shaftX1 - g.shaftX0).toFixed(2)}" height="${(g.shaftHalfW * 2).toFixed(2)}" rx="${g.shaftHalfW.toFixed(2)}" fill="${fill('#a3a3a3')}" stroke="${stroke}" stroke-width="${sw}"/>`,
    );
    parts.push(
      `<path d="${tunerKeyPath(g)}" fill="${fill('#d0d0d0')}" stroke="${stroke}" stroke-width="${sw}"/>`,
    );
    // Mount screw near the inboard neck of the key.
    const screwX = g.keyX0 + (g.keyX1 - g.keyX0) * 0.22;
    parts.push(
      `<circle cx="${screwX.toFixed(2)}" cy="0" r="${(1.25 * (radius / 4.2)).toFixed(2)}" fill="${fill('#5e5e5e')}" stroke="${stroke}" stroke-width="0.3"/>`,
    );
    parts.push(
      `<circle cx="${screwX.toFixed(2)}" cy="0" r="${(0.5 * (radius / 4.2)).toFixed(2)}" fill="${fill('#1a1a1a')}"/>`,
    );
    parts.push('</g>');
  }

  if (drawFront) {
    parts.push(
      `<circle r="${g.bushingR.toFixed(2)}" fill="${fill('#e8e8e8')}" stroke="${stroke}" stroke-width="${sw}"/>`,
    );
    parts.push(
      `<circle r="${g.bushingInnerR.toFixed(2)}" fill="${fill('#c8c8c8')}" stroke="${stroke}" stroke-width="0.35"/>`,
    );
    parts.push(
      `<circle r="${g.postR.toFixed(2)}" fill="${fill('#555')}" stroke="${stroke}" stroke-width="${sw}"/>`,
    );
    parts.push(
      `<circle r="${g.postTopR.toFixed(2)}" fill="${fill('#444')}" stroke="${stroke}" stroke-width="0.3"/>`,
    );
    parts.push(`<circle r="${g.holeR.toFixed(2)}" fill="${fill('#111')}"/>`);
    parts.push(
      `<rect x="${(-g.holeR * 0.32).toFixed(2)}" y="${(-g.postTopR).toFixed(2)}" width="${(g.holeR * 0.64).toFixed(2)}" height="${(g.postTopR * 0.65).toFixed(2)}" rx="0.15" fill="${fill('#111')}"/>`,
    );
  }

  return parts.join('');
}
