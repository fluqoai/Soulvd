import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatForm } from '../StatForm';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('stats').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  return <div><PageHeader title="Edit stat" backHref="/admin/stats" description={`Editing "${data.value}"`} /><StatForm initial={data} /></div>;
}
