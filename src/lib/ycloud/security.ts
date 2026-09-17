import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyYCloudSignature(raw: string, header: string | null, secret: string, now = Date.now()) {
  if (!header || !secret) return false;
  const parts = header.split(',').map(part => part.trim());
  const timestamps = parts.filter(part => /^t=\d+$/.test(part));
  const signatures = parts.filter(part => /^s=[a-f0-9]{64}$/.test(part));
  if (timestamps.length !== 1 || signatures.length !== 1) return false;
  const timestamp = timestamps[0].slice(2);
  if (Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  return timingSafeEqual(Buffer.from(signatures[0].slice(2), 'hex'), createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest());
}
