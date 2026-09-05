import { describe, it, expect } from 'vitest';
import { isNewerDeploy, parseVersionPayload } from '../src/update/deployVersion';

describe('deploy version check', () => {
  it('reads an id from version.json', () => {
    expect(parseVersionPayload({ id: 'abc123', commit: 'deadbeef' })).toBe('abc123');
    expect(parseVersionPayload({ id: '' })).toBeNull();
    expect(parseVersionPayload({})).toBeNull();
    expect(parseVersionPayload(null)).toBeNull();
  });

  it('treats a different remote id as a newer deploy', () => {
    expect(isNewerDeploy('old', 'new')).toBe(true);
    expect(isNewerDeploy('same', 'same')).toBe(false);
    expect(isNewerDeploy('old', null)).toBe(false);
    expect(isNewerDeploy('', 'new')).toBe(false);
  });
});
