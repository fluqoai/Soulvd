import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { PartnerForm } from '../PartnerForm';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('partners').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  return <div><PageHeader title="Edit partner" backHref="/admin/partners" description={`Editing "${data.name}"`} /><PartnerForm initial={data} /></div>;
}
