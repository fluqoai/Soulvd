export default function BankDetails() {
  return (
    <section className="space-y-3 rounded-xl border border-sage-200 bg-sage-50 p-5">
      <h2 className="font-bold">بيانات التحويل البنكي</h2>
      <p>
        المستفيد: <strong>مؤسسة سولفد</strong>
      </p>
      <div>
        <span className="text-sm text-wood-600">الآيبان</span>
        <p
          dir="ltr"
          className="mt-1 select-all break-all text-right font-mono text-lg"
        >
          SA7320000001000883029940
        </p>
      </div>
      <p className="text-sm leading-6">
        تحقق من اسم المستفيد في تطبيق البنك قبل التحويل. أرسل مرجع العملية من
        نموذج الطلب أدناه. يتم التفعيل بعد التحقق من وصول المبلغ إلى الحساب.
      </p>
    </section>
  );
}
