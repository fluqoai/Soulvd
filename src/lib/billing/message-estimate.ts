// Provider Saudi rate card, checked 2026-09-19. Estimates expire, never drive settlement.
export const RATE_SOURCE = 'https://docs.google.com/spreadsheets/d/1MULHp9AApGmRmCP6bHHKKoNOkPsY8WPWLrwh6Fs-BkA/edit?gid=1287089303';
export function fundingSplit(halalas: number) {
  const providerHalalas = Math.round(halalas * 100 / 115);
  return { providerHalalas, platformHalalas: halalas - providerHalalas };
}
export function messageRates(at: string) {
  if (at < '2026-09-17' || at >= '2027-01-01') return null;
  const october = at >= '2026-10-01';
  return [
    { key: 'marketing', name: 'حملات وعروض تسويقية', usd: october ? 0.0576 : 0.0501 },
    { key: 'utility', name: 'إشعارات خدمية خارج نافذة الخدمة', usd: 0.0107 },
    { key: 'authentication', name: 'رموز تحقق', usd: 0.0107 },
    { key: 'international', name: 'تحقق بالتعرفة الدولية عند انطباقها', usd: 0.0598 },
    { key: 'service', name: 'رد نصي داخل نافذة الخدمة', usd: october ? 0.0107 : 0 },
  ].map(rate => ({ ...rate, sar: Math.ceil(rate.usd * 3.75 * 1.15 * 1000000) / 1000000 }));
}
