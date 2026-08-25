import { PageHeader } from '@/components/admin/PageHeader';
import { ClientForm } from '../ClientForm';
export default function Page() { return <div><PageHeader title="New client" backHref="/admin/clients" /><ClientForm initial={{}} /></div>; }
