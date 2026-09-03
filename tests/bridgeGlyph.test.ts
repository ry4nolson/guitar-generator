import { describe, it, expect } from 'vitest';
import {
  DEFAULT_BRIDGE_SETTINGS,
  type BridgeSettings,
} from '../src/geometry/bridgeTypes';
import {
  bridgeAssemblyPoints,
  bridgePlateLocalBounds,
  bridgePlateSvgMarkup,
  saddleGlyphSvgMarkup,
  saddleHitSize,
} from '../src/geometry/bridgeGlyph';
import { buildSvgDocument } from '../src/export/svgExport';
import { getBodyTemplate } from '../src/geometry/templates';
import { computeParametricAnchors } from '../src/geometry/bodyModel';
import { defaultLayers } from '../src/state/layers';
import { DESIGN_DOCUMENT_VERSION } from '../src/export/migrateDocument';
import { DEFAULT_NUT_SETTINGS } from '../src/geometry/bridgeTypes';

function settings(over: Partial<BridgeSettings> = {}): BridgeSettings {
  return { ...DEFAULT_BRIDGE_SETTINGS, ...over };
}

function countPart(markup: string, part: string): number {
  return markup.match(new RegExp(`data-part="${part}"`, 'g'))?.length ?? 0;
}

describe('bridgePlateLocalBounds', () => {
  it('sizes a hardtail to Tele-ish ~83 × 42 mm at default spacing', () => {
    const b = bridgePlateLocalBounds(settings({ type: 'hardtail' }));
    expect(b.maxY - b.minY).toBeGreaterThan(78);
    expect(b.maxY - b.minY).toBeLessThan(90);
    expect(b.maxX - b.minX).toBeGreaterThan(36);
    expect(b.maxX - b.minX).toBeLessThan(52);
  });

  it('extends a TOM assembly back to the stopbar', () => {
    const b = bridgePlateLocalBounds(settings({ type: 'tom', stopbarOffset: 30, postSpacing: 74 }));
    expect(b.maxX).toBeGreaterThan(30);
    expect(b.maxY - b.minY).toBeGreaterThan(74);
  });

  it('widens when string spacing increases', () => {
    const narrow = bridgePlateLocalBounds(settings({ type: 'strat-tremolo', stringSpacing: 52.5 }));
    const wide = bridgePlateLocalBounds(settings({ type: 'strat-tremolo', stringSpacing: 73.5 }));
    expect(wide.maxY - wide.minY).toBeGreaterThan(narrow.maxY - narrow.minY);
  });

  it('includes a treble-side arm reach on tremolos', () => {
    const strat = bridgePlateLocalBounds(settings({ type: 'strat-tremolo' }));
    const floyd = bridgePlateLocalBounds(settings({ type: 'floyd-rose' }));
    expect(strat.minY).toBeLessThan(-40);
    expect(floyd.minY).toBeLessThan(-40);
  });
});

describe('bridgeAssemblyPoints', () => {
  it('rotates plate corners around the cluster center', () => {
    const pts = bridgeAssemblyPoints({ x: 100, y: 10 }, 90, settings({ type: 'tom', stopbarOffset: 28 }));
    expect(pts.length).toBe(4);
    for (const p of pts) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
    const xs = pts.map((p) => p.x);
    // 90° sends local +x (stopbar) toward +y in body space.
    expect(Math.max(...pts.map((p) => p.y))).toBeGreaterThan(10);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(20);
  });
});

