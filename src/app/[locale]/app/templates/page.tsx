import { tenantUsage, currentMerchant } from '@/lib/tenancy/context';
import { TEMPLATE_LIBRARY } from '@/lib/studio/library';
import { StudioHeader } from '../studio/ui';
import Library from './Library';
export default async function TemplatesPage() {
  const { context, plan, isActive } = await tenantUsage();
  const { db } = await currentMerchant();
  const [drafts, submitted] = await Promise.all([db
    .from('template_drafts')
    .select('*')
    .eq('tenant_id', context.tenantId)
    .order('created_at', { ascending: false })
    .limit(200),
    db.from('whatsapp_templates').select('id,name,language,status,provider_status').eq('tenant_id', context.tenantId).order('name').limit(200),
  ]);
  if (drafts.error || submitted.error) throw new Error('تعذر تحميل القوالب.');
  const pro = isActive && plan.code === 'pro_growth';
  return (
    <div className="space-y-8">
      <StudioHeader
        title="مكتبة القوالب"
        description="ابدأ من قالب جاهز أو نصك الخاص. خصّص المحتوى والمتغيرات، احفظ مسودة، ثم أرسلها للاعتماد."
      />
      <Library
        library={pro ? TEMPLATE_LIBRARY : []}
        pro={pro}
        drafts={drafts.data}
        submitted={submitted.data}
        canManage={['owner', 'admin'].includes(context.role) && isActive}
      />
    </div>
  );
}
