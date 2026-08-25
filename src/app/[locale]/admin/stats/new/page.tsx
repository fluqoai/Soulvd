import { PageHeader } from '@/components/admin/PageHeader';
import { StatForm } from '../StatForm';
export default function Page() {
  return <div><PageHeader title="New stat" backHref="/admin/stats" /><StatForm initial={{}} /></div>;
}
