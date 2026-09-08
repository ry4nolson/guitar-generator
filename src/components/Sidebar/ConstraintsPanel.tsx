import { useConstraintViolations } from '../../hooks/useConstraintViolations';

/** Live constraint violations. Body self-intersection is blocked on edit; this list still flags loaded/tangled outlines and hardware fit. */
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
