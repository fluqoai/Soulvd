import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { SettingsForm } from './SettingsForm';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('site_settings').select('*').maybeSingle();

  return (
    <div>
      <PageHeader title="Settings" description="Site name, contact info, social links, and SEO defaults. Saved here propagate to the public site." />
      <SettingsForm initial={data ?? {}} />
    </div>
  );
}
