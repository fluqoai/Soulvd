import { crmAuth } from '@/lib/studio/api';
import { createAdminClient } from '@/lib/supabase/admin';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const auth = await crmAuth(request);
    if (!auth) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    if (auth.limited)
      return Response.json(
        { error: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    const result = await createAdminClient()
      .from('whatsapp_templates')
      .select('id,name,body,language,category,status,parameter_count')
      .eq('tenant_id', auth.tenant)
      .eq('status', 'approved')
      .order('name')
      .limit(100);
    if (result.error) throw new Error('READ_FAILED');
    return Response.json(
      { data: result.data },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json({ error: 'UNAVAILABLE' }, { status: 503 });
  }
}
