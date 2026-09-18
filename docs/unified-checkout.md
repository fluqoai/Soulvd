# Unified subscription checkout and wallet

Released 2026-09-18. Subscription prices and 3/6/12-month terms are unchanged.

- Subscription checkout optionally adds SAR 50, 100 or 200 of messaging credit. Default is subscription only. One transfer/reference covers the total; the stored request and operator review itemize the subscription and wallet portions.
- Credit and activation happen atomically after the platform owner verifies the exact received amount and reference. Submission alone grants nothing. Confirmation replays do not duplicate credit.
- The first verified subscription payment grants SAR 5 once per non-test tenant. Renewals, upgrades, wallet topups and old requests do not grant it. The gift is separate from cash received and recorded as `welcome_credit`; existing paid tenants are not retroactively credited.
- Active workspace owners/admins see a low-balance banner at SAR 2 or less available, excluding holds. It refreshes every minute while visible and on focus. Agents and preparation/test workspaces do not receive the banner.
- Launch payment/onboarding flags remain unchanged. Preparation workspaces can preview the combined total but cannot create a payment request until launch is enabled.

## Free reply authorization

The server permits a zero reservation only for YCloud text/image/audio/video/document replies when both a recent contact timestamp and an actual inbound message on the same tenant/number exist. A five-minute buffer protects the 24-hour boundary. A valid destination rate is still required; templates remain conservatively reserved. Subscription, consent/window and quota gates are unchanged.

The exemption policy expires at 2026-09-30 10:00 UTC, before October 1 reaches any WABA timezone. The worker rechecks eligibility at dispatch and acquires the paid reserve or fails before contacting the provider. Zero-value holds still receive normal receipt reconciliation. Final delivered/read `totalPrice` determines actual charges; an unexpected positive charge is recorded and flagged rather than silently discarded.

YCloud's [pricing integration guide](https://docs.ycloud.com/reference/whatsapp-message-pricing-integration-guide) describes an October 1, 2026 change: each number has a 1,000-delivered-service-message monthly allowance, after which service traffic can be billed. Utility templates are no longer automatically free inside the customer-service window. We do not infer remaining provider allowance from Soulvd's distinct-customer quota. After the exemption expires, reserve normally and release any zero-priced delivery on settlement until an authoritative allowance integration is implemented.

## Validation

`npm run test:platform`, production build and targeted ESLint checks. Launch tests cover bundled quote replacement, exact totals, unauthorized confirmation, replay, renewal gift prevention, verified free replies and policy expiry between enqueue and dispatch. Media tests cover free media and restoration of paid gating. `scripts/verify-launch-transaction.mjs` verifies bundled payment, one-time gift, settlement and expiry on actual PostgreSQL, with all fixtures and changes rolled back.

No subscription was purchased, bank payment fabricated, global launch flag enabled, or reviewer account changed by this release.
