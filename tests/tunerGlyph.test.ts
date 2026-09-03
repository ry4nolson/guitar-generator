import { describe, it, expect } from 'vitest';
import { tunerGlyphGeom, tunerGlyphSvgMarkup, tunerHitRadius, tunerKeyPath } from '../src/geometry/tunerGlyph';

describe('tunerGlyph', () => {
  it('uses a centered oval key on the post axis', () => {
    const g = tunerGlyphGeom(4.2);
    expect(g.postR).toBeCloseTo(2.85, 5);
    expect(g.bushingR).toBeCloseTo(5, 5);
    expect(g.shaftY).toBe(0);
    expect(g.keyX1).toBeGreaterThan(g.shaftX1);
    expect(tunerKeyPath(g)).toMatch(/^M /);
  });

  it('splits back (key/shaft) and front (bushing/post) markup', () => {
    const g = tunerGlyphGeom(4.2);
    const back = tunerGlyphSvgMarkup(4.2, { showButton: true, part: 'back' });
    const front = tunerGlyphSvgMarkup(4.2, { showButton: true, part: 'front' });
    expect(back).toContain('<path');
    expect(back).toContain(`translate(0 ${g.shaftY.toFixed(2)})`);
    expect(back).not.toContain(`r="${g.bushingR.toFixed(2)}"`);
    expect(front).toContain(`r="${g.bushingR.toFixed(2)}"`);
    expect(front).not.toContain('<path');
  });

  it('omits the rear key for headless mini tuners', () => {
    const back = tunerGlyphSvgMarkup(3.2, { showButton: false, part: 'back' });
    expect(back).toBe('');
    const front = tunerGlyphSvgMarkup(3.2, { showButton: false, part: 'front' });
    expect(front).toContain('<circle');
  });

  it('grows the hit radius when a button is present', () => {
    expect(tunerHitRadius(4.2, true)).toBeGreaterThan(tunerHitRadius(4.2, false));
  });
});
