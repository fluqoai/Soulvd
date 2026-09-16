import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function verifySignature(raw: string, signature: string | null, secret: string) {
  if (!signature || !/^sha256=[a-f0-9]{64}$/.test(signature) || !secret) return false;
  return timingSafeEqual(Buffer.from(signature.slice(7), 'hex'), createHmac('sha256', secret).update(raw).digest());
}

function key() {
  const value = Buffer.from(process.env.META_TOKEN_ENCRYPTION_KEY ?? '', 'base64');
  if (value.length !== 32) throw new Error('META_ENCRYPTION_NOT_CONFIGURED');
  return value;
}
export function encryptToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString('base64')).join('.');
}
export function decryptToken(value: string) {
  const parts = value.split('.').map(part => Buffer.from(part, 'base64'));
  if (parts.length !== 3) throw new Error('INVALID_TOKEN');
  const cipher = createDecipheriv('aes-256-gcm', key(), parts[0]);
  cipher.setAuthTag(parts[1]);
  return Buffer.concat([cipher.update(parts[2]), cipher.final()]).toString('utf8');
}
export function normalizePhone(value: string) {
  const phone = value.replace(/[\s()+-]/g, '');
  if (!/^[1-9][0-9]{6,14}$/.test(phone)) throw new Error('استخدم رقمًا دوليًا مع رمز الدولة.');
  return phone;
}

export function secretMatches(value: string | null, expected: string | undefined) {
  if (!value || !expected) return false;
  const a = Buffer.from(value), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
