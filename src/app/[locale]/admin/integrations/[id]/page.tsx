import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { IntegrationForm } from '../IntegrationForm';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('integrations').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  return <div><PageHeader title="Edit integration" backHref="/admin/integrations" description={`Editing "${data.name}"`} /><IntegrationForm initial={data} /></div>;
}
