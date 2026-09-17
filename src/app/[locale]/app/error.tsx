"use client";
export default function WorkspaceError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <section
      role="alert"
      className="rounded-2xl border border-sage-200 bg-white p-8"
    >
      <h1 className="text-2xl font-bold">تعذر تحميل الصفحة الآن</h1>
      <p className="my-4 text-ink-600">
        تحقق من اتصالك ثم أعد المحاولة. إذا كنت قد أرسلت طلبًا، راجع حالته قبل
        تكراره.
      </p>
      <button
        onClick={reset}
        className="rounded-xl bg-sage-900 px-5 py-3 text-white"
      >
        إعادة المحاولة
      </button>
    </section>
  );
}
