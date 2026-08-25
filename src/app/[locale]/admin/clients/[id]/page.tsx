import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { ClientForm } from '../ClientForm';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('clients').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  return (
    <div>
      <PageHeader title="Edit client" backHref="/admin/clients" description={`Editing "${data.name}"`} />
      <ClientForm initial={data} />
    </div>
  );
}
