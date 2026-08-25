import { PageHeader } from '@/components/admin/PageHeader';
import { TestimonialForm } from '../TestimonialForm';
export default function Page() { return <div><PageHeader title="New testimonial" backHref="/admin/testimonials" /><TestimonialForm initial={{}} /></div>; }
