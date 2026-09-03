import { create } from 'zustand';
import type { InspectorStation } from '../components/Sidebar/scrollToSelection';

interface UiState {
  activeStation: InspectorStation;
  setStation: (station: InspectorStation) => void;
  galleryOpen: boolean;
  setGalleryOpen: (open: boolean) => void;
}

/** Session-only chrome state — not part of the design document. */
export const useUiStore = create<UiState>((set) => ({
  activeStation: 'shape',
  setStation: (activeStation) => set({ activeStation }),
  galleryOpen: false,
  setGalleryOpen: (galleryOpen) => set({ galleryOpen }),
}));
