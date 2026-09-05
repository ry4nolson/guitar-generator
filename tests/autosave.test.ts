import { describe, it, expect, beforeEach } from 'vitest';
import { AUTOSAVE_KEY, useDesignStore } from '../src/state/store';

describe('design autosave', () => {
  beforeEach(() => {
    localStorage.removeItem(AUTOSAVE_KEY);
    useDesignStore.getState().resetToDefaults();
  });

  it('writes the current guitar to localStorage', () => {
    useDesignStore.getState().setNeckParam('fretCount', 24);
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as { neckParams: { fretCount: number } };
    expect(parsed.neckParams.fretCount).toBe(24);
  });
});
