import { describe, it, expect, beforeEach } from 'vitest';
import {
  APP_SETTINGS_KEY,
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  persistAppSettings,
  pickAppSettings,
} from '../src/state/appSettings';
import { useDesignStore, DEFAULT_BODY_COLOR } from '../src/state/store';

describe('pickAppSettings', () => {
  it('keeps only known chrome prefs', () => {
    expect(
      pickAppSettings({
        theme: 'light',
        unit: 'in',
        bodyColor: '#ff0000',
        view: 'back',
        gridSize: 10,
        bogus: true,
      }),
    ).toEqual({
      theme: 'light',
      unit: 'in',
      view: 'back',
      gridSize: 10,
    });
  });

  it('ignores invalid values', () => {
    expect(pickAppSettings({ theme: 'sepia', unit: 'cm', gridSize: 'wide' })).toEqual({});
  });
});

describe('loadAppSettings', () => {
  beforeEach(() => {
    localStorage.removeItem(APP_SETTINGS_KEY);
  });

  it('seeds from a legacy design settings blob when no app key exists', () => {
    const loaded = loadAppSettings({ theme: 'light', unit: 'in', bodyColor: '#112233' });
    expect(loaded.theme).toBe('light');
    expect(loaded.unit).toBe('in');
    expect(loaded.view).toBe(DEFAULT_APP_SETTINGS.view);
    expect(JSON.parse(localStorage.getItem(APP_SETTINGS_KEY)!).theme).toBe('light');
  });

  it('prefers the dedicated key over a design-document seed', () => {
    persistAppSettings({ ...DEFAULT_APP_SETTINGS, theme: 'light' });
    const loaded = loadAppSettings({ theme: 'dark' });
    expect(loaded.theme).toBe('light');
  });
});

describe('reset / load keep app settings', () => {
  beforeEach(() => {
    useDesignStore.getState().resetToDefaults();
    useDesignStore.getState().resetAppSettings();
  });

  it('reset all keeps theme and units, and still resets finish', () => {
    useDesignStore.getState().setTheme('light');
    useDesignStore.getState().setUnit('in');
    useDesignStore.getState().setBodyColor('#112233');

    useDesignStore.getState().resetToDefaults();

    const s = useDesignStore.getState();
    expect(s.appSettings.theme).toBe('light');
    expect(s.appSettings.unit).toBe('in');
    expect(s.settings.bodyColor).toBe(DEFAULT_BODY_COLOR);
    expect(s.settings.theme).toBeUndefined();
  });

  it('loading a design does not apply that file’s theme', () => {
    useDesignStore.getState().setTheme('light');
    const snapshot = useDesignStore.getState();
    useDesignStore.getState().loadDocument({
      version: snapshot.version,
      templateId: snapshot.templateId,
      bodyParams: snapshot.bodyParams,
      bodyAnchors: snapshot.bodyAnchors,
      neckParams: snapshot.neckParams,
      hardware: snapshot.hardware,
      bridgeSettings: snapshot.bridgeSettings,
      nutSettings: snapshot.nutSettings,
      headstockSettings: snapshot.headstockSettings,
      headstockAnchors: snapshot.headstockAnchors,
      pickupSettings: snapshot.pickupSettings,
      controlSettings: snapshot.controlSettings,
      settings: { ...snapshot.settings, theme: 'dark', bodyColor: '#abcdef' },
      layers: snapshot.layers,
    });

    const s = useDesignStore.getState();
    expect(s.appSettings.theme).toBe('light');
    expect(s.settings.bodyColor).toBe('#abcdef');
  });

  it('persists theme to its own localStorage key', () => {
    useDesignStore.getState().setTheme('light');
    const stored = JSON.parse(localStorage.getItem(APP_SETTINGS_KEY)!);
    expect(stored.theme).toBe('light');
  });
});
