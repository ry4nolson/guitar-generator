import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import { latestAddedItems, latestReleasedVersion, parseChangelog } from '../src/changelog/parseChangelog';
import { latestReleasedVersion as scriptLatestReleasedVersion, withPackageVersion } from '../scripts/sync-package-version.mjs';
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
    const added = latestAddedItems(doc).map((i) => i.text).join(' ');
    expect(added).toContain('P-style');
    expect(added).toContain('Violin');
    expect(doc.versions.some((v) => v.title.startsWith('0.6.0'))).toBe(true);
    expect(doc.versions.some((v) => v.title.startsWith('0.5.0'))).toBe(true);
  });
});

describe('package.json version follows the changelog', () => {
  it('reads the first numbered heading, skipping Unreleased', () => {
    expect(latestReleasedVersion(SAMPLE)).toBe('0.5.3');
    expect(scriptLatestReleasedVersion(SAMPLE)).toBe('0.5.3');
    expect(latestReleasedVersion('# Changelog\n\n## Unreleased\n')).toBeNull();
  });

  it('matches package.json to CHANGELOG.md', () => {
    const md = readFileSync(resolve(process.cwd(), 'CHANGELOG.md'), 'utf8');
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
    expect(latestReleasedVersion(md)).toBe('0.6.0');
    expect(pkg.version).toBe(latestReleasedVersion(md));
  });

  it('rewrites package.json only when the version differs', () => {
    const original = '{\n  "name": "guitloft",\n  "version": "0.0.0"\n}\n';
    const bumped = withPackageVersion(original, '0.6.0');
    expect(bumped.changed).toBe(true);
    expect(bumped.previous).toBe('0.0.0');
    expect(JSON.parse(bumped.text).version).toBe('0.6.0');
    expect(withPackageVersion(bumped.text, '0.6.0').changed).toBe(false);
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
