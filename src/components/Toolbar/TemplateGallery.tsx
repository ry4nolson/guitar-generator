import { useMemo } from 'react';
import { BODY_TEMPLATES } from '../../geometry/templates';
import { computeParametricAnchors } from '../../geometry/bodyModel';
import { anchorsToPathD } from '../../geometry/svgPath';
import { useDesignStore } from '../../state/store';

/**
 * Compact silhouette cards for the three body templates. Previews are built
 * from the real parametric geometry (same path the editor uses), not decorative art.
 */
export function TemplateGallery({ onSelect }: { onSelect: (templateId: string) => void }) {
  const templateId = useDesignStore((s) => s.templateId);

  const previews = useMemo(
    () =>
      BODY_TEMPLATES.map((t) => {
        const anchors = computeParametricAnchors(t, t.defaultParams);
        const d = anchorsToPathD(anchors);
        const xs = anchors.map((a) => a.position.x);
        const ys = anchors.map((a) => a.position.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const pad = 14;
        const width = maxX - minX + pad * 2;
        const height = maxY - minY + pad * 2;
        // scale(1,-1) flips body-local +y (bass/up) to screen-up; viewBox uses negated Y.
        const viewBox = `${minX - pad} ${-maxY - pad} ${width} ${height}`;
        return { id: t.id, name: t.name, description: t.description, d, viewBox };
      }),
    [],
  );

  return (
    <div className="template-gallery" role="listbox" aria-label="Body templates">
      {previews.map((p) => {
        const active = p.id === templateId;
        return (
          <button
            key={p.id}
            type="button"
            role="option"
            aria-selected={active}
            className={`template-card${active ? ' active' : ''}`}
            title={p.description}
            onClick={() => onSelect(p.id)}
          >
            <svg className="template-card-svg" viewBox={p.viewBox} aria-hidden="true">
              <g transform="scale(1,-1)">
                <path d={p.d} fill="currentColor" />
              </g>
            </svg>
            <span className="template-card-name">{p.name}</span>
          </button>
        );
      })}
    </div>
  );
}
