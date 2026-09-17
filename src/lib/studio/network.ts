import 'server-only';
import { Resolver } from 'node:dns/promises';
import { isIP, BlockList } from 'node:net';
import { request } from 'node:https';
const blocked = new BlockList();
for (const [ip, bits] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const)
  blocked.addSubnet(ip, bits, 'ipv4');
export function publicIPv4(ip: string) {
  return isIP(ip) === 4 && !blocked.check(ip, 'ipv4');
}
export function webhookUrl(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    (url.port && url.port !== '443') ||
    url.username ||
    url.password ||
    url.hash ||
    url.search ||
    isIP(url.hostname) ||
    !url.hostname.includes('.') ||
    url.hostname.endsWith('.') ||
    url.hostname.endsWith('.local') ||
    url.hostname.endsWith('.internal')
  )
    throw new Error(
      'استخدم نطاق HTTPS عامًا، دون بيانات دخول أو query string.',
    );
  return url;
}
export async function sendSignedWebhook(
  target: string,
  body: string,
  headers: Record<string, string>,
) {
  const url = webhookUrl(target);
  const resolver = new Resolver({ timeout: 2000, tries: 1 });
  const ips = await resolver.resolve4(url.hostname);
  if (!ips.length || ips.some((ip) => !publicIPv4(ip)))
    throw new Error('UNSAFE_ENDPOINT');
  // Pin the verified address in the TLS request; DNS rebinding and redirects cannot change the destination.
  return new Promise<number>((resolve, reject) => {
    const req = request(
      url,
      {
        method: 'POST',
        family: 4,
        agent: false,
        signal: AbortSignal.timeout(8000),
        lookup: (_hostname, _options, cb) => cb(null, ips[0], 4),
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Content-Length': String(Buffer.byteLength(body)),
        },
      },
      (res) => {
        resolve(res.statusCode ?? 500);
        res.destroy();
      },
    );
    req.setTimeout(8000, () => req.destroy(new Error('WEBHOOK_TIMEOUT')));
    req.on('error', reject);
    req.end(body);
  });
}
