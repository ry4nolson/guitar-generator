import { useConstraintViolations } from '../../hooks/useConstraintViolations';

/** Live, advisory constraint violations (not blocking) — see geometry/constraints.ts. */
export function ConstraintsPanel() {
  const violations = useConstraintViolations();

  if (violations.length === 0) return null;

  return (
    <section className="sidebar-section">
      <h3>Constraints</h3>
      <ul className="constraint-list">
        {violations.map((v, i) => (
          <li key={i} className={`constraint-${v.severity}`}>
            {v.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
