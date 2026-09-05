import { execSync } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Netlify DEPLOY_ID (unique per publish) → COMMIT_REF → local git SHA. */
function resolveBuildId(): string {
  const deployId = process.env.DEPLOY_ID;
  if (deployId) return deployId;
  const commit = process.env.COMMIT_REF;
  if (commit) return commit;
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'dev';
  }
}

function buildIdPlugin(): Plugin {
  const id = resolveBuildId();
  const payload = JSON.stringify({
    id,
    commit: process.env.COMMIT_REF ?? null,
    builtAt: new Date().toISOString(),
  });
  return {
    name: 'app-build-id',
    config() {
      return { define: { __APP_BUILD_ID__: JSON.stringify(id) } };
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: payload });
    },
  };
}

export default defineConfig({
  plugins: [react(), buildIdPlugin()],
  server: {
    host: true,
    allowedHosts: true,
  },
  preview: {
    host: true,
    allowedHosts: true,
  },
});
