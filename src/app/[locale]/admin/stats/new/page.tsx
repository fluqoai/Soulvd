import { PageHeader } from '@/components/admin/PageHeader';
import { StatForm } from '../StatForm';
export default function Page() {
  return <div><PageHeader title="رقم جديد" backHref="/admin/stats" /><StatForm initial={{}} /></div>;
}
