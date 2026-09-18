# Paid YCloud acceptance — 18 September 2026

## Verified against the paid account

- Pro Monthly is active at USD 118, valid until 19 October 2026. Automatic renewal is scheduled.
- Eight WhatsApp channels are included, one used. Six user logins are included, one used. No add-ons.
- 20M built-in Generative AI feature credits and 100,000 translation characters remain unused. This does not establish an API for Soulvd tenant AI or fund OpenRouter.
- Authenticated provider reads confirm the existing test number is CONNECTED, Coexistence enabled, quality GREEN, with a TIER_250 messaging limit. Business verification is still `not_verified`.
- Provider messaging balance is USD 0.50; the subscription fee is separate.
- The canonical inbound/message-update/template-review endpoint remains active.

## Tests run after purchase

- All nine `npm run test:platform` suites passed. Provider calls in these suites are mocked.
- `verify-launch-transaction.mjs` passed on live PostgreSQL: payment authorization/exact amounts/replay protection, distinct-customer quota, simulated provider binding, wallet reservation and 15% settlement, duplicate receipts, insufficient balance and time-bounded free reply rules. Fixtures rolled back; no provider sends or actual transfers.
- `verify-ai-transaction.mjs` passed on live PostgreSQL: paid-only Starter trial, verified topups, replay protection, separate WhatsApp wallet and denied public grant/finalization privileges. Fixtures rolled back.
- Read-only production message verification confirms the earlier actual reply at 18:26:29 UTC is delivered and its worker job accepted. This is earlier delivery evidence, not a fresh post-purchase send.

## Outstanding acceptance

- The console Create Channel dialog offers standard API and WhatsApp Business App Coexistence. Coexistence leads to direct embedded authorization with an `I'm ready to start` button. An external Onboard Link creation control was not found in the inspected screens; this is not proof the feature is unavailable.
- Obtain the working external customer authorization link before exposing this route to customers. Do not substitute a logged-in console URL, expose master credentials, or infer consent from a matching number.
- A separate customer's number and owner's Meta/Business App authorization are required for real onboarding acceptance. Do not move the existing owner or reviewer connection into a new tenant.
- A fresh inbound message and authorized Soulvd reply are required to verify post-purchase delivery and settlement end to end.
- Public launch flags remain signup=true, payments=false, onboarding=false. The only current onboarding request is an unpaid new-number request without a provider link; it cannot use a Coexistence link.

No new number was connected, customer subscription activated, provider credit purchased, or launch flag changed during this check.
