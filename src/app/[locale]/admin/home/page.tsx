import { PageHeader } from '@/components/admin/PageHeader';
import { Link } from '@/i18n/routing';
import {
  Settings,
  Inbox,
  Briefcase,
  MessageSquareQuote,
  Sparkles,
} from 'lucide-react';

/**
 * Home admin index — jump-board to every content table that
 * feeds the public home page.
 *
 * Home page composition (top → bottom, 4 sections):
 *   1. Hero + chat preview — hardcoded copy in messages/ + HeroChat
 *   2. Case studies        — /admin/case-studies
 *   3. FAQ                 — translated strings in messages/
 *   4. CTA + form          — CTA copy in messages/ + built-in form
 *
 * Service and integration details live on /services and /integrations.
 */
export default function HomeAdminPage() {
  const sections = [
    {
      href: '/admin/settings',
      icon: Settings,
      title: 'إعدادات الموقع',
      desc: 'اسم الموقع، الشعار، بيانات التواصل، روابط السوشال',
    },
    {
      href: '/admin/case-studies',
      icon: Briefcase,
      title: 'دراسات الحالة',
      desc: 'دراسات حالة مميزة مع أرقام (3 معروضة)',
    },
    {
      href: '/admin/leads',
      icon: Inbox,
      title: 'الاستفسارات',
      desc: 'الاستفسارات الواردة من الصفحة الرئيسية وصفحة /contact',
    },
  ];

  return (
    <div>
      <PageHeader
        title="محتوى الصفحة الرئيسية"
        description="الصفحة الرئيسية العامة تتكون من 4 أقسام. استخدم الروابط أدناه لإدارة كل جزء."
      />

      <div className="grid gap-3 sm:grid-cols-2 max-w-3xl">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="flex items-start gap-3 rounded-xl border border-ink-900/10 bg-sage-50 p-4 hover:bg-sage-100 transition-colors"
            >
              <div className="size-9 rounded-lg bg-sage-500/15 text-sage-300 grid place-items-center shrink-0">
                <Icon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-paper">{s.title}</p>
                <p className="text-xs text-ink-600 mt-0.5">{s.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100 max-w-2xl">
        <div className="flex items-start gap-2">
          <Sparkles className="size-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium mb-1">مكتوب في الكود أو الترجمات</p>
            <p className="text-amber-200/80 text-xs leading-relaxed">
              قسم الواجهة (Hero) مع المحادثة والعنوان، وقسم الأسئلة الشائعة (FAQ)،
              مكتوبان في الكود أو في&nbsp;
              <code className="text-xs">messages/{'{ar,en}.json'}</code>
              &nbsp;تحت <code className="text-xs">home.hero</code> و <code className="text-xs">home.faq</code>. تفاصيل الخدمات والتكاملات موجودة في صفحة&nbsp;
              <code className="text-xs">/services</code> (تُدار هناك).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
