import { useMemo } from 'react';
import { useDesignStore } from '../state/store';
import { evaluateConstraints } from '../geometry/constraints';
import type { ConstraintViolation } from '../geometry/constraints';

export function useConstraintViolations(): ConstraintViolation[] {
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
  const headstockAnchors = useDesignStore((s) => s.headstockAnchors);
  const pickupSettings = useDesignStore((s) => s.pickupSettings);
  const controlSettings = useDesignStore((s) => s.controlSettings);
  const version = useDesignStore((s) => s.version);

  return useMemo(
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
        headstockAnchors,
        pickupSettings,
        controlSettings,
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
      headstockAnchors,
      pickupSettings,
      controlSettings,
      settings,
      layers,
    ],
  );
}
