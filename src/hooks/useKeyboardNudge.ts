// Arrow-key nudging for whatever anchor point is currently selected.
// Shift+arrow moves by 10x the base step. Ignored while typing in an input.
import { useEffect } from 'react';
import { useDesignStore } from '../state/store';

const BASE_STEP_MM = 0.5;

export function useKeyboardNudge() {
  const selected = useDesignStore((s) => s.selected);
  const nudge = useDesignStore((s) => s.nudgeAnchorPoint);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (!selected || selected.kind !== 'anchor' || selected.part !== 'position') return;

      const step = (e.shiftKey ? 10 : 1) * BASE_STEP_MM;
      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else return;

      e.preventDefault();
      nudge(selected.id, dx, dy);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, nudge]);
}
