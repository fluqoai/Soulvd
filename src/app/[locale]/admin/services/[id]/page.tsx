import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { ServiceForm } from '../ServiceForm';

type Params = Promise<{ id: string; locale: string }>;

export default async function EditServicePage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return (
      <div className="rounded-lg border border-red-300/40 bg-red-500/10 p-4 text-sm text-red-200">
        Failed to load service: {error.message}
      </div>
    );
  }
  if (!data) notFound();

  return (
    <div>
      <PageHeader
        title="تعديل الخدمة"
        backHref="/admin/services"
        description={`Editing "${data.title?.en ?? data.key}"`}
      />
      <ServiceForm initial={data} />
    </div>
  );
}
