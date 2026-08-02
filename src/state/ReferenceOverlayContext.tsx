import { createContext, useContext, type ReactNode } from 'react';
import { useReferenceOverlay, type ReferenceOverlayApi } from '../hooks/useReferenceOverlay';

const ReferenceOverlayContext = createContext<ReferenceOverlayApi | null>(null);

export function ReferenceOverlayProvider({ children }: { children: ReactNode }) {
  const api = useReferenceOverlay();
  return <ReferenceOverlayContext.Provider value={api}>{children}</ReferenceOverlayContext.Provider>;
}

export function useReferenceOverlayContext(): ReferenceOverlayApi {
  const ctx = useContext(ReferenceOverlayContext);
  if (!ctx) throw new Error('useReferenceOverlayContext must be used within ReferenceOverlayProvider');
  return ctx;
}
