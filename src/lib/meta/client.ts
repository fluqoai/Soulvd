import 'server-only';

export class MetaError extends Error {
  constructor(public code: string, public uncertain = false) { super(code); }
}
export function metaVersion() {
  const version = process.env.META_GRAPH_VERSION;
  if (!version || !/^v\d+\.\d+$/.test(version)) throw new MetaError('META_NOT_CONFIGURED');
  return version;
}
export async function graph<T>(path: string, token: string, body?: unknown): Promise<T> {
  if (!/^[0-9]+\/[a-z_]+(?:\?[a-zA-Z0-9_=&%,.-]+)?$/.test(path)) throw new MetaError('INVALID_GRAPH_PATH');
  const version = metaVersion();
  let response: Response;
  try {
    response = await fetch(`https://graph.facebook.com/${version}/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store', signal: AbortSignal.timeout(15_000), redirect: 'error',
    });
  } catch { throw new MetaError('META_CONNECTION_UNCERTAIN', body !== undefined); }
  let result: { error?: { code?: number; error_subcode?: number } };
  try { result = await response.json(); } catch { throw new MetaError('META_RESPONSE_UNCERTAIN', body !== undefined); }
  if (!response.ok || result.error) throw new MetaError(`META_${result.error?.code ?? response.status}_${result.error?.error_subcode ?? 0}`, response.status >= 500 && body !== undefined);
  return result as T;
}

export async function exchangeCode(code: string) {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const secret = process.env.META_APP_SECRET;
  if (!appId || !secret) throw new MetaError('META_NOT_CONFIGURED');
  // The authorization code is never logged or forwarded to a browser redirect.
  const url = new URL(`https://graph.facebook.com/${metaVersion()}/oauth/access_token`);
  url.search = new URLSearchParams({ client_id: appId, client_secret: secret, code }).toString();
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15_000), redirect: 'error' });
  const result = await response.json();
  if (!response.ok || typeof result.access_token !== 'string') throw new MetaError('META_AUTHORIZATION_FAILED');
  return result.access_token as string;
}
