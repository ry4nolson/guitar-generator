import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import changelogMarkdown from '../../../CHANGELOG.md?raw';
import { latestAddedItems, parseChangelog } from '../../changelog/parseChangelog';
import { loadSeenIds, markChangelogSeen, unseenAddedCount } from '../../changelog/seen';
import { IconChangelog } from './icons';

const VISIBLE_KINDS = new Set(['Added', 'Changed', 'Fixed']);

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:[^)]+)\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[2]) {
      nodes.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[3] && match[4]) {
      nodes.push(
        <a key={key++} href={match[4]} target="_blank" rel="noreferrer">
          {match[3]}
        </a>,
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function ChangelogButton() {
  const changelog = useMemo(() => parseChangelog(changelogMarkdown), []);
  const [seen, setSeen] = useState(loadSeenIds);
  const [highlightIds, setHighlightIds] = useState<Set<string>>(() => new Set());
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 48, right: 12 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const unseen = unseenAddedCount(changelog, seen);

  const openPanel = () => {
    setHighlightIds(new Set(latestAddedItems(changelog).filter((item) => !seen.has(item.id)).map((item) => item.id)));
    setSeen(markChangelogSeen(changelog));
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open || !wrapRef.current) return;
    const update = () => {
      const r = wrapRef.current!.getBoundingClientRect();
      setCoords({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const badge = unseen > 9 ? '9+' : unseen > 0 ? String(unseen) : '';

  return (
    <div className="changelog-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`toolbar-btn icon-only${open ? ' active' : ''}`}
        title={unseen > 0 ? `What's new (${unseen})` : "What's new"}
        aria-label={unseen > 0 ? `What's new, ${unseen} unseen` : "What's new"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPanel())}
      >
        <IconChangelog />
        {badge && <span className="station-badge changelog-badge">{badge}</span>}
      </button>
      {open && (
        <div
          className="changelog-panel"
          role="dialog"
          aria-label="What's new"
          style={{ top: coords.top, right: coords.right }}
        >
          <header className="changelog-header">
            <h2>What's new</h2>
            <p className="muted">Your guitar is saved automatically in this browser.</p>
          </header>
          <div className="changelog-body">
            {changelog.versions.map((version) => (
              <section key={version.title} className="changelog-version">
                <h3>{version.title}</h3>
                {version.intro && <p className="muted changelog-intro">{version.intro}</p>}
                {version.groups
                  .filter((group) => VISIBLE_KINDS.has(group.kind) && group.items.length > 0)
                  .map((group, gi) => (
                    <div key={`${version.title}-${group.kind}-${gi}`} className="changelog-group">
                      <h4 className={`changelog-kind kind-${group.kind.toLowerCase()}`}>{group.kind}</h4>
                      <ul>
                        {group.items.map((item) => (
                          <li
                            key={item.id}
                            className={highlightIds.has(item.id) ? 'changelog-new' : undefined}
                          >
                            {renderInline(item.text)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
