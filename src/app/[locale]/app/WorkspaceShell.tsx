"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";
import {
  ArrowUpLeft,
  Bot,
  Cable,
  ChevronLeft,
  CreditCard,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  PanelsTopLeft,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { logout } from "@/app/[locale]/(auth)/login/actions";
import { selectWorkspace } from "@/lib/tenancy/actions";

const navigation = [
  { href: "/app", label: "نظرة عامة", icon: LayoutDashboard },
  { href: "/app/whatsapp", label: "المحادثات", icon: MessageCircle },
  { href: "/app/automations", label: "الأتمتة والبوتات", icon: Bot },
  { href: "/app/templates", label: "مكتبة القوالب", icon: PanelsTopLeft },
  { href: "/app/integrations", label: "التكاملات", icon: Cable },
  { href: "/app/team", label: "فريق العمل", icon: Users },
  { href: "/app/billing", label: "الباقة والاستهلاك", icon: CreditCard },
  { href: "/app/readiness", label: "مركز الاختبار", icon: FlaskConical },
];
type Props = {
  children: ReactNode;
  email: string;
  currentId?: string;
  currentName?: string;
  isTest?: boolean;
  canAdmin: boolean;
  workspaces: { id: string; name: string; is_test: boolean }[];
};

function Navigation({ path, close }: { path: string; close?: () => void }) {
  return (
    <nav aria-label="التنقل الرئيسي" className="space-y-1">
      {navigation.map(({ href, label, icon: Icon }) => {
        const active = href === "/app" ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={close}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-600 ${active ? "bg-sage-900 text-white shadow-sm" : "text-ink-600 hover:bg-sage-50 hover:text-sage-900"}`}
          >
            <Icon size={19} aria-hidden="true" />
            <span className="flex-1">{label}</span>
            {active && <ChevronLeft size={15} aria-hidden="true" />}
          </Link>
        );
      })}
    </nav>
  );
}

export default function WorkspaceShell({
  children,
  email,
  currentId,
  currentName,
  isTest,
  canAdmin,
  workspaces,
}: Props) {
  const path = usePathname().replace(/^\/(ar|en)(?=\/)/, "");
  const title =
    [...navigation]
      .reverse()
      .find((item) =>
        item.href === "/app" ? path === item.href : path.startsWith(item.href),
      )?.label ?? "مساحة العمل";
  const drawer = useRef<HTMLDialogElement>(null);
  const close = () => drawer.current?.close();
  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-h-screen bg-[#f6f7f5] font-arabic text-ink-900"
    >
      <a
        href="#workspace-content"
        className="sr-only z-50 rounded bg-white p-3 focus:not-sr-only focus:fixed focus:top-2 focus:right-2"
      >
        انتقل إلى المحتوى
      </a>
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-64 flex-col border-l border-sage-100 bg-white px-4 py-6 lg:flex">
        <Link href="/app" className="mb-8 px-4 py-1">
          <span dir="ltr" className="text-3xl font-bold tracking-tight">
            Soulvd<span className="text-sage-500">.</span>
          </span>
        </Link>
        <p className="mb-3 px-4 text-xs font-medium text-ink-500">مساحة عملك</p>
        <Navigation path={path} />
        <div className="mt-auto space-y-4 pt-8">
          {canAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-xl border border-sage-100 p-3 text-sm text-ink-600"
            >
              <ShieldCheck size={17} aria-hidden="true" />
              إدارة المنصة
              <ArrowUpLeft className="ms-auto" size={15} aria-hidden="true" />
            </Link>
          )}
          <div className="border-t border-sage-100 px-2 pt-4">
            <p className="text-xs text-ink-500">الحساب الحالي</p>
            <p
              dir="ltr"
              className="my-2 truncate text-right text-xs"
              title={email}
            >
              {email}
            </p>
            <form action={logout}>
              <button className="flex items-center gap-2 py-2 text-xs text-ink-600">
                <LogOut size={14} aria-hidden="true" />
                تسجيل الخروج
              </button>
            </form>
          </div>
        </div>
      </aside>
      <div className="min-w-0 lg:mr-64">
        <header className="sticky top-0 z-20 border-b border-sage-100 bg-white/95 px-4 py-4 backdrop-blur sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
            <button
              aria-label="فتح قائمة التنقل"
              onClick={() => drawer.current?.showModal()}
              className="rounded-xl border border-sage-200 p-2 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <span className="hidden text-sm text-ink-500 sm:inline">
              مساحة العمل
            </span>
            <ChevronLeft
              size={15}
              className="hidden text-sage-400 sm:block"
              aria-hidden="true"
            />
            <span className="text-sm font-semibold">{title}</span>
            <div className="ms-auto w-full sm:max-w-sm sm:flex-1">
              {workspaces.length > 1 ? (
                <form
                  action={selectWorkspace}
                  className="flex min-w-0 items-center gap-2"
                >
                  <select
                    name="tenant"
                    aria-label="مساحة العمل"
                    defaultValue={currentId}
                    className="min-w-0 flex-1 rounded-xl border border-sage-200 bg-white px-3 py-2 text-sm"
                  >
                    {workspaces.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                        {w.is_test ? " (اختبار)" : ""}
                      </option>
                    ))}
                  </select>
                  <button className="shrink-0 rounded-lg px-2 py-2 text-sm font-semibold text-sage-700 hover:bg-sage-50">
                    فتح
                  </button>
                </form>
              ) : (
                <p
                  className="truncate text-sm font-semibold"
                  title={currentName}
                >
                  {currentName ?? "مساحة جديدة"}
                </p>
              )}
            </div>
          </div>
        </header>
        <main
          id="workspace-content"
          className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8"
        >
          {isTest && (
            <div
              role="status"
              className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              <FlaskConical
                size={18}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <p>
                <strong>مساحة اختبار</strong> — لا تمثل اشتراكًا مدفوعًا. إرسال
                رسائل إلى أرقام حقيقية قد يستهلك رصيد واتساب.
              </p>
            </div>
          )}
          {children}
        </main>
      </div>
      <dialog
        ref={drawer}
        aria-label="قائمة التنقل"
        className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-80 max-w-[90vw] border-0 bg-white p-5 text-ink-900 shadow-xl backdrop:bg-sage-900/40"
      >
        <div className="mb-6 flex items-center justify-between">
          <strong dir="ltr" className="text-2xl">
            Soulvd.
          </strong>
          <button
            onClick={close}
            aria-label="إغلاق القائمة"
            className="rounded-lg p-2"
          >
            <X size={21} />
          </button>
        </div>
        <Navigation path={path} close={close} />
        <div className="mt-6 border-t border-sage-100 pt-4">
          <p className="mb-4 break-all text-xs" dir="ltr">
            {email}
          </p>
          {canAdmin && (
            <Link href="/admin" onClick={close} className="mb-4 block text-sm">
              إدارة المنصة
            </Link>
          )}
          <form action={logout}>
            <button className="text-sm text-ink-600">تسجيل الخروج</button>
          </form>
        </div>
      </dialog>
    </div>
  );
}
