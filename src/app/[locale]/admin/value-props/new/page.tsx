import { PageHeader } from '@/components/admin/PageHeader';
import { ValuePropForm } from '../ValuePropForm';
export default function Page() { return <div><PageHeader title="New value prop" backHref="/admin/value-props" /><ValuePropForm initial={{}} /></div>; }
