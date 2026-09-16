#!/usr/bin/env node
// Copy version-sync hooks into .git/hooks. Does not change git config.
import { chmodSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const destDir = join(root, '.git/hooks');
if (!existsSync(destDir)) {
  process.exit(0);
}

for (const name of ['pre-commit', 'pre-push']) {
  const src = join(root, 'scripts/git-hooks', name);
  const dest = join(destDir, name);
  try {
    copyFileSync(src, dest);
    chmodSync(dest, 0o755);
  } catch (err) {
    // CI/sandbox may not allow writing .git/hooks; the next local npm install will.
    if (err && (err.code === 'EPERM' || err.code === 'EACCES')) process.exit(0);
    throw err;
  }
}
