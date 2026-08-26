import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { MemberForm } from '../MemberForm';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('team_members').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  return <div><PageHeader title="تعديل عضو الفريق" backHref="/admin/team" description={`Editing "${data.full_name}"`} /><MemberForm initial={data} /></div>;
}
