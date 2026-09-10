import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { LegalPage, type LegalSection } from '@/components/public/LegalPage';

const CONTACT_EMAIL = 'info@soulvd.sa';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ar' ? 'طلب حذف البيانات' : 'Data Deletion Request',
    description:
      locale === 'ar'
        ? 'تعليمات طلب حذف البيانات من خدمات سولڤد وتكامل Meta وWhatsApp.'
        : 'Instructions for requesting deletion of data from Soulvd and its Meta and WhatsApp integrations.',
    alternates: {
      canonical: locale === 'ar' ? '/data-deletion' : '/en/data-deletion',
    },
    robots: { index: true, follow: true },
  };
}

export default async function DataDeletionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isArabic = locale === 'ar';
  setRequestLocale(locale);

  const sections: LegalSection[] = isArabic
    ? [
        {
          title: 'طريقة تقديم الطلب',
          paragraphs: [
            `أرسل رسالة من بريدك المرتبط بالحساب إلى ${CONTACT_EMAIL}، واجعل العنوان «طلب حذف البيانات - Meta/WhatsApp». لا ترسل كلمة مرور أو Access Token أو رمز تحقق.`,
          ],
          bullets: [
            'اذكر اسمك واسم المنشأة.',
            'اذكر رقم WhatsApp Business بصيغته الدولية.',
            'أرفق معرّف حساب WhatsApp Business أو معرّف Meta Business Portfolio إن كان متاحًا.',
            'حدد هل تريد حذف تكامل Meta وWhatsApp فقط أم جميع بيانات حسابك لدى سولڤد.',
          ],
        },
        {
          title: 'التحقق والتنفيذ',
          paragraphs: [
            'قد نطلب معلومات إضافية محدودة للتحقق من أنك صاحب الحساب أو مسؤول مخول عن المنشأة. بعد التحقق، نوقف المعالجة غير المطلوبة ونحذف أو نجعل البيانات غير قابلة للتعريف عادةً خلال 90 يومًا، ما لم يوجب النظام الاحتفاظ بسجلات محددة. سنؤكد إتمام الطلب عبر البريد.',
          ],
        },
        {
          title: 'ما يشمله الحذف',
          bullets: [
            'معرّفات ربط Meta وWhatsApp ورموز التفويض النشطة.',
            'إعدادات التكامل والقوالب والبيانات التشغيلية المرتبطة بالحساب، ضمن حدود صلاحيات سولڤد.',
            'محتوى الرسائل والبيانات الشخصية المخزنة في أنظمة سولڤد، ما لم ينطبق التزام نظامي بالاحتفاظ.',
            'النسخ الاحتياطية تُستبدل دوريًا وقد تبقى معزولة لمدة تصل إلى 90 يومًا إضافية.',
          ],
        },
        {
          title: 'إلغاء وصول Meta',
          paragraphs: [
            'يمكنك أيضًا إلغاء ربط Soulvd من إعدادات Facebook ثم Business Integrations. يؤدي ذلك إلى وقف وصولنا المستقبلي عبر Meta، لكنه لا يحل محل طلب الحذف إذا أردت إزالة بيانات محفوظة سابقًا لدى سولڤد.',
          ],
        },
      ]
    : [
        {
          title: 'How to submit a request',
          paragraphs: [
            `Email ${CONTACT_EMAIL} from the address associated with your account using the subject “Data deletion request - Meta/WhatsApp.” Never send a password, access token, or verification code.`,
          ],
          bullets: [
            'Include your name and organization name.',
            'Include the WhatsApp Business number in international format.',
            'Include the WhatsApp Business Account or Meta Business Portfolio ID if available.',
            'State whether you want only the Meta and WhatsApp integration data deleted or all Soulvd account data.',
          ],
        },
        {
          title: 'Verification and completion',
          paragraphs: [
            'We may request limited additional information to verify that you own the account or are an authorized business administrator. After verification, we stop unnecessary processing and normally delete or de-identify the requested data within 90 days unless law requires specific records to be retained. We will confirm completion by email.',
          ],
        },
        {
          title: 'What deletion covers',
          bullets: [
            'Meta and WhatsApp connection identifiers and active authorization tokens.',
            'Integration settings, templates, and operational data associated with the account, within Soulvd’s control.',
            'Message content and personal data stored in Soulvd systems unless a legal retention duty applies.',
            'Backups rotate on schedule and may remain isolated for up to an additional 90 days.',
          ],
        },
        {
          title: 'Revoking Meta access',
          paragraphs: [
            'You can also revoke Soulvd from Facebook Settings under Business Integrations. This stops future access through Meta, but it does not replace a deletion request if you want previously stored Soulvd data removed.',
          ],
        },
      ];

  return (
    <LegalPage
      eyebrow={isArabic ? 'الخصوصية وحماية البيانات' : 'Privacy and data protection'}
      title={isArabic ? 'طلب حذف البيانات' : 'Data Deletion Request'}
      updated={isArabic ? 'آخر تحديث: 11 سبتمبر 2026' : 'Last updated: September 11, 2026'}
      intro={
        isArabic
          ? 'تتيح لك مؤسسة سولڤد طلب حذف بيانات حسابك وبيانات تكامل Meta وWhatsApp التي تقع تحت سيطرتها.'
          : 'SOULVD Establishment lets you request deletion of your account data and Meta and WhatsApp integration data under its control.'
      }
      sections={sections}
    />
  );
}
