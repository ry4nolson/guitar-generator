import { allItemIds, latestAddedItems, type ChangelogDoc } from './parseChangelog';

export const CHANGELOG_SEEN_KEY = 'guitloft-changelog-seen';

export function loadSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(CHANGELOG_SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

export function saveSeenIds(ids: Set<string>): void {
  try {
    localStorage.setItem(CHANGELOG_SEEN_KEY, JSON.stringify([...ids]));
  } catch {
    // private mode / quota
  }
}

export function unseenAddedCount(doc: ChangelogDoc, seen: Set<string>): number {
  return latestAddedItems(doc).filter((item) => !seen.has(item.id)).length;
}

/** Mark every current changelog item as seen (opening the panel). */
export function markChangelogSeen(doc: ChangelogDoc): Set<string> {
  const next = new Set(loadSeenIds());
  for (const id of allItemIds(doc)) next.add(id);
  saveSeenIds(next);
  return next;
}
