import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { IconChevron } from './icons';

export function SplitMenu({
  label,
  icon,
  items,
  title,
}: {
  label: string;
  icon?: ReactNode;
  title?: string;
  items: { label: string; onClick: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useLayoutEffect(() => {
    if (!open || !wrapRef.current) return;
    const update = () => {
      const r = wrapRef.current!.getBoundingClientRect();
      setCoords({ top: r.bottom + 4, left: r.left });
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

  return (
    <div className="split-menu" ref={wrapRef}>
      <button
        type="button"
        className="toolbar-btn split-menu-trigger"
        title={title ?? label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        {icon}
        <span className="toolbar-btn-label">{label}</span>
        <IconChevron />
      </button>
      {open && (
        <div
          className="split-menu-list"
          role="menu"
          id={menuId}
          style={{ top: coords.top, left: coords.left }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
