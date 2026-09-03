import { DEFAULT_BODY_COLOR, DEFAULT_FRETBOARD_COLOR } from './color';

export const FINISH_PRESETS = [
  { id: 'amber', label: 'Amber burst', body: DEFAULT_BODY_COLOR, board: DEFAULT_FRETBOARD_COLOR },
  { id: 'butterscotch', label: 'Butterscotch', body: '#d8a84c', board: '#c4a06a' },
  { id: 'black', label: 'Black', body: '#1c1c1c', board: DEFAULT_FRETBOARD_COLOR },
  { id: 'white', label: 'Olympic white', body: '#f4f0e6', board: DEFAULT_FRETBOARD_COLOR },
] as const;

export type FinishPresetId = (typeof FINISH_PRESETS)[number]['id'];
