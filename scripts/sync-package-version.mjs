#!/usr/bin/env node
// Keep package.json's version equal to the latest numbered CHANGELOG.md heading
// (`## 0.6.0 — …`). Unreleased is ignored. Used by git pre-commit / pre-push.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** First `## x.y.z` heading; same rule as src/changelog/parseChangelog.ts. */
export function latestReleasedVersion(markdown) {
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith('## ')) continue;
    const match = /^(\d+\.\d+\.\d+)\b/.exec(line.slice(3).trim());
    if (match) return match[1];
  }
  return null;
}

export function withPackageVersion(packageJsonText, version) {
  const pkg = JSON.parse(packageJsonText);
  const previous = pkg.version;
  if (previous === version) return { text: packageJsonText, changed: false, previous };
  pkg.version = version;
  return { text: `${JSON.stringify(pkg, null, 2)}\n`, changed: true, previous };
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
  const version = latestReleasedVersion(changelog);
  if (!version) {
    console.error('No numbered ## x.y.z heading found in CHANGELOG.md');
    process.exit(1);
  }

  const packagePath = join(root, 'package.json');
  const result = withPackageVersion(readFileSync(packagePath, 'utf8'), version);

  if (!result.changed) return;

  if (checkOnly) {
    console.error(`package.json version is ${result.previous}, but CHANGELOG latest release is ${version}.`);
    console.error('Commit that changelog cut (pre-commit will bump package.json), or run:');
    console.error('  node scripts/sync-package-version.mjs');
    process.exit(1);
  }

  writeFileSync(packagePath, result.text);
  console.log(`package.json version ${result.previous} → ${version}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
