"use client";
import { useActionState } from "react";
import { saveOnboardingLink, verifyAndBind, rejectOnboarding } from "./actions";
export default function OnboardingAdminForms({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const [link, linkAction, linkBusy] = useActionState(saveOnboardingLink, {}),
    [bind, bindAction, bindBusy] = useActionState(verifyAndBind, {}),
    [reject, rejectAction, rejectBusy] = useActionState(rejectOnboarding, {});
  if (["connected", "rejected"].includes(status)) return null;
  return (
    <div className="mt-5 space-y-6">
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
      {status === "review" && (
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
