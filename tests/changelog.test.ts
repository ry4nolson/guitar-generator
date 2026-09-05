import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import { latestAddedItems, parseChangelog } from '../src/changelog/parseChangelog';
import {
  CHANGELOG_SEEN_KEY,
  loadSeenIds,
  markChangelogSeen,
  unseenAddedCount,
} from '../src/changelog/seen';

const SAMPLE = `# Changelog

## Unreleased

Intro line for this cycle.

### Added

- **New panel** next to the theme toggle.
- Autosave flushes on tab hide.

### Changed

- Settings live on a gear tab.

### Added

- Older backlog feature that should not badge.

## 0.5.3 — Multi-string

### Fixed

- Strings draw above pickups.
`;

describe('parseChangelog', () => {
  it('groups versions, kinds, and wrapped bullets', () => {
    const doc = parseChangelog(SAMPLE);
    expect(doc.versions.map((v) => v.title)).toEqual(['Unreleased', '0.5.3 — Multi-string']);
    expect(doc.versions[0].intro).toContain('Intro line');
    expect(doc.versions[0].groups[0].kind).toBe('Added');
    expect(doc.versions[0].groups[0].items).toHaveLength(2);
    expect(doc.versions[0].groups[0].items[0].text).toContain('New panel');
    expect(doc.versions[0].groups[2].items[0].text).toContain('Older backlog');
  });

  it('badges only the first Added block of the latest version', () => {
    const doc = parseChangelog(SAMPLE);
    const latest = latestAddedItems(doc).map((i) => i.text);
    expect(latest).toHaveLength(2);
    expect(latest[0]).toContain('New panel');
    expect(latest.join(' ')).not.toContain('Older backlog');
  });

  it('parses the repo CHANGELOG.md', () => {
    const md = readFileSync(resolve(process.cwd(), 'CHANGELOG.md'), 'utf8');
    const doc = parseChangelog(md);
    expect(doc.versions[0].title).toBe('Unreleased');
    expect(latestAddedItems(doc).length).toBeGreaterThan(0);
    expect(doc.versions.some((v) => v.title.startsWith('0.5.0'))).toBe(true);
  });
});

describe('changelog seen state', () => {
  beforeEach(() => {
    localStorage.removeItem(CHANGELOG_SEEN_KEY);
  });

  it('counts unseen added items and clears them after open', () => {
    const doc = parseChangelog(SAMPLE);
    expect(unseenAddedCount(doc, loadSeenIds())).toBe(2);
    const next = markChangelogSeen(doc);
    expect(unseenAddedCount(doc, next)).toBe(0);
    expect(loadSeenIds().size).toBeGreaterThan(2);
  });
});
