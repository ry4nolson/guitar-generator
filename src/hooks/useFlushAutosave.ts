import { useEffect } from 'react';
import { useDesignStore } from '../state/store';

/** Flush the in-memory guitar to localStorage on hide/unload so a tab close is safe. */
export function useFlushAutosave() {
  useEffect(() => {
    const flush = () => useDesignStore.getState().autosave();
    flush();
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, []);
}
