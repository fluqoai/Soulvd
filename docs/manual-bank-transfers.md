# Bank transfer subscriptions and WhatsApp wallet

New contracts are 3, 6 or 12 months, paid upfront. Annual contracts cost ten monthly payments. Starter totals: SAR 897 / 1,794 / 2,990. Pro Growth totals: SAR 1,197 / 2,394 / 3,990. Existing one-month review/test contracts remain intact. Monthly distinct-customer quotas reset on the activation-date anniversary independently of the contract duration; they do not roll over.

## Merchant and owner workflow

1. Public pricing is at /plans. /signup opens only after platform_launch_settings.signup_ready is enabled following SMTP verification. Signups always create merchants; preference metadata never grants a role or an active plan.
2. The merchant confirms email, creates a workspace and chooses a duration. The subscription remains pending.
3. /app/billing creates a seven-day bank-transfer request with a server-calculated amount. BankDetails displays the user-provided beneficiary and IBAN; no bank name has been assumed. The customer submits the actual reference after transferring.
4. /admin/subscriptions is platform-owner only. The owner independently checks cleared funds against the exact amount and reference, then confirms once. A reference cannot fund two subscriptions, a wallet and a subscription, or a CRM payment.
5. Activation starts the entire purchased term at confirmation. A live term cannot be renewed early. Upgrades prorate the remaining term, retain its end and monthly usage, and use the quote frozen in the payment request. The customer must submit the reference before expiry; later staff review honors that submitted quote if the contract still matches. An upgrade after expiry requires manual review with the customer.
6. /app/wallet accepts separate SAR 50–10,000 top-up requests, confirmed through the same owner review flow. Uploading an invoice or submitting a reference does not grant credit.

## Message charges and protection

The policy is provider USD cost × 3.75 SAR/USD × 1.15. This is a 15% cost markup. Ledger arithmetic uses millionths of a riyal; the UI rounds for display. Each YCloud message reserves a conservative amount in the same transaction as enqueue. Insufficient balance or an unknown/expired destination rate rolls back the enqueue. Admission is rechecked when the worker claims a queued job. Meta review sandbox traffic is separate.

Confirming a customer's bank top-up credits only that tenant's Soulvd wallet. It does not transfer funds to YCloud. The platform operator must separately maintain sufficient paid provider balance before commercial messaging; both balances are required.

The initial rate card covers Saudi mobile recipients only. The reservation ceiling is USD .0598, including the published October changes; the ceiling is not the actual price charged. The second ceiling expires on January 1, 2027, intentionally requiring review before another rate period. Source: [YCloud rate card](https://docs.google.com/spreadsheets/d/1MULHp9AApGmRmCP6bHHKKoNOkPsY8WPWLrwh6Fs-BkA/edit?gid=1287089303). Add reviewed country ceilings before supporting other destinations.

The signature-verified webhook settles final delivered/read totalPrice in USD once, bound to the sender, WABA, recipient and job/provider ID. Failed sends release a hold; ambiguous sends retain it and are never automatically resent. Missing prices/currencies and changed final prices surface for review. Charges above a reservation can make a wallet negative and block future sends. A scheduled worker queries known provider IDs to recover missing receipts. /admin/wallet exposes held balances, exceptions and a safe re-query action. Cases without a provider ID require a provider-console investigation; do not release money or resend blindly.

Owner-funded test credits are explicitly labeled as test credit, never bank payments. They are restricted to test workspaces, audited and capped at SAR 5 cumulatively per workspace. No such grant is created automatically by migrations. Real bank transfers are forbidden on test workspaces.

## Assisted Coexistence onboarding

/app/connect collects the owner's authorized WhatsApp Business App number after subscription activation. /admin/onboarding stores a per-customer YCloud Onboard Link. Only the workspace owner can read it. The merchant completes provider/Meta authorization and requests verification. The platform owner checks asset ownership; the server retrieves the exact number from YCloud, verifies connected Coexistence status and atomically binds it to that tenant, rejecting an asset already bound elsewhere. No staff seat is inserted into the merchant team. Links are cleared when binding succeeds.

This is assisted onboarding via the Pro Onboard Link model, not Soulvd's own Meta Embedded Signup. No Onboard Link creation API is assumed. YCloud branding may appear during authorization; conversation management stays in Soulvd. Before admitting customers, upgrade/verify the actual YCloud subscription and obtain a working Onboard Link. OpenRouter remains deferred with no paid-model allowance.

## Deployment and email setup

Run npm run test:platform and npm run build -- --webpack. scripts/deploy-launch-schema.mjs targets only Soulvd project lyvoiipsmcbffvpkrxhy. Supply SUPABASE_ACCESS_TOKEN securely. Its default verifies SQL with rollback; --apply commits pending release migrations and records normalized SHA-256 checksums in a private table. Do not use the legacy apply-schema script to replay historical migrations.

Resend SMTP was configured on September 18, 2026: smtp.resend.com, port 465, username resend, sender Soulvd <no-reply@soulvd.sa>. The API key is stored only in Supabase's SMTP secret setting, not in repository code or public environment variables. The verified sending domain has click/open tracking disabled. Auth's email rate limit is 30 per hour; review it alongside the actual Resend allowance when onboarding volume grows.

docs/email-confirmation-template.html is installed as the Arabic signup-confirmation template, using token_hash so confirmation works across browsers. Email confirmation remains required. The callback and password-setting URLs are allowlisted on the canonical domain. Recovery/invite/magic-link templates were preserved. A recovery email initiated through Supabase Auth reached Resend's delivered status; its link was not used and no password was changed. This proves SMTP delivery to the receiving server, not inbox placement or a complete new-customer signup round.

Public signup remains closed until the remaining commercial launch requirements are complete, including the YCloud plan, provider credit and an operational Onboard Link. Enable platform_launch_settings.signup_ready only for launch. No new tenant was created during the SMTP test.

No customer was enrolled, paid balance fabricated, subscription purchased, or live message sent as part of this implementation.
