import { PageHeader } from '@/components/admin/PageHeader';
import { ValuePropForm } from '../ValuePropForm';
export default function Page() { return <div><PageHeader title="قيمة جديدة" backHref="/admin/value-props" /><ValuePropForm initial={{}} /></div>; }
