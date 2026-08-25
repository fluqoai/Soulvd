import { PageHeader } from '@/components/admin/PageHeader';
import { SectorForm } from '../SectorForm';

export default function NewSectorPage() {
  return (
    <div>
      <PageHeader title="New sector" backHref="/admin/sectors" />
      <SectorForm initial={{}} />
    </div>
  );
}
