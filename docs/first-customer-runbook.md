# First customer — assisted Coexistence launch

## Customer journey

1. Register at https://www.soulvd.sa/signup and confirm email. The new merchant receives an isolated pending workspace.
2. Save the Business App phone at /app/connect. New-number/provider-migration customers must obtain an eligibility review before payment; the assisted Coexistence route does not support those requests.
3. At /app/billing choose 3, 6 or 12 months. Growth is SAR 399/month: the minimum contract is SAR 1,197. Selecting SAR 50 initial message credit makes the single transfer SAR 1,247. Verify the beneficiary in the bank app and submit the real reference in Soulvd.
4. Operator verifies cleared bank funds and confirms the exact request at /admin/subscriptions. This activates the purchased term and credits only the customer's Soulvd wallet. Never fabricate a transfer to test this stage.
5. Operator coordinates the session using the customer's contact information, then chooses “تجهيز جلسة الربط للعميل” at /admin/onboarding. An active subscription and a Business App request are required. This schedules assistance; it does not grant access to a phone.
6. At YCloud WhatsApp Manager choose Create Channel → WhatsApp Business APP Coexistence. The customer scans the displayed QR with their own Business App and supplies their own business information/authorization in Meta. Do not share the master YCloud login or select platform-owned assets as substitutes. The customer keeps their Business App account.
7. Customer returns to /app/connect and explicitly acknowledges completing authorization. Operator independently checks the business owner, phone and WABA, enters the WABA and verifies/binds through the server's live provider read. A phone already bound to another workspace is rejected.
8. Customer receives a new inbound test and replies from Soulvd. Verify delivery, job acceptance, hold settlement, distinct-customer count and absence of the conversation in another tenant.

## Operator readiness

- Paid YCloud Pro was verified: 8 channels, 1 used, 7 remaining. Additional channels are not automatically purchased.
- Maintain the central YCloud messaging wallet separately. The latest read is USD 0.50; no recharge was authorized or performed in this release. Set a funding amount before commercial campaigns. Customer topups never automatically recharge YCloud.
- Message billing remains provider cost × 3.75 × 1.15. Free-reply policy is time bounded; revalidate costs at the October transition. Do not promise unlimited free messaging.
- AI credits use Soulvd/OpenRouter commercial buckets, not YCloud's built-in AI allowance. Begin client automation in draft/review mode until responses are checked.
- The newly created YCloud Custom App has no granted permissions or assets; the existing master adapter and webhook continue to serve Soulvd. It does not create an external Onboard Link.
- Generic CRM APIs require per-customer implementation and authorized test data before promising clinic bookings or database actions. The SAR 100 request does not magically implement any external system.

## Release verification

Run platform suites, production build, changed-file lint, rollback assisted onboarding verification, and production browser checks before enabling payment/onboarding flags. Actual customer payment, Meta authorization and live first-client delivery remain acceptance steps performed with the client, never simulated by marking a pending plan paid.
