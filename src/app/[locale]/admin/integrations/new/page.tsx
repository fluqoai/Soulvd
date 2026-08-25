import { PageHeader } from '@/components/admin/PageHeader';
import { IntegrationForm } from '../IntegrationForm';
export default function Page() { return <div><PageHeader title="New integration" backHref="/admin/integrations" /><IntegrationForm initial={{}} /></div>; }
