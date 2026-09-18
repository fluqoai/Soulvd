"use client";
import { useActionState } from "react";
import { saveOnboardingLink, prepareAssistedSession, verifyAndBind, rejectOnboarding } from "./actions";
export default function OnboardingAdminForms({
  id,
  status,
  coexistence = true,
  method,
}: {
  id: string;
  status: string;
  coexistence?: boolean;
  method?: string;
}) {
  const [link, linkAction, linkBusy] = useActionState(saveOnboardingLink, {}),
    [bind, bindAction, bindBusy] = useActionState(verifyAndBind, {}),
    [session, sessionAction, sessionBusy] = useActionState(prepareAssistedSession, {}),
    [reject, rejectAction, rejectBusy] = useActionState(rejectOnboarding, {});
  if (["connected", "rejected"].includes(status)) return null;
  return (
    <div className="mt-5 space-y-6">
      {coexistence && ["awaiting_link", "awaiting_customer"].includes(status) && (
        <form action={sessionAction} className="space-y-3 rounded-xl bg-sage-50 p-4">
          <input type="hidden" name="id" value={id} />
          <h3 className="font-bold">جلسة ربط بمساعدتنا</h3>
          <p className="text-sm leading-7">من YCloud اختر Create Channel ثم Coexistence. يتولى العميل مسح QR والتفويض ببيانات منشأته. لا تشارك بيانات الدخول، ولا تربط الرقم بمجرد إدخاله.</p>
          <label className="flex items-start gap-2 text-sm leading-7">
            <input type="checkbox" name="arranged" required className="mt-2" />
            نسّقت الجلسة مع مالك الرقم وتأكدت أن لديه تطبيق واتساب الأعمال وبيانات منشأته.
          </label>
          <button disabled={sessionBusy} className="rounded-xl bg-sage-900 px-4 py-3 text-sm text-white disabled:opacity-50">
            {sessionBusy ? "جارٍ الحفظ…" : method === "assisted" ? "تحديث تجهيز الجلسة" : "تجهيز جلسة الربط للعميل"}
          </button>
          {session.message && <p role="status" className="text-sm">{session.message}</p>}
        </form>
      )}
      {coexistence && (
        <details>
          <summary className="cursor-pointer text-sm">استخدام رابط تفويض خارجي عند توفره</summary>
        <form action={linkAction} className="space-y-3">
          <input type="hidden" name="id" value={id} />
          <label className="block">
            رابط Onboard Link المخصص لهذا العميل
            <input
              name="url"
              type="url"
              required
              maxLength={2000}
              className="mt-2 w-full rounded border p-3"
            />
          </label>
          <button disabled={linkBusy} className="rounded border px-4 py-2">
            حفظ رابط التفويض
          </button>
          {link.message && <p role="status">{link.message}</p>}
        </form>
        </details>
      )}
      {coexistence && status === "review" && (
        <form action={bindAction} className="space-y-3">
          <input type="hidden" name="id" value={id} />
          <label className="block">
            WABA الخاص بالعميل لدى YCloud
            <input
              name="waba"
              required
              pattern="[0-9]{5,30}"
              className="mt-2 w-full rounded border p-3"
            />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="verified" required />
            تحققت أن صاحب هذه المساحة هو المفوض لإدارة الرقم وWABA، وأن طلب
            الربط يخصه.
          </label>
          <button
            disabled={bindBusy}
            className="rounded bg-sage-900 px-4 py-2 text-white"
          >
            تحقق من المزود واربط الرقم
          </button>
          {bind.message && <p role="status">{bind.message}</p>}
        </form>
      )}
      <details>
        <summary className="cursor-pointer text-sm">
          إعادة الطلب مع ملاحظة للعميل
        </summary>
        <form action={rejectAction} className="mt-3 space-y-3">
          <input type="hidden" name="id" value={id} />
          <label className="block text-sm">
            الملاحظة
            <textarea
              name="note"
              required
              maxLength={500}
              className="mt-2 w-full rounded border p-3"
            />
          </label>
          <button disabled={rejectBusy} className="rounded border px-4 py-2">
            إعادة الطلب
          </button>
          {reject.message && <p role="status">{reject.message}</p>}
        </form>
      </details>
    </div>
  );
}
