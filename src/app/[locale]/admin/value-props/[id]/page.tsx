import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { ValuePropForm } from '../ValuePropForm';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('value_props').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  return <div><PageHeader title="Edit value prop" backHref="/admin/value-props" /><ValuePropForm initial={data} /></div>;
}
