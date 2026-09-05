/** Shape written to /version.json at build (Netlify DEPLOY_ID or git SHA). */
export interface DeployVersion {
  id: string;
  commit?: string | null;
  builtAt?: string;
}

export function parseVersionPayload(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const id = (data as { id?: unknown }).id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

export function isNewerDeploy(runningId: string, remoteId: string | null): boolean {
  return Boolean(runningId && remoteId && remoteId !== runningId);
}

export async function fetchRemoteBuildId(baseUrl: string): Promise<string | null> {
  const url = `${baseUrl}version.json?t=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  return parseVersionPayload(await res.json());
}
