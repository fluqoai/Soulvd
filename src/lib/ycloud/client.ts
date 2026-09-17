import 'server-only';

export class YCloudError extends Error {
  constructor(public code: string, public uncertain = false) { super(code); }
}
export async function ycloud<T>(path: string, body?: unknown): Promise<T> {
  const key = process.env.YCLOUD_API_KEY;
  if (!key) throw new YCloudError('PROVIDER_NOT_CONFIGURED');
  if (!/^\/whatsapp\/(messages\/sendDirectly|templates(?:\?[^#]*)?)$/.test(path)) throw new YCloudError('INVALID_PROVIDER_PATH');
  let response: Response;
  try {
    response = await fetch(`https://api.ycloud.com/v2${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'X-API-Key': key, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000),
    });
  } catch { throw new YCloudError('PROVIDER_CONNECTION_UNCERTAIN', body !== undefined); }
  let result;
  try { result = await response.json(); } catch { throw new YCloudError('PROVIDER_RESPONSE_UNCERTAIN', body !== undefined); }
  if (!response.ok || result.error) throw new YCloudError(`PROVIDER_${response.status}`, body !== undefined && response.status >= 500);
  return result as T;
}

export type ProviderTemplate = { name: string; language: string; category: string; status: string; components: { type: string; text?: string }[] };
export async function providerTemplates(wabaId: string) {
  const items: ProviderTemplate[] = [];
  // Bound the sync; tenant quota gates remain in the database.
  for (let page = 1; page <= 10; page++) {
    const result = await ycloud<{ items: ProviderTemplate[] }>(`/whatsapp/templates?filter.wabaId=${encodeURIComponent(wabaId)}&limit=100&page=${page}`);
    if (!Array.isArray(result.items)) throw new YCloudError('PROVIDER_INVALID_RESPONSE');
    items.push(...result.items);
    if (result.items.length < 100) break;
  }
  return items;
}
