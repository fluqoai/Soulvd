import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { TestimonialForm } from '../TestimonialForm';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('testimonials').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  return <div><PageHeader title="Edit testimonial" backHref="/admin/testimonials" description={`Editing "${data.client_name}"`} /><TestimonialForm initial={data} /></div>;
}
