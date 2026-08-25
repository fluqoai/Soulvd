import { PageHeader } from '@/components/admin/PageHeader';
import { PartnerForm } from '../PartnerForm';
export default function Page() { return <div><PageHeader title="New partner" backHref="/admin/partners" /><PartnerForm initial={{}} /></div>; }
