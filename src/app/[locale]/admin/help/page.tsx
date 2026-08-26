// src/app/[locale]/admin/help/page.tsx
// Arabic documentation for every table in the admin.
// Accessible to both owner and editor roles.

import {
  Home,
  Sparkles,
  Building2,
  BarChart3,
  Wand2,
  PlugZap,
  Quote,
  Star,
  Users,
  Handshake,
  Inbox,
  UserSquare2,
  FileText,
  Receipt,
  ScrollText,
  Settings,
  Activity,
  Database,
  Image as ImageIcon,
  Layout,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/admin/PageHeader';

export const metadata = {
  title: 'دليل الجداول · لوحة الإدارة',
};

type Section = {
  id: string;
  table: string;
  title: string;
  short: string;
  icon: LucideIcon;
  why: string;
  fields: Array<{ key: string; ar: string; note?: string }>;
  editSteps: string[];
  publicShows: string;
  supabase: string;
};

const SECTIONS: Section[] = [
  {
    id: 'home-page',
    table: 'pages',
    title: 'الصفحة الرئيسية (Hero, عناوين الأقسام)',
    short: 'محتوى الصفحة الرئيسية الديناميكي',
    icon: Home,
    why:
      'تتحكم في العناوين والنصوص التي يراها الزائر في أعلى الصفحة الرئيسية. تجعل النص يتغير دون كود.',
    fields: [
      { key: 'slug',     ar: 'المعرّف (home)', note: 'الصفحة الرئيسية = home' },
      { key: 'title_ar', ar: 'العنوان بالعربية' },
      { key: 'title_en', ar: 'العنوان بالإنجليزية' },
      { key: 'body_ar',  ar: 'النص الكامل بالعربية (JSON)', note: 'يحتوي على hero, sections, إلخ' },
      { key: 'body_en',  ar: 'النص الكامل بالإنجليزية (JSON)' },
      { key: 'published',ar: 'منشور؟' },
    ],
    editSteps: [
      'افتح /admin/home',
      'اضغط تعديل على السجل الموجود (slug = "home")',
      'غيّر العنوان أو النص الكامل (JSON متاح في حقل body)',
      'اضغط حفظ',
    ],
    publicShows: 'يظهر في أعلى الصفحة الرئيسية — تحت شريط التنقل مباشرة.',
    supabase:
      'افتح Supabase → Table Editor → pages. السجل الذي slug = "home" هو محتوى الصفحة الرئيسية. لا تحذفه أبداً.',
  },
  {
    id: 'services',
    table: 'services',
    title: 'الخدمات',
    short: 'الخدمات التي تقدمها سولڤد',
    icon: Sparkles,
    why:
      'قائمة الخدمات الست المعروضة في الصفحة الرئيسية وصفحة /services. كل خدمة لها عنوان ووصف بالعربية والإنجليزية وأيقونة.',
    fields: [
      { key: 'title_ar / title_en', ar: 'اسم الخدمة بلغتين' },
      { key: 'description_ar / description_en', ar: 'وصف قصير بلغتين' },
      { key: 'icon', ar: 'اسم أيقونة Lucide', note: 'مثل: Bot, MessageSquare, ShoppingBag' },
      { key: 'order_index', ar: 'ترتيب العرض (رقم صغير = يظهر أولاً)' },
      { key: 'published', ar: 'منشور؟ (إخفاء مؤقت دون حذف)' },
    ],
    editSteps: [
      'افتح /admin/services',
      'اضغط "خدمة جديدة" لإضافة، أو "تعديل" بجانب أي صف',
      'املأ العنوان والوصف بلغتين، اختر أيقونة، حدد الترتيب',
      'اضغط حفظ',
    ],
    publicShows:
      'يظهر في قسم "الخدمات" في الصفحة الرئيسية، وفي صفحة /services كاملة.',
    supabase:
      'Table Editor → services. عمود `icon` يجب أن يطابق اسم مكون في lucide-react (مثل "Bot" يكافئ أيقونة الروبوت).',
  },
  {
    id: 'sectors',
    table: 'sectors',
    title: 'القطاعات',
    short: 'القطاعات التي تستهدفها الشركة (مطاعم، عقارات، ...)',
    icon: Building2,
    why:
      'تظهر كبطاقات في الصفحة الرئيسية ولكل قطاع صفحة كاملة في /sectors/[slug]. تساعد في تخصيص الرسالة لكل صناعة.',
    fields: [
      { key: 'slug', ar: 'المعرّف في الـ URL', note: 'بالإنجليزية فقط، بدون مسافات' },
      { key: 'name_ar / name_en', ar: 'اسم القطاع' },
      { key: 'description_ar / description_en', ar: 'وصف قصير' },
      { key: 'long_description_ar / _en', ar: 'وصف تفصيلي (يظهر في صفحة القطاع)' },
      { key: 'icon', ar: 'اسم أيقونة' },
      { key: 'order_index', ar: 'ترتيب العرض' },
      { key: 'published', ar: 'منشور؟' },
    ],
    editSteps: [
      'افتح /admin/sectors',
      'أضف قطاعاً جديداً (مثل: مدارس، مستشفيات)',
      'املأ slug بالإنجليزية (schools, hospitals)',
      'العناوين والوصف بلغتين، الترتيب، ثم حفظ',
    ],
    publicShows:
      'يظهر كشبكة بطاقات في /sectors. كل بطاقة تفتح صفحة تفصيلية.',
    supabase:
      'Table Editor → sectors. لا تغيّر الـ slug بعد النشر — يكسر روابط Google وصفحات القطاع.',
  },
  {
    id: 'stats',
    table: 'stats',
    title: 'الأرقام الكبيرة',
    short: 'إحصائيات وعلامات فارقة (مثل: 500+ عميل، 2M+ رسالة)',
    icon: BarChart3,
    why:
      'الأرقام الضخمة المعروضة في الصفحة الرئيسية تبني الثقة بسرعة ("+500 عميل"). اجعلها حقيقية ومحدّثة.',
    fields: [
      { key: 'value', ar: 'القيمة (رقم)', note: 'مثل: 500 أو 2.4 أو 99' },
      { key: 'suffix_ar / suffix_en', ar: 'لاحقة', note: 'مثل: "+ عميل" أو "M+ رسالة"' },
      { key: 'label_ar / label_en', ar: 'تسمية توضيحية' },
      { key: 'order_index', ar: 'ترتيب العرض' },
      { key: 'published', ar: 'منشور؟' },
    ],
    editSteps: [
      'افتح /admin/stats',
      'أضف رقماً جديداً (value + suffix + label)',
      'استخدم suffix قصير ليظهر بشكل أنيق',
      'احفظ',
    ],
    publicShows: 'يظهر كصف من الأرقام الكبيرة في الصفحة الرئيسية.',
    supabase:
      'Table Editor → stats. احرص على أن تكون الأرقام حقيقية — كذب الأرقام يدمر الثقة.',
  },
  {
    id: 'value_props',
    table: 'value_props',
    title: 'القيم المضافة',
    short: 'لماذا سولڤد؟ (3-4 نقاط قوة رئيسية)',
    icon: Wand2,
    why:
      'تظهر أسفل قسم الخدمات. تجيب على "لماذا أنتم؟" قبل أن يسأل الزائر.',
    fields: [
      { key: 'title_ar / title_en', ar: 'العنوان' },
      { key: 'description_ar / description_en', ar: 'الوصف' },
      { key: 'icon', ar: 'اسم أيقونة' },
      { key: 'order_index', ar: 'الترتيب' },
      { key: 'published', ar: 'منشور؟' },
    ],
    editSteps: ['افتح /admin/value-props', 'أضف قيمة بأيقونة وعنوان ووصف مختصر', 'احفظ.'],
    publicShows: 'يظهر في قسم "لماذا سولڤد" في الصفحة الرئيسية.',
    supabase: 'Table Editor → value_props.',
  },
  {
    id: 'integrations',
    table: 'integrations',
    title: 'التكاملات',
    short: 'الأنظمة التي يتكامل معها بوت سولڤد',
    icon: PlugZap,
    why:
      'تظهر كشبكة شعارات في صفحة /services. تثبت أن سولڤد يعمل مع stack الموجود لدى العميل.',
    fields: [
      { key: 'name', ar: 'اسم النظام (Stripe, HubSpot, ...)' },
      { key: 'description_ar / description_en', ar: 'وصف قصير' },
      { key: 'logo_url', ar: 'رابط الشعار', note: 'يفضّل رفعه في Supabase Storage bucket "media"' },
      { key: 'order_index', ar: 'الترتيب' },
      { key: 'published', ar: 'منشور؟' },
    ],
    editSteps: [
      'افتح /admin/integrations',
      'أضف اسماً ووصفاً مختصراً',
      'الصق رابط الشعار (URL خارجي أو ارفعه في Supabase Storage)',
      'احفظ',
    ],
    publicShows: 'يظهر كشبكة شعارات في /services وفي قسم "التكاملات".',
    supabase:
      'Table Editor → integrations. الشعارات مخزّنة في bucket "media" في Storage.',
  },
  {
    id: 'case_studies',
    table: 'case_studies',
    title: 'دراسات الحالة',
    short: 'قصص نجاح حقيقية (مطعم +40% طلبات، إلخ)',
    icon: Quote,
    why:
      'أقوى أداة إقناع. تُري الزائر نتائج حقيقية بدل وعود. درس واحد قوي = عشرات الزيارات.',
    fields: [
      { key: 'client_name', ar: 'اسم العميل' },
      { key: 'industry', ar: 'القطاع' },
      { key: 'result_metric', ar: 'النتيجة الرئيسية (مثل: +40% طلبات)' },
      { key: 'challenge_ar / _en', ar: 'التحدي' },
      { key: 'solution_ar / _en', ar: 'الحل' },
      { key: 'outcome_ar / _en', ar: 'النتيجة' },
      { key: 'logo_url', ar: 'شعار العميل (اختياري)' },
      { key: 'order_index', ar: 'الترتيب' },
      { key: 'published', ar: 'منشور؟' },
    ],
    editSteps: [
      'افتح /admin/case-studies',
      'أضف دراسة جديدة: اسم العميل + القطاع + النتيجة الكبيرة',
      'اكتب التحدي/الحل/النتيجة بالعربية والإنجليزية',
      'احفظ',
    ],
    publicShows: 'يظهر في الصفحة الرئيسية كقسم مميز، وفي صفحة /case-studies.',
    supabase:
      'Table Editor → case_studies. اجعلها مبنية على أرقام حقيقية — العميل المحتمل سيسأل عن التفاصيل.',
  },
  {
    id: 'testimonials',
    table: 'testimonials',
    title: 'الشهادات',
    short: 'اقتباسات قصيرة من العملاء',
    icon: Star,
    why:
      'اقتباس من شخص حقيقي يبني ثقة فورية. يكمل دراسات الحالة (نص قصير من شخص vs قصة تفصيلية).',
    fields: [
      { key: 'client_name', ar: 'اسم العميل' },
      { key: 'client_role', ar: 'المنصب / الشركة' },
      { key: 'quote_ar / quote_en', ar: 'الاقتباس' },
      { key: 'avatar_url', ar: 'صورة العميل (اختياري)' },
      { key: 'order_index', ar: 'الترتيب' },
      { key: 'published', ar: 'منشور؟' },
    ],
    editSteps: [
      'افتح /admin/testimonials',
      'أضف: اسم العميل + منصبه + الاقتباس',
      'يفضّل اقتباس 1-2 جملة فقط',
      'احفظ',
    ],
    publicShows: 'يظهر في الصفحة الرئيسية، أسفل دراسات الحالة.',
    supabase:
      'Table Editor → testimonials. اطلب الإذن من العميل قبل نشر اسمه/شعاره.',
  },
  {
    id: 'team',
    table: 'team_members',
    title: 'الفريق',
    short: 'أعضاء فريق سولڤد',
    icon: Users,
    why:
      'العملاء في السعودية يريدون أن يعرفوا مع من سيعملون. وجوه حقيقية = ثقة.',
    fields: [
      { key: 'full_name', ar: 'الاسم الكامل' },
      { key: 'role_ar / role_en', ar: 'المنصب' },
      { key: 'bio_ar / bio_en', ar: 'نبذة قصيرة' },
      { key: 'photo_url', ar: 'الصورة الشخصية' },
      { key: 'links', ar: 'روابط (LinkedIn, Twitter, ...)' },
      { key: 'order_index', ar: 'الترتيب' },
      { key: 'published', ar: 'منشور؟' },
    ],
    editSteps: [
      'افتح /admin/team',
      'أضف عضو فريق: الاسم + المنصب + صورة',
      'روابط LinkedIn و Twitter اختيارية',
      'احفظ',
    ],
    publicShows: 'يظهر في صفحة /about.',
    supabase:
      'Table Editor → team_members. ارفع الصور في bucket "media".',
  },
  {
    id: 'partners',
    table: 'partners',
    title: 'الشركاء',
    short: 'شركاء النجاح (Meta, WhatsApp, Stripe, ...)',
    icon: Handshake,
    why:
      'الشريط المتحرك في الصفحة الرئيسية. شعارات Meta و WhatsApp و Stripe = "إذا كانت هذه الشركات معنا فنحن جادون".',
    fields: [
      { key: 'name', ar: 'اسم الشريك' },
      { key: 'logo_url', ar: 'رابط الشعار (PNG شفاف)' },
      { key: 'url', ar: 'موقع الشريك (اختياري)' },
      { key: 'order_index', ar: 'الترتيب في الشريط' },
      { key: 'published', ar: 'منشور؟' },
    ],
    editSteps: [
      'الطريقة السهلة: افتح /admin/partners → تعديل → ارفع شعار جديد',
      'الطريقة في Supabase: Table Editor → partners → ارفع الشعار في Storage bucket "media" → الصق الرابط العام',
    ],
    publicShows: 'شريط متحرك في أسفل الصفحة الرئيسية وصفحة /about.',
    supabase:
      'Storage → "media" bucket → ارفع PNG شفاف بخلفية بيضاء أو ملونة. استخدم order_index لترتيب الظهور. حدّث logo_url.',
  },
  {
    id: 'leads',
    table: 'leads',
    title: 'الاستفسارات الواردة',
    short: 'من ترك بياناته في الموقع',
    icon: Inbox,
    why:
      'كل استفسار من الموقع (نموذج الاتصال، CTA في الصفحة الرئيسية) يسجل هنا. لا تضيع أي عميل محتمل.',
    fields: [
      { key: 'name / email / phone / company', ar: 'بيانات التواصل' },
      { key: 'message', ar: 'الرسالة' },
      { key: 'source', ar: 'المصدر (contact_form, home_cta, ...)' },
      { key: 'status', ar: 'الحالة (new, contacted, qualified, closed, lost)' },
      { key: 'notes', ar: 'ملاحظات الفريق (سجل زمني)' },
      { key: 'metadata', ar: 'بيانات إضافية (locale, client_id بعد التحويل)' },
    ],
    editSteps: [
      'افتح /admin/leads',
      'استخدم التبويبات (الكل / جديد / تم التواصل / مؤهل / مغلق / خاسر)',
      'اضغط على استفسار لعرض تفاصيله، تغيير الحالة، إضافة ملاحظات',
      'اضغط "تحويل إلى عميل" لتحويل الاستفسار المؤهل إلى صفقة في جدول clients',
    ],
    publicShows: 'لا يظهر للزوار — هذه بيانات داخلية فقط.',
    supabase:
      'Table Editor → leads. استخدم الفلتر (status = new) لمتابعة الاستفسارات الجديدة. لا تحذف استفساراً — استخدم status = lost بدلاً من ذلك.',
  },
  {
    id: 'clients',
    table: 'clients',
    title: 'العملاء',
    short: 'العملاء الفعليون (بعد التحويل من lead)',
    icon: UserSquare2,
    why:
      'العملاء الذين أبرمنا معهم صفقة. تُستخدم بياناتهم لإنشاء فواتير وعروض أسعار.',
    fields: [
      { key: 'name / company', ar: 'الاسم والشركة' },
      { key: 'email / phone', ar: 'بيانات التواصل' },
      { key: 'vat_number', ar: 'الرقم الضريبي (مطلوب للفواتير)' },
      { key: 'address / city / country', ar: 'العنوان (للفواتير)' },
      { key: 'notes', ar: 'ملاحظات داخلية' },
    ],
    editSteps: [
      'افتح /admin/clients',
      'أضف عميلاً يدوياً، أو حوّل استفسار من /admin/leads',
      'املأ الاسم + الرقم الضريبي + العنوان (مطلوبة للفواتير)',
      'احفظ',
    ],
    publicShows: 'لا يظهر للزوار — هذه بيانات العملاء الفعلية فقط.',
    supabase:
      'Table Editor → clients. حافظ على اكتمال vat_number و address — تُستخدم في توليد الفواتير.',
  },
  {
    id: 'templates',
    table: 'templates',
    title: 'القوالب (قوالب .docx)',
    short: 'قوالب المستندات الجاهزة للفواتير والعروض',
    icon: FileText,
    why:
      'عند توليد فاتورة/عرض، يُملأ القالب بالبيانات (اسم العميل، المبالغ، البنود). ارفع قالبك مرة، استخدمه مرات لا نهائية.',
    fields: [
      { key: 'name', ar: 'اسم القالب' },
      { key: 'type', ar: 'النوع (invoice / quote / contract)' },
      { key: 'file_url', ar: 'رابط ملف .docx' },
      { key: 'field_schema', ar: 'JSON: الحقول التي يملأها النظام', note: 'مثل: {client_name: "string", total: "number"}' },
      { key: 'language', ar: 'ar / en / bilingual' },
    ],
    editSteps: [
      'ارفع ملف .docx في Storage bucket "templates"',
      'انسخ الرابط العام',
      'افتح /admin/templates → أضف قالباً جديداً',
      'حدد الحقول في field_schema (مثل: {{client_name}}, {{total}})',
    ],
    publicShows: 'لا يظهر للزوار — هذه ملفات داخلية.',
    supabase:
      'Storage → "templates" bucket. Table Editor → templates. عند التوليد: يُحمّل القالب، يُملأ، يُعاد كـ .docx + PDF.',
  },
  {
    id: 'invoices',
    table: 'invoices',
    title: 'الفواتير',
    short: 'الفواتير المُولّدة والمُرسلة',
    icon: Receipt,
    why:
      'كل فاتورة تُنشأ تسجل هنا مع حالتها (مسودة، مرسلة، مدفوعة، متأخرة). مصدر الحقيقة للمحاسبة.',
    fields: [
      { key: 'client_id', ar: 'العميل (FK → clients)' },
      { key: 'invoice_number', ar: 'رقم الفاتورة' },
      { key: 'amount / vat / total', ar: 'المبالغ' },
      { key: 'status', ar: 'الحالة (draft, sent, paid, overdue)' },
      { key: 'due_date / issued_date', ar: 'التواريخ' },
      { key: 'items', ar: 'بنود الفاتورة (JSON array)' },
    ],
    editSteps: ['افتح /admin/invoices', 'أنشئ فاتورة جديدة من عميل + قالب', 'راجع البنود والمبالغ', 'ولّد PDF وأرسل.'],
    publicShows: 'لا يظهر للزوار — نظام داخلي.',
    supabase: 'Table Editor → invoices. لا تحذف فاتورة مرسلة — استخدم status = cancelled أو refunded.',
  },
  {
    id: 'quotes',
    table: 'quotes',
    title: 'عروض الأسعار',
    short: 'عروض الأسعار المرسلة للعملاء المحتملين',
    icon: ScrollText,
    why:
      'مثل الفواتير، لكن قبل إتمام الصفقة. يحمل validity_date (متى ينتهي العرض).',
    fields: [
      { key: 'client_id / lead_id', ar: 'العميل أو الاستفسار' },
      { key: 'quote_number', ar: 'رقم العرض' },
      { key: 'total', ar: 'المبلغ الإجمالي' },
      { key: 'status', ar: 'الحالة (draft, sent, accepted, rejected, expired)' },
      { key: 'validity_date', ar: 'تاريخ انتهاء صلاحية العرض' },
      { key: 'items', ar: 'بنود العرض (JSON)' },
    ],
    editSteps: [
      'افتح /admin/quotes',
      'أنشئ عرض سعر (من lead أو client)',
      'حدد validity_date (عادة 30 يوم)',
      'ولّد PDF وأرسل للعميل',
    ],
    publicShows: 'لا يظهر للزوار.',
    supabase: 'Table Editor → quotes. عند قبول عرض، حوّله إلى invoice.',
  },
  {
    id: 'users',
    table: 'users',
    title: 'المستخدمون',
    short: 'حسابات فريق الإدارة',
    icon: Users,
    why:
      'كل من يستطيع دخول /admin هو entry في هذا الجدول. المالك (owner) يرى كل شيء؛ المحرر (editor) محدود.',
    fields: [
      { key: 'email', ar: 'البريد (يجب أن يطابق auth.users)' },
      { key: 'full_name', ar: 'الاسم' },
      { key: 'role', ar: 'الدور: owner أو editor' },
      { key: 'avatar_url', ar: 'الصورة (اختياري)' },
    ],
    editSteps: [
      'أضف المستخدم أولاً في Supabase Authentication (لإنشاء كلمة المرور)',
      'ثم في Table Editor → users → أضف صفاً يطابق الـ id و email',
      'حدد role = owner أو editor',
    ],
    publicShows: 'لا يظهر — خاص بالإدارة.',
    supabase:
      '⚠️ خطير: لا تحذف صف من users بدون حذف الحساب في Authentication أولاً. الـ trigger tg_handle_new_user ينشئ الصف تلقائياً عند تسجيل حساب جديد.',
  },
  {
    id: 'activity-log',
    table: 'activity_log',
    title: 'سجل النشاط',
    short: 'كل ما يحدث في النظام',
    icon: Activity,
    why:
      'تدقيق تلقائي. يُسجل: تغيير حالة استفسار، إضافة ملاحظة، تحويل إلى عميل، تعديل سجل، حذف.',
    fields: [
      { key: 'actor_id', ar: 'من قام بالفعل (FK → users)' },
      { key: 'action', ar: 'نوع الفعل (status_changed, note_added, created, ...)' },
      { key: 'entity_type / entity_id', ar: 'ما الذي تأثر (lead, invoice, ...)' },
      { key: 'details', ar: 'تفاصيل إضافية (JSON)' },
      { key: 'created_at', ar: 'الوقت' },
    ],
    editSteps: [
      'افتح /admin/activity-log',
      'استخدمه للمراجعة (متى تم تحويل هذا الـ lead؟)',
      'لا تعدّل السجل — هو تدقيق فقط',
    ],
    publicShows: 'لا يظهر — خاص بالمالك (owner) للمراجعة.',
    supabase: 'Table Editor → activity_log. يُملأ تلقائياً عبر server actions. لا تحذفه إلا لأرشفة قديمة.',
  },
  {
    id: 'settings',
    table: 'site_settings',
    title: 'إعدادات الموقع',
    short: 'إعدادات عامة (الاسم، الشعار، الوصف، أرقام التواصل)',
    icon: Settings,
    why:
      'مصدر واحد للحقيقة لإعدادات الموقع. بدلاً من تعديل عدة ملفات، غيّر من هنا.',
    fields: [
      { key: 'site_name', ar: 'اسم الموقع' },
      { key: 'tagline_ar / tagline_en', ar: 'الشعار النصي' },
      { key: 'contact_email / contact_phone / whatsapp_number', ar: 'بيانات التواصل' },
      { key: 'social_links', ar: 'روابط السوشال (JSON)' },
    ],
    editSteps: [
      'افتح /admin/settings',
      'عدّل الإعدادات التي تريد',
      'احفظ. التغييرات تنعكس على الـ header والـ footer فوراً',
    ],
    publicShows: 'يظهر في الـ header والـ footer وفي OpenGraph.',
    supabase: 'Table Editor → site_settings. السجل الذي key = "main" يحتوي الإعدادات الرئيسية.',
  },
  {
    id: 'media',
    table: 'media (Storage)',
    title: 'الوسائط (Storage)',
    short: 'الصور والشعارات والملفات المرفوعة',
    icon: ImageIcon,
    why:
      'مكان واحد لكل الملفات: شعارات الشركاء، صور الفريق، شعارات العملاء، قوالب .docx، إلخ.',
    fields: [
      { key: 'bucket: media', ar: 'الصور والشعارات (العميل، الفريق، الشركاء، دراسات الحالة)' },
      { key: 'bucket: templates', ar: 'قوالب .docx (الفواتير، العروض)' },
    ],
    editSteps: [
      'Storage → اختر الـ bucket (media أو templates)',
      'اضغط "Upload file"',
      'بعد الرفع، اضغط على الملف → Copy URL (اجعله Public)',
      'الصق الرابط في الحقل المناسب (مثل logo_url)',
    ],
    publicShows: 'تظهر في كل مكان في الموقع.',
    supabase:
      'Storage → 3 buckets: media, templates, avatars. تأكد من Public access لكل ملف تريد إظهاره.',
  },
  {
    id: 'pages',
    table: 'pages (جدول عام)',
    title: 'الصفحات (جدول عام)',
    short: 'محتوى ديناميكي للصفحات (hero, about, contact sections)',
    icon: Layout,
    why:
      'بدلاً من تعديل الكود، عدّل النصوص من هنا. كل صفحة لها slug فريد (home, about-hero, إلخ).',
    fields: [
      { key: 'slug', ar: 'معرّف الصفحة (unique)' },
      { key: 'title_ar / title_en', ar: 'العنوان' },
      { key: 'body_ar / body_en', ar: 'المحتوى (JSON مرن)' },
      { key: 'published', ar: 'منشور؟' },
    ],
    editSteps: [
      'افتح /admin/home (مخصص للصفحة الرئيسية)',
      'أو /admin/pages (للصفحات الأخرى)',
      'عدّل body كـ JSON: {"hero": {...}, "sections": [...]}',
    ],
    publicShows: 'يظهر في كل صفحة حسب الـ slug.',
    supabase: 'Table Editor → pages. كل slug يقابل مسار URL.',
  },
];

export default function HelpPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="دليل الجداول"
        description="شرح كامل لكل جدول في النظام: ما هو، كيف يُستخدم، كيف تعدّله، وكيف تديره في Supabase."
      />

      {/* Quick start */}
      <section className="mb-10 rounded-2xl border border-ink-900/10 bg-paper p-6 md:p-7">
        <h2 className="text-lg font-semibold text-ink-900 mb-3 flex items-center gap-2">
          <Database className="size-5 text-sage-700" />
          ابدأ من هنا
        </h2>
        <ol className="space-y-2 text-sm text-ink-700 list-decimal list-inside leading-relaxed">
          <li>
            <strong>لتغيير محتوى الموقع</strong> (عناوين، نصوص، شعارات): استخدم القوائم في الشريط الجانبي. كل تغيير يظهر فوراً على الموقع العام.
          </li>
          <li>
            <strong>لرفع صور/شعارات</strong>: ارفعها في Supabase Storage (bucket: <code className="px-1.5 py-0.5 rounded bg-linen-100 text-ink-900">media</code>) ثم الصق الرابط العام في حقل <code className="px-1.5 py-0.5 rounded bg-linen-100 text-ink-900">logo_url</code> أو <code className="px-1.5 py-0.5 rounded bg-linen-100 text-ink-900">photo_url</code>.
          </li>
          <li>
            <strong>لإدارة متقدمة</strong> (SQL، حذف بالجملة، إعدادات حساسة): افتح Supabase Dashboard → Table Editor / SQL Editor. راجع كل جدول في الأسفل لمعرفة الحقول.
          </li>
          <li>
            <strong>للوصول لـ Supabase</strong>: ادخل على <a className="text-sage-700 hover:underline font-medium" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">supabase.com/dashboard</a> وافتح مشروع <code className="px-1.5 py-0.5 rounded bg-linen-100 text-ink-900">lyvoiipsmcbffvpkrxhy</code>.
          </li>
        </ol>
      </section>

      {/* Table of contents */}
      <nav className="mb-10 rounded-2xl border border-ink-900/10 bg-sage-50/40 p-6">
        <h2 className="text-base font-semibold text-ink-900 mb-3">الفهرس</h2>
        <ul className="grid gap-1.5 sm:grid-cols-2 md:grid-cols-3 text-sm">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-ink-700 hover:bg-sage-100 hover:text-sage-800 transition-colors"
                >
                  <Icon className="size-3.5 shrink-0 text-sage-700" aria-hidden />
                  <span className="truncate">{s.title}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sections */}
      <div className="space-y-6">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <section
              key={s.id}
              id={s.id}
              className="scroll-mt-20 rounded-2xl border border-ink-900/10 bg-paper p-6 md:p-7"
            >
              <header className="mb-5 flex items-start gap-3">
                <div className="size-10 shrink-0 rounded-lg bg-sage-50 grid place-items-center text-sage-700">
                  <Icon className="size-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-semibold text-ink-900">{s.title}</h2>
                  <p className="text-sm text-ink-600 mt-0.5">{s.short}</p>
                </div>
                <code className="hidden md:block text-[11px] font-mono text-ink-500 bg-linen-100 px-2 py-1 rounded border border-ink-900/10 shrink-0">
                  {s.table}
                </code>
              </header>

              <div className="space-y-5 text-sm">
                {/* Why */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-700 mb-2">
                    ما هي / لماذا؟
                  </h3>
                  <p className="text-ink-800 leading-relaxed">{s.why}</p>
                </div>

                {/* Fields */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-700 mb-2">
                    الحقول
                  </h3>
                  <div className="rounded-lg border border-ink-900/10 overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-ink-900/5">
                        {s.fields.map((f) => (
                          <tr key={f.key} className="bg-paper even:bg-sage-50/30">
                            <td className="px-3 py-2 font-mono text-xs text-ink-700 whitespace-nowrap">
                              {f.key}
                            </td>
                            <td className="px-3 py-2 text-ink-900">{f.ar}</td>
                            {f.note && (
                              <td className="px-3 py-2 text-xs text-ink-600 italic hidden md:table-cell">
                                {f.note}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Edit steps */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-700 mb-2">
                    كيف تعدّل من لوحة الإدارة
                  </h3>
                  <ol className="space-y-1.5 list-decimal list-inside text-ink-800">
                    {s.editSteps.map((step, i) => (
                      <li key={i} className="leading-relaxed">
                        {step.includes('افتح /admin/') ? (
                          <StepWithLink step={step} />
                        ) : (
                          step
                        )}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Public site */}
                <div className="bg-sage-50/50 border-s-4 border-sage-500 ps-4 py-2 rounded-e">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-sage-800 mb-1">
                    أين يظهر في الموقع؟
                  </h3>
                  <p className="text-ink-800 leading-relaxed">{s.publicShows}</p>
                </div>

                {/* Supabase */}
                <div className="bg-linen-100/60 border-s-4 border-wood-500 ps-4 py-2 rounded-e">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-wood-700 mb-1">
                    الإدارة المباشرة في Supabase
                  </h3>
                  <p className="text-ink-800 leading-relaxed whitespace-pre-line">{s.supabase}</p>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Footer note */}
      <aside className="mt-10 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-semibold mb-1">⚠️ قبل أي تعديل في Supabase مباشرة</p>
        <p>
          دائماً خذ نسخة احتياطية قبل الحذف. بعض الجداول لها RLS (Row Level Security) —
          إذا كان الـ user الذي تستخدمه ليس service_role، فلن تستطيع تعديل بعض الصفوف.
          استخدم SQL Editor بحذر.
        </p>
      </aside>
    </div>
  );
}

function StepWithLink({ step }: { step: string }) {
  // Render "/admin/xxx" as a link
  const match = step.match(/^(.*?)(افتح \/admin\/[\w-]+)(.*)$/);
  if (!match) return <>{step}</>;
  const [, before, link, after] = match;
  const href = link.replace('افتح ', '').trim();
  return (
    <>
      {before}
      <Link
        href={href}
        className="text-sage-700 hover:text-sage-900 hover:underline font-medium"
      >
        {link}
      </Link>
      {after}
    </>
  );
}
