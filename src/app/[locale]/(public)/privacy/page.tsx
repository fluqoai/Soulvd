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
    title: locale === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy',
    description:
      locale === 'ar'
        ? 'سياسة خصوصية مؤسسة سولڤد وخدمات تكامل واتساب للأعمال.'
        : 'Privacy policy for SOULVD Establishment and its WhatsApp Business integration services.',
    alternates: { canonical: locale === 'ar' ? '/privacy' : '/en/privacy' },
  };
}

export default async function PrivacyPage({
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
          title: '1. من نحن ونطاق السياسة',
          paragraphs: [
            'مؤسسة سولڤد (SOULVD Establishment) منشأة مسجلة في المملكة العربية السعودية. تنطبق هذه السياسة على موقع soulvd.sa وخدمات الأتمتة والتكامل التي نقدمها، بما فيها خدمات WhatsApp Business Platform التي يفعّلها العميل باختياره.',
            'عندما نعالج بيانات المراسلة لصالح عميل تجاري ووفق تعليماته، يكون العميل عادةً جهة التحكم وتعمل سولڤد كجهة معالجة. وتكون سولڤد جهة تحكم في بيانات زوار موقعها وبيانات التواصل وإدارة الحسابات الخاصة بها.',
          ],
        },
        {
          title: '2. البيانات التي قد نجمعها',
          bullets: [
            'بيانات التواصل والحساب، مثل الاسم والبريد الإلكتروني ورقم الهاتف والمنشأة والصفة الوظيفية.',
            'معرّفات الأعمال التي يشاركها العميل عبر Meta، مثل معرّف محفظة الأعمال وحساب WhatsApp Business ومعرّف رقم الهاتف.',
            'رموز التفويض وبيانات الربط اللازمة لتشغيل التكامل. لا نطلب كلمة مرور Facebook أو WhatsApp الخاصة بك ولا نخزنها.',
            'بيانات الرسائل التي يصرّح العميل التجاري بمعالجتها، مثل محتوى الرسالة وأرقام المرسل والمستلم والوقت والوسائط وحالة التسليم وبيانات القالب.',
            'بيانات تقنية وتشغيلية، مثل عنوان IP ونوع المتصفح وسجلات الأخطاء والأمان واستخدام الموقع.',
          ],
        },
        {
          title: '3. مصادر البيانات وأغراض المعالجة',
          paragraphs: [
            'نحصل على البيانات منك، أو من مسؤولي منشأتك، أو من واجهات Meta وWhatsApp وWebhooks بعد منح التفويض. نستخدمها لإنشاء الحساب وتقديم التكامل وإرسال الرسائل واستقبالها بناءً على تعليمات العميل، وتشغيل القوالب، وتأمين الخدمة، ومعالجة الدعم، والالتزام بالأنظمة ومنع إساءة الاستخدام.',
            'نعتمد بحسب الحالة على تنفيذ العقد، أو الموافقة، أو الوفاء بالتزام نظامي، أو المصلحة المشروعة التي لا تتعارض مع حقوق صاحب البيانات. لا نستخدم بيانات WhatsApp لأغراض لا تتوافق مع التفويض الممنوح أو شروط Meta وWhatsApp.',
          ],
        },
        {
          title: '4. المشاركة ومقدمو الخدمة',
          paragraphs: [
            'قد نعالج أو نشارك القدر اللازم من البيانات مع Meta وWhatsApp لتقديم خدمة المراسلة، ومع مقدمي الاستضافة وقواعد البيانات والبريد والمراقبة الذين يعملون وفق تعاقدات وضوابط مناسبة. وقد نفصح عن البيانات إذا ألزمنا النظام أو طلبت جهة مختصة ذلك.',
            'لا نبيع البيانات الشخصية. ويتحمل العميل التجاري مسؤولية الحصول على الموافقات النظامية اللازمة من مستلمي رسائله والالتزام بسياسات WhatsApp للمراسلة والقوالب.',
          ],
        },
        {
          title: '5. النقل خارج المملكة',
          paragraphs: [
            'قد يستخدم بعض مزودي البنية التحتية وMeta مرافق تقنية خارج المملكة العربية السعودية. عند حدوث نقل دولي، نتخذ الإجراءات والضمانات المطلوبة وفق الأنظمة المنطبقة وطبيعة الخدمة.',
          ],
        },
        {
          title: '6. مدة الاحتفاظ والإتلاف',
          paragraphs: [
            'نحتفظ ببيانات الحساب والتكامل طوال مدة تقديم الخدمة، ثم نحذفها أو نجعلها غير قابلة للتعريف عادةً خلال 90 يومًا من انتهاء العلاقة أو قبول طلب الحذف، ما لم يلزم الاحتفاظ ببعض السجلات لمدة أطول للوفاء بالتزامات نظامية أو مالية أو لحماية الحقوق. قد تبقى النسخ الاحتياطية المعزولة لمدة تصل إلى 90 يومًا إضافية قبل استبدالها دوريًا. نحتفظ بطلبات التواصل لمدة لا تتجاوز 24 شهرًا، وبسجلات الأمان والتشغيل لمدة لا تتجاوز 12 شهرًا ما لم تستلزم واقعة أمنية أو التزام نظامي مدة أطول.',
          ],
        },
        {
          title: '7. حقوقك',
          paragraphs: [
            `بحسب الأنظمة المنطبقة، يمكنك طلب العلم بالمعالجة، والوصول إلى بياناتك والحصول عليها بصيغة واضحة، وتصحيحها أو تحديثها، وطلب إتلافها، والعدول عن الموافقة حيث تكون هي الأساس. لممارسة حقوقك راسل ${CONTACT_EMAIL}. قد نطلب معلومات مناسبة للتحقق من الهوية وحماية الحساب.`,
          ],
        },
        {
          title: '8. الأمان وبيانات القُصّر',
          paragraphs: [
            'نستخدم تدابير تقنية وتنظيمية مناسبة للحد من الوصول غير المصرح به أو الفقد أو إساءة الاستخدام، ونقصر الوصول على من يحتاجه لتقديم الخدمة. لا تستهدف خدماتنا الأطفال ولا نجمع بياناتهم عمدًا.',
          ],
        },
        {
          title: '9. حذف البيانات وفصل Meta',
          paragraphs: [
            `يمكنك الاطلاع على خطوات حذف البيانات في صفحة حذف البيانات أو إرسال طلب إلى ${CONTACT_EMAIL}. كما يمكنك إلغاء وصول تكامل Soulvd من إعدادات Business Integrations في Meta؛ إلغاء الوصول يوقف جمع بيانات جديدة، لكنه لا يغني عن طلب حذف البيانات المحفوظة سابقًا.`,
          ],
        },
        {
          title: '10. التواصل والتحديثات',
          paragraphs: [
            `للاستفسارات أو الشكاوى المتعلقة بالخصوصية، تواصل مع مؤسسة سولڤد في المملكة العربية السعودية عبر ${CONTACT_EMAIL}. قد نحدّث هذه السياسة عند تغير الخدمات أو المتطلبات، وسننشر تاريخ آخر تحديث في أعلى الصفحة.`,
          ],
        },
      ]
    : [
        {
          title: '1. Who we are and scope',
          paragraphs: [
            'SOULVD Establishment is registered in the Kingdom of Saudi Arabia. This policy applies to soulvd.sa and the automation and integration services we provide, including WhatsApp Business Platform services that a customer chooses to enable.',
            'When we process messaging data for a business customer under its instructions, that customer is generally the controller and Soulvd acts as a processor. Soulvd is the controller for its own website visitor, contact, and account administration data.',
          ],
        },
        {
          title: '2. Data we may collect',
          bullets: [
            'Contact and account data such as name, email, phone number, organization, and role.',
            'Business identifiers shared through Meta, including Business Portfolio, WhatsApp Business Account, and phone number identifiers.',
            'Authorization tokens and connection data required to operate the integration. We do not request or store your Facebook or WhatsApp password.',
            'Messaging data a business customer authorizes us to process, such as message content, sender and recipient numbers, timestamps, media, delivery status, and template metadata.',
            'Technical and operational data such as IP address, browser type, security events, errors, and website usage.',
          ],
        },
        {
          title: '3. Sources, purposes, and legal bases',
          paragraphs: [
            'We receive data from you, your organization administrators, or Meta and WhatsApp APIs and webhooks after authorization. We use it to create and administer accounts, provide messaging and template functionality under customer instructions, secure the service, provide support, comply with law, and prevent misuse.',
            'Depending on the context, processing is based on performance of a contract, consent, compliance with law, or a legitimate interest that does not override individual rights. We do not use WhatsApp data for purposes incompatible with the authorization granted or Meta and WhatsApp terms.',
          ],
        },
        {
          title: '4. Sharing and service providers',
          paragraphs: [
            'We may process or share the minimum data required with Meta and WhatsApp to provide messaging, and with contracted hosting, database, email, and monitoring providers. We may also disclose data when required by law or a competent authority.',
            'We do not sell personal data. Business customers are responsible for obtaining required recipient permissions and complying with WhatsApp messaging and template policies.',
          ],
        },
        {
          title: '5. International transfers',
          paragraphs: [
            'Some infrastructure providers and Meta may operate facilities outside Saudi Arabia. Where an international transfer occurs, we apply the procedures and safeguards required by applicable law and the nature of the service.',
          ],
        },
        {
          title: '6. Retention and deletion',
          paragraphs: [
            'We retain account and integration data while providing the service, then normally delete or de-identify it within 90 days after termination or acceptance of a deletion request, unless legal, financial, or claims-related obligations require longer retention. Isolated backups may remain for up to an additional 90 days before normal rotation. Contact inquiries are retained for no more than 24 months, and security and operational logs for no more than 12 months unless an incident or legal obligation requires longer.',
          ],
        },
        {
          title: '7. Your rights',
          paragraphs: [
            `Subject to applicable law, you may request information about processing, access to and a readable copy of your data, correction or updating, destruction, and withdrawal of consent where consent is the legal basis. Email ${CONTACT_EMAIL} to exercise a right. We may request appropriate information to verify identity and protect the account.`,
          ],
        },
        {
          title: '8. Security and children',
          paragraphs: [
            'We use appropriate technical and organizational safeguards to reduce unauthorized access, loss, and misuse, and restrict access to people who need it to provide the service. Our services are not directed to children, and we do not knowingly collect their data.',
          ],
        },
        {
          title: '9. Meta disconnection and data deletion',
          paragraphs: [
            `See our Data Deletion page or email ${CONTACT_EMAIL} to request deletion. You can also revoke Soulvd through Meta Business Integrations settings. Revocation stops future collection but does not by itself request deletion of previously stored data.`,
          ],
        },
        {
          title: '10. Contact and updates',
          paragraphs: [
            `For privacy questions or complaints, contact SOULVD Establishment in Saudi Arabia at ${CONTACT_EMAIL}. We may update this policy as services or requirements change and will publish the latest update date above.`,
          ],
        },
      ];

  return (
    <LegalPage
      eyebrow={isArabic ? 'الخصوصية وحماية البيانات' : 'Privacy and data protection'}
      title={isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}
      updated={isArabic ? 'آخر تحديث: 11 سبتمبر 2026' : 'Last updated: September 11, 2026'}
      intro={
        isArabic
          ? 'توضح هذه السياسة كيف تجمع مؤسسة سولڤد البيانات الشخصية وتستخدمها وتحميها عند استخدام الموقع وخدمات تكامل واتساب للأعمال.'
          : 'This policy explains how SOULVD Establishment collects, uses, and protects personal data when you use our website and WhatsApp Business integration services.'
      }
      sections={sections}
    />
  );
}
