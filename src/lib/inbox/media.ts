export const MEDIA_UPLOAD_LIMIT = 3_800_000;
const kinds: Record<string, 'image' | 'audio' | 'video' | 'document'> = {
  'image/jpeg': 'image', 'image/png': 'image', 'application/pdf': 'document',
  'audio/mpeg': 'audio', 'audio/ogg': 'audio', 'audio/mp4': 'audio', 'audio/aac': 'audio',
  'video/mp4': 'video',
};
export function uploadMediaKind(mime: string, bytes: Uint8Array) {
  const kind = kinds[mime];
  if (!kind || !bytes.length || bytes.length > MEDIA_UPLOAD_LIMIT) return null;
  const starts = (...values: number[]) => values.every((v, i) => bytes[i] === v);
  const ascii = (offset: number, text: string) => [...text].every((c, i) => bytes[offset + i] === c.charCodeAt(0));
  const valid = mime === 'image/jpeg' ? starts(255,216,255)
    : mime === 'image/png' ? starts(137,80,78,71,13,10,26,10)
    : mime === 'application/pdf' ? ascii(0, '%PDF-')
    : mime === 'audio/ogg' ? ascii(0, 'OggS')
    : mime.endsWith('/mp4') ? ascii(4, 'ftyp')
    : mime === 'audio/mpeg' ? ascii(0, 'ID3') || (bytes[0] === 255 && (bytes[1] & 224) === 224)
    : bytes[0] === 255 && (bytes[1] & 246) === 240;
  return valid ? kind : null;
}
export function providerMediaUrl(value: string, source: 'ycloud' | 'meta'): URL {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) throw new Error('UNSAFE_MEDIA_URL');
  const allowed = source === 'ycloud'
    ? url.hostname === 'api.ycloud.com' && /^\/v2\/whatsapp\/media\/download\/[0-9]+$/.test(url.pathname)
    : (url.hostname === 'lookaside.fbsbx.com' || url.hostname.endsWith('.fbcdn.net'));
  if (!allowed) throw new Error('UNSAFE_MEDIA_URL');
  return url;
}
