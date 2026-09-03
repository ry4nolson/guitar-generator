// Canvas keyboard shortcuts: Undo/Redo (⌘/Ctrl+Z / ⌘/Ctrl+Shift+Z), Fit (F),
// Reset View (0), Escape clears selection, Delete/Backspace resets a selected
// manual override after confirmation. Arrow-key nudging stays in useKeyboardNudge.

import { useEffect } from 'react';
import { useDesignStore } from '../state/store';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true;
  return target.isContentEditable;
}

export function useEditorShortcuts({ fit, resetView }: { fit: () => void; resetView: () => void }) {
  const select = useDesignStore((s) => s.select);
  const resetAnchorPoint = useDesignStore((s) => s.resetAnchorPoint);
  const resetFeature = useDesignStore((s) => s.resetFeature);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // Undo / redo — handle before the modifier bail-out below. Prefer design
      // history over the browser's (mostly useless) field undo on number inputs.
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) useDesignStore.getState().redo();
        else useDesignStore.getState().undo();
        return;
      }
      if (mod && key === 'y' && !e.shiftKey) {
        // Windows / Linux alternate redo
        e.preventDefault();
        useDesignStore.getState().redo();
        return;
      }

      if (isTypingTarget(e.target)) return;
      if (mod || e.altKey) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        select(null);
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        fit();
        return;
      }

      if (e.key === '0') {
        e.preventDefault();
        resetView();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selected = useDesignStore.getState().selected;
        if (!selected) return;

        if (selected.kind === 'anchor') {
          const anchor = useDesignStore.getState().bodyAnchors.find((a) => a.id === selected.id);
          if (!anchor?.manuallyEdited) return;
          e.preventDefault();
          if (confirm(`Reset manual override on “${anchor.id}” back to the template?`)) {
            resetAnchorPoint(anchor.id);
          }
          return;
        }

        if (selected.kind === 'feature') {
          const dirty = useDesignStore
            .getState()
            .bodyAnchors.some((a) => a.featureId === selected.id && a.manuallyEdited);
          if (!dirty) return;
          e.preventDefault();
          if (confirm(`Reset all manual overrides on feature “${selected.id}”?`)) {
            resetFeature(selected.id);
          }
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fit, resetView, select, resetAnchorPoint, resetFeature]);
}
