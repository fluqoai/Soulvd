import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { SectorForm } from '../SectorForm';

type Params = Promise<{ id: string }>;

export default async function EditSectorPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sectors')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return <div className="text-red-300">{error.message}</div>;
  if (!data) notFound();
  return (
    <div>
      <PageHeader title="تعديل القطاع" backHref="/admin/sectors" description={`Editing "${data.title?.en ?? data.key}"`} />
      <SectorForm initial={data} />
    </div>
  );
}
