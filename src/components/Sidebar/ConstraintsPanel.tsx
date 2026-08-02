import { useMemo } from 'react';
import { useDesignStore } from '../../state/store';
import { evaluateConstraints } from '../../geometry/constraints';

/** Live, advisory constraint violations (not blocking) — see geometry/constraints.ts. */
export function ConstraintsPanel() {
  const templateId = useDesignStore((s) => s.templateId);
  const bodyParams = useDesignStore((s) => s.bodyParams);
  const bodyAnchors = useDesignStore((s) => s.bodyAnchors);
  const neckParams = useDesignStore((s) => s.neckParams);
  const hardware = useDesignStore((s) => s.hardware);
  const settings = useDesignStore((s) => s.settings);
  const layers = useDesignStore((s) => s.layers);
  const bridgeSettings = useDesignStore((s) => s.bridgeSettings);
  const nutSettings = useDesignStore((s) => s.nutSettings);
  const headstockSettings = useDesignStore((s) => s.headstockSettings);
  const version = useDesignStore((s) => s.version);

  const violations = useMemo(
    () =>
      evaluateConstraints({
        version,
        templateId,
        bodyParams,
        bodyAnchors,
        neckParams,
        hardware,
        bridgeSettings,
        nutSettings,
        headstockSettings,
        settings,
        layers,
      }),
    [
      version,
      templateId,
      bodyParams,
      bodyAnchors,
      neckParams,
      hardware,
      bridgeSettings,
      nutSettings,
      headstockSettings,
      settings,
      layers,
    ],
  );

  return (
    <section className="sidebar-section">
      <h3>Constraints</h3>
      {violations.length === 0 ? (
        <p className="muted">No constraint violations.</p>
      ) : (
        <ul className="constraint-list">
          {violations.map((v, i) => (
            <li key={i} className={`constraint-${v.severity}`}>
              {v.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
