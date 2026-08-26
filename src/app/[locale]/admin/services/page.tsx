import { Plus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { ReorderControls } from '@/components/admin/ReorderControls';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { ButtonLink } from '@/components/ui/Button';
import {
  deleteServiceAction,
  reorderServiceAction,
} from './actions';

type Service = {
  id: string;
  key: string;
  icon: string;
  title: { ar?: string; en?: string } | null;
  description: { ar?: string; en?: string } | null;
  order_index: number;
  published: boolean;
};

export default async function ServicesAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('admin.nav');

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('services')
    .select('id, key, icon, title, description, order_index, published')
    .order('order_index', { ascending: true });

  const items = (rows ?? []) as unknown as Service[];

  return (
    <div>
      <PageHeader
        title="Services"
        description="The service cards shown on the home page and the /services detail page."
        actions={
          <ButtonLink href={`/admin/services/new`} size="sm" variant="primary">
            <Plus className="size-4" />
            New service
          </ButtonLink>
        }
      />

      <DataTable
        rows={items}
        rowKey={(r) => r.id}
        editHref={(r) => `/admin/services/${r.id}`}
        emptyMessage="No services yet — add your first one."
        columns={[
          {
            key: 'order',
            header: 'Order',
            width: '80px',
            cell: (r) => (
              <ReorderControls
                id={r.id}
                isFirst={items[0]?.id === r.id}
                isLast={items[items.length - 1]?.id === r.id}
                action={reorderServiceAction}
              />
            ),
          },
          {
            key: 'title',
            header: 'Title',
            cell: (r) => (
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {r.title?.en || r.title?.ar || '—'}
                </div>
                {r.title?.ar && r.title?.en && (
                  <div className="text-xs text-ink-600 truncate" dir="rtl">
                    {r.title.ar}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'key',
            header: 'Key',
            width: '120px',
            cell: (r) => <code className="text-xs text-ink-700">{r.key}</code>,
          },
          {
            key: 'icon',
            header: 'Icon',
            width: '100px',
            cell: (r) => <code className="text-xs text-ink-700">{r.icon}</code>,
          },
          {
            key: 'published',
            header: 'Status',
            width: '100px',
            cell: (r) =>
              r.published ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sage-500/15 text-sage-300 text-xs">
                  <span className="size-1.5 rounded-full bg-sage-400" />
                  Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-ink-100 text-ink-700 ring-1 ring-ink-900/10 text-xs">
                  <span className="size-1.5 rounded-full bg-linen-400" />
                  Draft
                </span>
              ),
          },
        ]}
        rowAction={(r) => (
          <DeleteButton
            id={r.id}
            action={deleteServiceAction}
            confirm={`Delete "${r.title?.en ?? r.key}"? This cannot be undone.`}
          />
        )}
      />
    </div>
  );
}