describe('bridgePlateSvgMarkup', () => {
  it('draws Tele string-through holes and four corner screws on a hardtail', () => {
    const svg = bridgePlateSvgMarkup(settings({ type: 'hardtail', stringCount: 6 }));
    expect(svg).toContain('data-bridge="hardtail"');
    expect(countPart(svg, 'string-hole')).toBe(6);
    expect(countPart(svg, 'mount-screw')).toBe(4);
    expect(countPart(svg, 'string-tail')).toBe(6);
  });

  it('scales hole count with string count', () => {
    const svg = bridgePlateSvgMarkup(settings({ type: 'hardtail', stringCount: 8, stringSpacing: 73.5 }));
    expect(countPart(svg, 'string-hole')).toBe(8);
  });

  it('draws TOM posts, thumbwheels, and a stopbar', () => {
    const svg = bridgePlateSvgMarkup(settings({ type: 'tom' }));
    expect(svg).toContain('data-bridge="tom"');
    expect(countPart(svg, 'tom-post')).toBe(2);
    expect(countPart(svg, 'stopbar')).toBe(1);
    expect(countPart(svg, 'stopbar-post')).toBe(2);
    expect(countPart(svg, 'string-tail')).toBe(6);
  });

  it('draws Floyd pivot posts, fine tuners, and a trem arm', () => {
    const svg = bridgePlateSvgMarkup(settings({ type: 'floyd-rose', stringCount: 6 }));
    expect(svg).toContain('data-bridge="floyd-rose"');
    expect(countPart(svg, 'pivot-post')).toBe(2);
    expect(countPart(svg, 'fine-tuner')).toBe(6);
    expect(countPart(svg, 'trem-arm')).toBe(1);
  });

  it('draws Strat mounting screws and a trem arm', () => {
    const svg = bridgePlateSvgMarkup(settings({ type: 'strat-tremolo', stringCount: 6 }));
    expect(svg).toContain('data-bridge="strat-tremolo"');
    expect(countPart(svg, 'mount-screw')).toBe(6);
    expect(countPart(svg, 'trem-arm')).toBe(1);
    expect(countPart(svg, 'arm-ferrule')).toBe(1);
  });

  it('drops fills in fabrication mode', () => {
    const svg = bridgePlateSvgMarkup(settings({ type: 'hardtail' }), { fabrication: true });
    expect(svg).not.toMatch(/fill="#[0-9a-fA-F]/);
    expect(svg).toContain('fill="none"');
  });
});

describe('saddle glyphs', () => {
  it('makes TOM saddles smaller than stamped Strat saddles', () => {
    const tom = saddleHitSize(settings({ type: 'tom' }));
    const strat = saddleHitSize(settings({ type: 'strat-tremolo' }));
    expect(tom.along).toBeLessThan(strat.along);
    expect(tom.across).toBeLessThanOrEqual(strat.across);
  });

  it('uses brass barrels on hardtails, hex locks on Floyds, stamps on Strats', () => {
    const hardtail = saddleGlyphSvgMarkup(settings({ type: 'hardtail' }));
    const floyd = saddleGlyphSvgMarkup(settings({ type: 'floyd-rose' }));
    const strat = saddleGlyphSvgMarkup(settings({ type: 'strat-tremolo' }));
    const tom = saddleGlyphSvgMarkup(settings({ type: 'tom' }));
    expect(hardtail).toContain('data-saddle="hardtail"');
    expect(floyd).toContain('data-saddle="floyd-rose"');
    expect(strat).toContain('data-saddle="strat-tremolo"');
    expect(tom).toContain('data-saddle="tom"');
    expect(countPart(floyd, 'hex-grub')).toBe(1);
    expect(countPart(strat, 'height-screw')).toBe(2);
    expect(hardtail).toContain('#c9a24a');
    expect(hardtail).toMatch(/ellipse/i);
  });

  it('paints a selection stroke when selected', () => {
    const svg = saddleGlyphSvgMarkup(settings({ type: 'strat-tremolo' }), { selected: true });
    expect(svg).toContain('#ff5533');
  });
});

describe('SVG export', () => {
  it('embeds the bridge assembly and saddle glyphs instead of saddle dots', () => {
    const tele = getBodyTemplate('tele');
    const layers = defaultLayers();
    const doc = {
      version: DESIGN_DOCUMENT_VERSION,
      templateId: tele.id,
      bodyParams: { ...tele.defaultParams },
      bodyAnchors: computeParametricAnchors(tele, tele.defaultParams),
      neckParams: { ...tele.defaultNeckParams },
      hardware: structuredClone(tele.defaultHardware),
      bridgeSettings: { ...DEFAULT_BRIDGE_SETTINGS, type: 'hardtail' as const },
      nutSettings: { ...DEFAULT_NUT_SETTINGS },
      settings: {
        unit: 'mm' as const,
        theme: 'dark' as const,
        view: 'top' as const,
        gridSize: 5,
        gridSnapEnabled: false,
        showPointsAndHandles: true,
        showDebugOverlay: false,
        canvasPadding: 40,
      },
      layers,
    };
    const svg = buildSvgDocument(doc, 'clean');
    expect(svg).toContain('id="bridge-assembly"');
    expect(svg).toContain('data-bridge="hardtail"');
    expect(svg).toContain('data-saddle="hardtail"');
    expect(svg).not.toMatch(/<circle [^>]*r="3"[^>]*fill="#888"/);
  });
});
