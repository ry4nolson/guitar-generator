import { describe, it, expect } from 'vitest';
import { wheelGesture } from '../src/hooks/useViewport';

describe('wheelGesture', () => {
  it('treats macOS pinch (ctrl+wheel) as zoom', () => {
    expect(wheelGesture({ ctrlKey: true, metaKey: false, deltaX: 0, deltaY: 20, deltaMode: 0 })).toBe('zoom');
  });

  it('treats cmd+scroll as zoom', () => {
    expect(wheelGesture({ ctrlKey: false, metaKey: true, deltaX: 0, deltaY: 120, deltaMode: 0 })).toBe('zoom');
  });

  it('treats trackpad two-finger scroll as pan', () => {
    expect(wheelGesture({ ctrlKey: false, metaKey: false, deltaX: 4, deltaY: 8, deltaMode: 0 })).toBe('pan');
    expect(wheelGesture({ ctrlKey: false, metaKey: false, deltaX: 0, deltaY: 12, deltaMode: 0 })).toBe('pan');
  });

  it('treats discrete mouse-wheel ticks as zoom', () => {
    expect(wheelGesture({ ctrlKey: false, metaKey: false, deltaX: 0, deltaY: 120, deltaMode: 0 })).toBe('zoom');
    expect(wheelGesture({ ctrlKey: false, metaKey: false, deltaX: 0, deltaY: 1, deltaMode: 1 })).toBe('zoom');
  });

  it('treats shift+wheel as pan', () => {
    expect(
      wheelGesture({ ctrlKey: false, metaKey: false, shiftKey: true, deltaX: 0, deltaY: 120, deltaMode: 0 }),
    ).toBe('pan');
  });
});
