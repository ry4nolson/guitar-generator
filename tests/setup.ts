import { beforeEach } from 'vitest';
import { useDesignStore } from '../src/state/store';

beforeEach(() => {
  useDesignStore.getState().resetAppSettings();
});
