export type ChangelogKind = 'Added' | 'Changed' | 'Fixed' | 'Tests';

export interface ChangelogItem {
  id: string;
  kind: ChangelogKind;
  text: string;
}

export interface ChangelogGroup {
  kind: ChangelogKind;
  items: ChangelogItem[];
}

export interface ChangelogVersion {
  title: string;
  intro: string;
  groups: ChangelogGroup[];
}

export interface ChangelogDoc {
  versions: ChangelogVersion[];
}

const KINDS = new Set<ChangelogKind>(['Added', 'Changed', 'Fixed', 'Tests']);

export function entryId(version: string, kind: ChangelogKind, text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return `${version}::${kind}::${normalized.slice(0, 160)}`;
}

function kindFromHeading(title: string): ChangelogKind | null {
  const name = title.trim() as ChangelogKind;
  return KINDS.has(name) ? name : null;
}

/** Parse Keep-a-Changelog markdown (`## version`, `### Added`, `- bullets`). */
export function parseChangelog(markdown: string): ChangelogDoc {
  const versions: ChangelogVersion[] = [];
  let current: ChangelogVersion | null = null;
  let currentGroup: ChangelogGroup | null = null;
  let currentItem: ChangelogItem | null = null;
  const intro: string[] = [];

  const flushItem = () => {
    if (!currentItem || !currentGroup) return;
    currentItem.text = currentItem.text.replace(/\s+/g, ' ').trim();
    if (currentItem.text) currentGroup.items.push(currentItem);
    currentItem = null;
  };

  const flushIntro = () => {
    if (!current || intro.length === 0) return;
    current.intro = intro.join(' ').replace(/\s+/g, ' ').trim();
    intro.length = 0;
  };

  const startVersion = (title: string) => {
    flushItem();
    flushIntro();
    currentGroup = null;
    current = { title, intro: '', groups: [] };
    versions.push(current);
  };

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    if (line.startsWith('# ') && !line.startsWith('## ')) continue;

    if (line.startsWith('## ')) {
      startVersion(line.slice(3).trim());
      continue;
    }
    if (!current) continue;

    if (line.startsWith('### ')) {
      flushItem();
      flushIntro();
      const kind = kindFromHeading(line.slice(4));
      currentGroup = kind ? { kind, items: [] } : null;
      if (currentGroup) current.groups.push(currentGroup);
      continue;
    }

    if (line.startsWith('- ') && currentGroup) {
      flushItem();
      const text = line.slice(2).trim();
      currentItem = { id: entryId(current.title, currentGroup.kind, text), kind: currentGroup.kind, text };
      continue;
    }

    if (currentItem && (line.startsWith('  ') || line.startsWith('\t'))) {
      currentItem.text += ` ${line.trim()}`;
      continue;
    }

    if (!currentGroup && line.trim()) {
      intro.push(line.trim());
    }
  }

  flushItem();
  flushIntro();
  return { versions };
}

/** Newest version's first Added block — those are the badge-able "new features". */
export function latestAddedItems(doc: ChangelogDoc): ChangelogItem[] {
  const latest = doc.versions[0];
  if (!latest) return [];
  const firstAdded = latest.groups.find((g) => g.kind === 'Added');
  return firstAdded?.items ?? [];
}

export function allItemIds(doc: ChangelogDoc): string[] {
  return doc.versions.flatMap((v) => v.groups.flatMap((g) => g.items.map((i) => i.id)));
}
