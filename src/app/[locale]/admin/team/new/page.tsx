import { PageHeader } from '@/components/admin/PageHeader';
import { MemberForm } from '../MemberForm';
export default function Page() { return <div><PageHeader title="New team member" backHref="/admin/team" /><MemberForm initial={{}} /></div>; }
