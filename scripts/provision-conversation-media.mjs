// Provision private storage only; never grant browser access to the bucket.
import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (new URL(url).hostname !== 'lyvoiipsmcbffvpkrxhy.supabase.co') throw new Error('Wrong Soulvd project');
const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const bucket = 'conversation-media';
const existing = await db.storage.getBucket(bucket);
if (existing.data) {
  if (existing.data.public) throw new Error('Media bucket must be private');
  console.log('Private conversation-media bucket already exists.');
} else {
  const result = await db.storage.createBucket(bucket, { public: false, fileSizeLimit: 3_800_000, allowedMimeTypes: ['image/jpeg','image/png','application/pdf','audio/mpeg','audio/ogg','audio/mp4','audio/aac','video/mp4'] });
  if (result.error) throw new Error('Storage provisioning failed: ' + result.error.statusCode);
  console.log('Private conversation-media bucket provisioned.');
}
