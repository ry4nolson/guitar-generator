import { useEffect, useMemo } from 'react';
import { BODY_TEMPLATES, groupedTemplates, shortTemplateName, templateHardwareHint } from '../../geometry/templates';
import { computeParametricAnchors } from '../../geometry/bodyModel';
import { anchorsToPathD } from '../../geometry/svgPath';
import { useDesignStore, DEFAULT_BODY_COLOR } from '../../state/store';
import { useUiStore } from '../../state/uiStore';
import { IconChevron } from './icons';
import type { BodyAnchor } from '../../geometry/types';

function silhouetteViewBox(anchors: BodyAnchor[]) {
  const xs = anchors.map((a) => a.position.x);
  const ys = anchors.map((a) => a.position.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = 14;
  const width = maxX - minX + pad * 2;
  const height = maxY - minY + pad * 2;
  // Match the editor stage: scale(-1,-1) so the neck pocket sits on the right
  // (headstock points right) instead of the body-local +x-to-the-right look.
  const viewBox = `${-maxX - pad} ${-maxY - pad} ${width} ${height}`;
  return { d: anchorsToPathD(anchors), viewBox };
}

function Silhouette({ anchors, className }: { anchors: BodyAnchor[]; className?: string }) {
  const { d, viewBox } = silhouetteViewBox(anchors);
  return (
    <svg className={className} viewBox={viewBox} aria-hidden="true">
      <g transform="scale(-1,-1)">
        <path d={d} fill="currentColor" />
      </g>
    </svg>
  );
}

export function confirmTemplateSwitch(nextId: string): boolean {
  const s = useDesignStore.getState();
  if (nextId === s.templateId) return false;
  if (s.isBodyDirty()) {
    return confirm(
      'You have manual body edits. Switching templates will discard those edits and reset body geometry/hardware.\n\nSwitch and discard edits?',
    );
  }
  return true;
}

export function BodyPickerButton() {
  const templateId = useDesignStore((s) => s.templateId);
  const bodyAnchors = useDesignStore((s) => s.bodyAnchors);
  const bodyColor = useDesignStore((s) => s.settings.bodyColor) || DEFAULT_BODY_COLOR;
  const setGalleryOpen = useUiStore((s) => s.setGalleryOpen);
  const template = BODY_TEMPLATES.find((t) => t.id === templateId) ?? BODY_TEMPLATES[0];

  return (
    <button
      type="button"
      className="body-picker-btn"
      aria-haspopup="dialog"
      title={template.description}
      onClick={() => setGalleryOpen(true)}
    >
      <span className="body-picker-svg" style={{ color: bodyColor }}>
        <Silhouette anchors={bodyAnchors} />
      </span>
      <span className="body-picker-meta">
        <span className="body-picker-name">{shortTemplateName(template.name)}</span>
        <span className="body-picker-hint">{templateHardwareHint(template)}</span>
      </span>
      <IconChevron />
    </button>
  );
}

export function TemplateGalleryOverlay() {
  const open = useUiStore((s) => s.galleryOpen);
  const setGalleryOpen = useUiStore((s) => s.setGalleryOpen);
  const templateId = useDesignStore((s) => s.templateId);
  const setTemplate = useDesignStore((s) => s.setTemplate);
  const bodyColor = useDesignStore((s) => s.settings.bodyColor) || DEFAULT_BODY_COLOR;

  const groups = useMemo(() => groupedTemplates(BODY_TEMPLATES), []);
  const previews = useMemo(
    () =>
      BODY_TEMPLATES.map((t) => {
        const anchors = computeParametricAnchors(t, t.defaultParams);
        return { id: t.id, template: t, anchors };
      }),
    [],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGalleryOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, setGalleryOpen]);

  if (!open) return null;

  const onSelect = (id: string) => {
    if (!confirmTemplateSwitch(id)) {
      if (id === useDesignStore.getState().templateId) setGalleryOpen(false);
      return;
    }
    setTemplate(id);
    setGalleryOpen(false);
  };

  return (
    <div className="gallery-overlay" role="presentation">
      <button type="button" className="gallery-scrim" aria-label="Close body gallery" onClick={() => setGalleryOpen(false)} />
      <div className="gallery-panel" role="dialog" aria-label="Body templates">
        <div className="gallery-header">
          <h2>Choose a body</h2>
          <button type="button" className="toolbar-btn" onClick={() => setGalleryOpen(false)}>
            Close
          </button>
        </div>
        {groups.map((group) => (
          <section key={group.id} className="gallery-family">
            <h3>{group.label}</h3>
            <div className="gallery-grid">
              {group.templates.map((t) => {
                const preview = previews.find((p) => p.id === t.id);
                if (!preview) return null;
                const active = t.id === templateId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`gallery-card${active ? ' active' : ''}`}
                    title={t.description}
                    onClick={() => onSelect(t.id)}
                  >
                    <span className="gallery-card-svg" style={{ color: bodyColor }}>
                      <Silhouette anchors={preview.anchors} />
                    </span>
                    <span className="gallery-card-name">{shortTemplateName(t.name)}</span>
                    <span className="gallery-card-hint">{templateHardwareHint(t)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
