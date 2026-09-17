import { tenantUsage, currentMerchant } from '@/lib/tenancy/context';
import { aiReady } from '@/lib/studio/worker';
import { StudioHeader } from '../studio/ui';
import Builder from './Builder';
export default async function AutomationsPage() {
  const { context, plan, isActive } = await tenantUsage();
  const { db } = await currentMerchant();
  const [flows, settings, knowledge, runs, contacts] = await Promise.all([
    db
      .from('automation_flows')
      .select('*')
      .eq('tenant_id', context.tenantId)
      .order('priority'),
    db
      .from('bot_settings')
      .select('*')
      .eq('tenant_id', context.tenantId)
      .maybeSingle(),
    db
      .from('bot_knowledge')
      .select('id,title,content')
      .eq('tenant_id', context.tenantId)
      .order('created_at'),
    db
      .from('automation_runs')
      .select(
        'id,message_id,state,output,error_code,created_at,input_tokens,output_tokens',
      )
      .eq('tenant_id', context.tenantId)
      .order('created_at', { ascending: false })
      .limit(30),
    db
      .from('whatsapp_contacts')
      .select('id,wa_id,bot_paused')
      .eq('tenant_id', context.tenantId)
      .order('last_inbound_at', { ascending: false })
      .limit(50),
  ]);
  if ([flows, settings, knowledge, runs, contacts].some((r) => r.error))
    throw new Error('تعذر تحميل مركز الأتمتة.');
  const messages = runs.data?.length
    ? await db
        .from('whatsapp_messages')
        .select('id,body,contact_id')
        .eq('tenant_id', context.tenantId)
        .in(
          'id',
          runs.data.map((r) => r.message_id),
        )
    : { data: [], error: null };
  if (messages.error) throw new Error('تعذر تحميل الرسائل المرتبطة بالأتمتة.');
  const rows = (runs.data ?? []).map((r) => {
    const message = messages.data?.find((m) => m.id === r.message_id);
    return {
      ...r,
      incoming: message?.body ?? '',
      phone:
        contacts.data?.find((c) => c.id === message?.contact_id)?.wa_id ??
        'عميل في المساحة',
    };
  });
  return (
    <div className="space-y-8">
      <StudioHeader
        title="الأتمتة والبوت"
        description="صمّم ردودًا تعتمد على كلمات العميل، جهّز مساعدًا من معرفة نشاطك، وراجع كل تنفيذ من مكان واحد."
      />
      <Builder
        flows={flows.data ?? []}
        settings={settings.data}
        knowledge={knowledge.data ?? []}
        runs={rows}
        contacts={contacts.data ?? []}
        canManage={isActive && ['owner', 'admin'].includes(context.role)}
        aiAvailable={aiReady()}
        flowLimit={plan.flows_limit}
      />
    </div>
  );
}
