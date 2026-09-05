import { useEffect, useState } from 'react';
import { fetchRemoteBuildId, isNewerDeploy } from '../update/deployVersion';

const POLL_MS = 2 * 60 * 1000;

/** True when the published Netlify deploy no longer matches this tab’s build. */
export function useDeployUpdate(): boolean {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    let cancelled = false;

    const check = async () => {
      try {
        const remote = await fetchRemoteBuildId(import.meta.env.BASE_URL);
        if (!cancelled && isNewerDeploy(__APP_BUILD_ID__, remote)) setAvailable(true);
      } catch {
        // offline / adblock — ignore
      }
    };

    void check();
    const timer = window.setInterval(check, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return available;
}
