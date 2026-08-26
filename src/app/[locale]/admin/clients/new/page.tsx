import { PageHeader } from '@/components/admin/PageHeader';
import { ClientForm } from '../ClientForm';
export default function Page() { return <div><PageHeader title="عميل جديد" backHref="/admin/clients" /><ClientForm initial={{}} /></div>; }
