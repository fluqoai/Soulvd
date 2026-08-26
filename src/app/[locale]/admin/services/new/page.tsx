import { PageHeader } from '@/components/admin/PageHeader';
import { ServiceForm } from '../ServiceForm';

export default function NewServicePage() {
  return (
    <div>
      <PageHeader
        title="خدمة جديدة"
        backHref="/admin/services"
        description="أضف بطاقة خدمة جديدة. ستظهر في الصفحة الرئيسية وصفحة /services عند نشرها."
      />
      <ServiceForm initial={{}} />
    </div>
  );
}
