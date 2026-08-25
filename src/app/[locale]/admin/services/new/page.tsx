import { PageHeader } from '@/components/admin/PageHeader';
import { ServiceForm } from '../ServiceForm';

export default function NewServicePage() {
  return (
    <div>
      <PageHeader
        title="New service"
        backHref="/admin/services"
        description="Add a new service card. It will be available on the home page and the /services detail page once published."
      />
      <ServiceForm initial={{}} />
    </div>
  );
}
